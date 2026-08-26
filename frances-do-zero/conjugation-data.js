// Banco de conjugação — French do Zero
// Gerado offline a partir do dataset Verbiste (via pacote conjugation-fr, GPL v2+),
// usado só como fonte para gerar estas formas — nenhum código do pacote é
// distribuído aqui, só o resultado (formas conjugadas).
// Créditos de dados: projeto Verbiste (Pierre Sarrazin) — http://sarrazip.com/dev/verbiste.html
//
// Estrutura por verbo:
//   g: categoria ('core' | 'g1' | 'g2' | 'g3ir' | 'g3re' | 'g3oir')
//   f: formas por tempo, array de 6 posições [je, tu, il/elle/on, nous, vous, ils/elles]
//      (impératif só preenche as posições 1, 3, 4 — tu, nous, vous — os demais ficam null)
// "futur proche" não fica salvo aqui: é construído em runtime (aller no présent + infinitivo).

const CONJUGATION_GROUPS = {
  core:  { label: "Être / avoir / aller / faire", desc: "Os 4 verbos mais irregulares e mais usados do francês" },
  g1:    { label: "1er groupe (-er)", desc: "Verbos regulares terminados em -er (a grande maioria dos verbos franceses)" },
  g2:    { label: "2e groupe (-ir)", desc: "Verbos regulares tipo finir (nous finissons)" },
  g3ir:  { label: "3e groupe irregular (-ir)", desc: "Ex: venir, partir, dormir, ouvrir" },
  g3re:  { label: "3e groupe irregular (-re)", desc: "Ex: prendre, mettre, dire, boire" },
  g3oir: { label: "3e groupe irregular (-oir)", desc: "Ex: pouvoir, vouloir, devoir, savoir" }
};

const CONJUGATION_VERBS = {
  "être": {
    "g": "core",
    "f": {
      "presente": [
        "suis",
        "es",
        "est",
        "sommes",
        "êtes",
        "sont"
      ],
      "imparfait": [
        "étais",
        "étais",
        "était",
        "étions",
        "étiez",
        "étaient"
      ],
      "passeCompose": [
        "ai été",
        "as été",
        "a été",
        "avons été",
        "avez été",
        "ont été"
      ],
      "plusQueParfait": [
        "avais été",
        "avais été",
        "avait été",
        "avions été",
        "aviez été",
        "avaient été"
      ],
      "futurSimple": [
        "serai",
        "seras",
        "sera",
        "serons",
        "serez",
        "seront"
      ],
      "condPresente": [
        "serais",
        "serais",
        "serait",
        "serions",
        "seriez",
        "seraient"
      ],
      "subjPresente": [
        "sois",
        "sois",
        "soit",
        "soyons",
        "soyez",
        "soient"
      ],
      "imperatif": [
        null,
        "sois",
        null,
        "soyons",
        "soyez",
        null
      ]
    }
  },
  "avoir": {
    "g": "core",
    "f": {
      "presente": [
        "ai",
        "as",
        "a",
        "avons",
        "avez",
        "ont"
      ],
      "imparfait": [
        "avais",
        "avais",
        "avait",
        "avions",
        "aviez",
        "avaient"
      ],
      "passeCompose": [
        "ai eu",
        "as eu",
        "a eu",
        "avons eu",
        "avez eu",
        "ont eu"
      ],
      "plusQueParfait": [
        "avais eu",
        "avais eu",
        "avait eu",
        "avions eu",
        "aviez eu",
        "avaient eu"
      ],
      "futurSimple": [
        "aurai",
        "auras",
        "aura",
        "aurons",
        "aurez",
        "auront"
      ],
      "condPresente": [
        "aurais",
        "aurais",
        "aurait",
        "aurions",
        "auriez",
        "auraient"
      ],
      "subjPresente": [
        "aie",
        "aies",
        "ait",
        "ayons",
        "ayez",
        "aient"
      ],
      "imperatif": [
        null,
        "aie",
        null,
        "ayons",
        "ayez",
        null
      ]
    }
  },
  "aller": {
    "g": "core",
    "f": {
      "presente": [
        "vais",
        "vas",
        "va",
        "allons",
        "allez",
        "vont"
      ],
      "imparfait": [
        "allais",
        "allais",
        "allait",
        "allions",
        "alliez",
        "allaient"
      ],
      "passeCompose": [
        "suis allé",
        "es allé",
        "est allé",
        "sommes allés",
        "êtes allés",
        "sont allés"
      ],
      "plusQueParfait": [
        "étais allé",
        "étais allé",
        "était allé",
        "étions allés",
        "étiez allés",
        "étaient allés"
      ],
      "futurSimple": [
        "irai",
        "iras",
        "ira",
        "irons",
        "irez",
        "iront"
      ],
      "condPresente": [
        "irais",
        "irais",
        "irait",
        "irions",
        "iriez",
        "iraient"
      ],
      "subjPresente": [
        "aille",
        "ailles",
        "aille",
        "allions",
        "alliez",
        "aillent"
      ],
      "imperatif": [
        null,
        "va",
        null,
        "allons",
        "allez",
        null
      ]
    }
  },
  "faire": {
    "g": "core",
    "f": {
      "presente": [
        "fais",
        "fais",
        "fait",
        "faisons",
        "faites",
        "font"
      ],
      "imparfait": [
        "faisais",
        "faisais",
        "faisait",
        "faisions",
        "faisiez",
        "faisaient"
      ],
      "passeCompose": [
        "ai fait",
        "as fait",
        "a fait",
        "avons fait",
        "avez fait",
        "ont fait"
      ],
      "plusQueParfait": [
        "avais fait",
        "avais fait",
        "avait fait",
        "avions fait",
        "aviez fait",
        "avaient fait"
      ],
      "futurSimple": [
        "ferai",
        "feras",
        "fera",
        "ferons",
        "ferez",
        "feront"
      ],
      "condPresente": [
        "ferais",
        "ferais",
        "ferait",
        "ferions",
        "feriez",
        "feraient"
      ],
      "subjPresente": [
        "fasse",
        "fasses",
        "fasse",
        "fassions",
        "fassiez",
        "fassent"
      ],
      "imperatif": [
        null,
        "fais",
        null,
        "faisons",
        "faites",
        null
      ]
    }
  },
  "parler": {
    "g": "g1",
    "f": {
      "presente": [
        "parle",
        "parles",
        "parle",
        "parlons",
        "parlez",
        "parlent"
      ],
      "imparfait": [
        "parlais",
        "parlais",
        "parlait",
        "parlions",
        "parliez",
        "parlaient"
      ],
      "passeCompose": [
        "ai parlé",
        "as parlé",
        "a parlé",
        "avons parlé",
        "avez parlé",
        "ont parlé"
      ],
      "plusQueParfait": [
        "avais parlé",
        "avais parlé",
        "avait parlé",
        "avions parlé",
        "aviez parlé",
        "avaient parlé"
      ],
      "futurSimple": [
        "parlerai",
        "parleras",
        "parlera",
        "parlerons",
        "parlerez",
        "parleront"
      ],
      "condPresente": [
        "parlerais",
        "parlerais",
        "parlerait",
        "parlerions",
        "parleriez",
        "parleraient"
      ],
      "subjPresente": [
        "parle",
        "parles",
        "parle",
        "parlions",
        "parliez",
        "parlent"
      ],
      "imperatif": [
        null,
        "parle",
        null,
        "parlons",
        "parlez",
        null
      ]
    }
  },
  "aimer": {
    "g": "g1",
    "f": {
      "presente": [
        "aime",
        "aimes",
        "aime",
        "aimons",
        "aimez",
        "aiment"
      ],
      "imparfait": [
        "aimais",
        "aimais",
        "aimait",
        "aimions",
        "aimiez",
        "aimaient"
      ],
      "passeCompose": [
        "ai aimé",
        "as aimé",
        "a aimé",
        "avons aimé",
        "avez aimé",
        "ont aimé"
      ],
      "plusQueParfait": [
        "avais aimé",
        "avais aimé",
        "avait aimé",
        "avions aimé",
        "aviez aimé",
        "avaient aimé"
      ],
      "futurSimple": [
        "aimerai",
        "aimeras",
        "aimera",
        "aimerons",
        "aimerez",
        "aimeront"
      ],
      "condPresente": [
        "aimerais",
        "aimerais",
        "aimerait",
        "aimerions",
        "aimeriez",
        "aimeraient"
      ],
      "subjPresente": [
        "aime",
        "aimes",
        "aime",
        "aimions",
        "aimiez",
        "aiment"
      ],
      "imperatif": [
        null,
        "aime",
        null,
        "aimons",
        "aimez",
        null
      ]
    }
  },
  "habiter": {
    "g": "g1",
    "f": {
      "presente": [
        "habite",
        "habites",
        "habite",
        "habitons",
        "habitez",
        "habitent"
      ],
      "imparfait": [
        "habitais",
        "habitais",
        "habitait",
        "habitions",
        "habitiez",
        "habitaient"
      ],
      "passeCompose": [
        "ai habité",
        "as habité",
        "a habité",
        "avons habité",
        "avez habité",
        "ont habité"
      ],
      "plusQueParfait": [
        "avais habité",
        "avais habité",
        "avait habité",
        "avions habité",
        "aviez habité",
        "avaient habité"
      ],
      "futurSimple": [
        "habiterai",
        "habiteras",
        "habitera",
        "habiterons",
        "habiterez",
        "habiteront"
      ],
      "condPresente": [
        "habiterais",
        "habiterais",
        "habiterait",
        "habiterions",
        "habiteriez",
        "habiteraient"
      ],
      "subjPresente": [
        "habite",
        "habites",
        "habite",
        "habitions",
        "habitiez",
        "habitent"
      ],
      "imperatif": [
        null,
        "habite",
        null,
        "habitons",
        "habitez",
        null
      ]
    }
  },
  "manger": {
    "g": "g1",
    "f": {
      "presente": [
        "mange",
        "manges",
        "mange",
        "mangeons",
        "mangez",
        "mangent"
      ],
      "imparfait": [
        "mangeais",
        "mangeais",
        "mangeait",
        "mangions",
        "mangiez",
        "mangeaient"
      ],
      "passeCompose": [
        "ai mangé",
        "as mangé",
        "a mangé",
        "avons mangé",
        "avez mangé",
        "ont mangé"
      ],
      "plusQueParfait": [
        "avais mangé",
        "avais mangé",
        "avait mangé",
        "avions mangé",
        "aviez mangé",
        "avaient mangé"
      ],
      "futurSimple": [
        "mangerai",
        "mangeras",
        "mangera",
        "mangerons",
        "mangerez",
        "mangeront"
      ],
      "condPresente": [
        "mangerais",
        "mangerais",
        "mangerait",
        "mangerions",
        "mangeriez",
        "mangeraient"
      ],
      "subjPresente": [
        "mange",
        "manges",
        "mange",
        "mangions",
        "mangiez",
        "mangent"
      ],
      "imperatif": [
        null,
        "mange",
        null,
        "mangeons",
        "mangez",
        null
      ]
    }
  },
  "chercher": {
    "g": "g1",
    "f": {
      "presente": [
        "cherche",
        "cherches",
        "cherche",
        "cherchons",
        "cherchez",
        "cherchent"
      ],
      "imparfait": [
        "cherchais",
        "cherchais",
        "cherchait",
        "cherchions",
        "cherchiez",
        "cherchaient"
      ],
      "passeCompose": [
        "ai cherché",
        "as cherché",
        "a cherché",
        "avons cherché",
        "avez cherché",
        "ont cherché"
      ],
      "plusQueParfait": [
        "avais cherché",
        "avais cherché",
        "avait cherché",
        "avions cherché",
        "aviez cherché",
        "avaient cherché"
      ],
      "futurSimple": [
        "chercherai",
        "chercheras",
        "cherchera",
        "chercherons",
        "chercherez",
        "chercheront"
      ],
      "condPresente": [
        "chercherais",
        "chercherais",
        "chercherait",
        "chercherions",
        "chercheriez",
        "chercheraient"
      ],
      "subjPresente": [
        "cherche",
        "cherches",
        "cherche",
        "cherchions",
        "cherchiez",
        "cherchent"
      ],
      "imperatif": [
        null,
        "cherche",
        null,
        "cherchons",
        "cherchez",
        null
      ]
    }
  },
  "penser": {
    "g": "g1",
    "f": {
      "presente": [
        "pense",
        "penses",
        "pense",
        "pensons",
        "pensez",
        "pensent"
      ],
      "imparfait": [
        "pensais",
        "pensais",
        "pensait",
        "pensions",
        "pensiez",
        "pensaient"
      ],
      "passeCompose": [
        "ai pensé",
        "as pensé",
        "a pensé",
        "avons pensé",
        "avez pensé",
        "ont pensé"
      ],
      "plusQueParfait": [
        "avais pensé",
        "avais pensé",
        "avait pensé",
        "avions pensé",
        "aviez pensé",
        "avaient pensé"
      ],
      "futurSimple": [
        "penserai",
        "penseras",
        "pensera",
        "penserons",
        "penserez",
        "penseront"
      ],
      "condPresente": [
        "penserais",
        "penserais",
        "penserait",
        "penserions",
        "penseriez",
        "penseraient"
      ],
      "subjPresente": [
        "pense",
        "penses",
        "pense",
        "pensions",
        "pensiez",
        "pensent"
      ],
      "imperatif": [
        null,
        "pense",
        null,
        "pensons",
        "pensez",
        null
      ]
    }
  },
  "donner": {
    "g": "g1",
    "f": {
      "presente": [
        "donne",
        "donnes",
        "donne",
        "donnons",
        "donnez",
        "donnent"
      ],
      "imparfait": [
        "donnais",
        "donnais",
        "donnait",
        "donnions",
        "donniez",
        "donnaient"
      ],
      "passeCompose": [
        "ai donné",
        "as donné",
        "a donné",
        "avons donné",
        "avez donné",
        "ont donné"
      ],
      "plusQueParfait": [
        "avais donné",
        "avais donné",
        "avait donné",
        "avions donné",
        "aviez donné",
        "avaient donné"
      ],
      "futurSimple": [
        "donnerai",
        "donneras",
        "donnera",
        "donnerons",
        "donnerez",
        "donneront"
      ],
      "condPresente": [
        "donnerais",
        "donnerais",
        "donnerait",
        "donnerions",
        "donneriez",
        "donneraient"
      ],
      "subjPresente": [
        "donne",
        "donnes",
        "donne",
        "donnions",
        "donniez",
        "donnent"
      ],
      "imperatif": [
        null,
        "donne",
        null,
        "donnons",
        "donnez",
        null
      ]
    }
  },
  "jouer": {
    "g": "g1",
    "f": {
      "presente": [
        "joue",
        "joues",
        "joue",
        "jouons",
        "jouez",
        "jouent"
      ],
      "imparfait": [
        "jouais",
        "jouais",
        "jouait",
        "jouions",
        "jouiez",
        "jouaient"
      ],
      "passeCompose": [
        "ai joué",
        "as joué",
        "a joué",
        "avons joué",
        "avez joué",
        "ont joué"
      ],
      "plusQueParfait": [
        "avais joué",
        "avais joué",
        "avait joué",
        "avions joué",
        "aviez joué",
        "avaient joué"
      ],
      "futurSimple": [
        "jouerai",
        "joueras",
        "jouera",
        "jouerons",
        "jouerez",
        "joueront"
      ],
      "condPresente": [
        "jouerais",
        "jouerais",
        "jouerait",
        "jouerions",
        "joueriez",
        "joueraient"
      ],
      "subjPresente": [
        "joue",
        "joues",
        "joue",
        "jouions",
        "jouiez",
        "jouent"
      ],
      "imperatif": [
        null,
        "joue",
        null,
        "jouons",
        "jouez",
        null
      ]
    }
  },
  "écouter": {
    "g": "g1",
    "f": {
      "presente": [
        "écoute",
        "écoutes",
        "écoute",
        "écoutons",
        "écoutez",
        "écoutent"
      ],
      "imparfait": [
        "écoutais",
        "écoutais",
        "écoutait",
        "écoutions",
        "écoutiez",
        "écoutaient"
      ],
      "passeCompose": [
        "ai écouté",
        "as écouté",
        "a écouté",
        "avons écouté",
        "avez écouté",
        "ont écouté"
      ],
      "plusQueParfait": [
        "avais écouté",
        "avais écouté",
        "avait écouté",
        "avions écouté",
        "aviez écouté",
        "avaient écouté"
      ],
      "futurSimple": [
        "écouterai",
        "écouteras",
        "écoutera",
        "écouterons",
        "écouterez",
        "écouteront"
      ],
      "condPresente": [
        "écouterais",
        "écouterais",
        "écouterait",
        "écouterions",
        "écouteriez",
        "écouteraient"
      ],
      "subjPresente": [
        "écoute",
        "écoutes",
        "écoute",
        "écoutions",
        "écoutiez",
        "écoutent"
      ],
      "imperatif": [
        null,
        "écoute",
        null,
        "écoutons",
        "écoutez",
        null
      ]
    }
  },
  "regarder": {
    "g": "g1",
    "f": {
      "presente": [
        "regarde",
        "regardes",
        "regarde",
        "regardons",
        "regardez",
        "regardent"
      ],
      "imparfait": [
        "regardais",
        "regardais",
        "regardait",
        "regardions",
        "regardiez",
        "regardaient"
      ],
      "passeCompose": [
        "ai regardé",
        "as regardé",
        "a regardé",
        "avons regardé",
        "avez regardé",
        "ont regardé"
      ],
      "plusQueParfait": [
        "avais regardé",
        "avais regardé",
        "avait regardé",
        "avions regardé",
        "aviez regardé",
        "avaient regardé"
      ],
      "futurSimple": [
        "regarderai",
        "regarderas",
        "regardera",
        "regarderons",
        "regarderez",
        "regarderont"
      ],
      "condPresente": [
        "regarderais",
        "regarderais",
        "regarderait",
        "regarderions",
        "regarderiez",
        "regarderaient"
      ],
      "subjPresente": [
        "regarde",
        "regardes",
        "regarde",
        "regardions",
        "regardiez",
        "regardent"
      ],
      "imperatif": [
        null,
        "regarde",
        null,
        "regardons",
        "regardez",
        null
      ]
    }
  },
  "travailler": {
    "g": "g1",
    "f": {
      "presente": [
        "travaille",
        "travailles",
        "travaille",
        "travaillons",
        "travaillez",
        "travaillent"
      ],
      "imparfait": [
        "travaillais",
        "travaillais",
        "travaillait",
        "travaillions",
        "travailliez",
        "travaillaient"
      ],
      "passeCompose": [
        "ai travaillé",
        "as travaillé",
        "a travaillé",
        "avons travaillé",
        "avez travaillé",
        "ont travaillé"
      ],
      "plusQueParfait": [
        "avais travaillé",
        "avais travaillé",
        "avait travaillé",
        "avions travaillé",
        "aviez travaillé",
        "avaient travaillé"
      ],
      "futurSimple": [
        "travaillerai",
        "travailleras",
        "travaillera",
        "travaillerons",
        "travaillerez",
        "travailleront"
      ],
      "condPresente": [
        "travaillerais",
        "travaillerais",
        "travaillerait",
        "travaillerions",
        "travailleriez",
        "travailleraient"
      ],
      "subjPresente": [
        "travaille",
        "travailles",
        "travaille",
        "travaillions",
        "travailliez",
        "travaillent"
      ],
      "imperatif": [
        null,
        "travaille",
        null,
        "travaillons",
        "travaillez",
        null
      ]
    }
  },
  "arriver": {
    "g": "g1",
    "f": {
      "presente": [
        "arrive",
        "arrives",
        "arrive",
        "arrivons",
        "arrivez",
        "arrivent"
      ],
      "imparfait": [
        "arrivais",
        "arrivais",
        "arrivait",
        "arrivions",
        "arriviez",
        "arrivaient"
      ],
      "passeCompose": [
        "suis arrivé",
        "es arrivé",
        "est arrivé",
        "sommes arrivés",
        "êtes arrivés",
        "sont arrivés"
      ],
      "plusQueParfait": [
        "étais arrivé",
        "étais arrivé",
        "était arrivé",
        "étions arrivés",
        "étiez arrivés",
        "étaient arrivés"
      ],
      "futurSimple": [
        "arriverai",
        "arriveras",
        "arrivera",
        "arriverons",
        "arriverez",
        "arriveront"
      ],
      "condPresente": [
        "arriverais",
        "arriverais",
        "arriverait",
        "arriverions",
        "arriveriez",
        "arriveraient"
      ],
      "subjPresente": [
        "arrive",
        "arrives",
        "arrive",
        "arrivions",
        "arriviez",
        "arrivent"
      ],
      "imperatif": [
        null,
        "arrive",
        null,
        "arrivons",
        "arrivez",
        null
      ]
    }
  },
  "entrer": {
    "g": "g1",
    "f": {
      "presente": [
        "entre",
        "entres",
        "entre",
        "entrons",
        "entrez",
        "entrent"
      ],
      "imparfait": [
        "entrais",
        "entrais",
        "entrait",
        "entrions",
        "entriez",
        "entraient"
      ],
      "passeCompose": [
        "suis entré",
        "es entré",
        "est entré",
        "sommes entrés",
        "êtes entrés",
        "sont entrés"
      ],
      "plusQueParfait": [
        "étais entré",
        "étais entré",
        "était entré",
        "étions entrés",
        "étiez entrés",
        "étaient entrés"
      ],
      "futurSimple": [
        "entrerai",
        "entreras",
        "entrera",
        "entrerons",
        "entrerez",
        "entreront"
      ],
      "condPresente": [
        "entrerais",
        "entrerais",
        "entrerait",
        "entrerions",
        "entreriez",
        "entreraient"
      ],
      "subjPresente": [
        "entre",
        "entres",
        "entre",
        "entrions",
        "entriez",
        "entrent"
      ],
      "imperatif": [
        null,
        "entre",
        null,
        "entrons",
        "entrez",
        null
      ]
    }
  },
  "rester": {
    "g": "g1",
    "f": {
      "presente": [
        "reste",
        "restes",
        "reste",
        "restons",
        "restez",
        "restent"
      ],
      "imparfait": [
        "restais",
        "restais",
        "restait",
        "restions",
        "restiez",
        "restaient"
      ],
      "passeCompose": [
        "suis resté",
        "es resté",
        "est resté",
        "sommes restés",
        "êtes restés",
        "sont restés"
      ],
      "plusQueParfait": [
        "étais resté",
        "étais resté",
        "était resté",
        "étions restés",
        "étiez restés",
        "étaient restés"
      ],
      "futurSimple": [
        "resterai",
        "resteras",
        "restera",
        "resterons",
        "resterez",
        "resteront"
      ],
      "condPresente": [
        "resterais",
        "resterais",
        "resterait",
        "resterions",
        "resteriez",
        "resteraient"
      ],
      "subjPresente": [
        "reste",
        "restes",
        "reste",
        "restions",
        "restiez",
        "restent"
      ],
      "imperatif": [
        null,
        "reste",
        null,
        "restons",
        "restez",
        null
      ]
    }
  },
  "passer": {
    "g": "g1",
    "f": {
      "presente": [
        "passe",
        "passes",
        "passe",
        "passons",
        "passez",
        "passent"
      ],
      "imparfait": [
        "passais",
        "passais",
        "passait",
        "passions",
        "passiez",
        "passaient"
      ],
      "passeCompose": [
        "ai passé",
        "as passé",
        "a passé",
        "avons passé",
        "avez passé",
        "ont passé"
      ],
      "plusQueParfait": [
        "avais passé",
        "avais passé",
        "avait passé",
        "avions passé",
        "aviez passé",
        "avaient passé"
      ],
      "futurSimple": [
        "passerai",
        "passeras",
        "passera",
        "passerons",
        "passerez",
        "passeront"
      ],
      "condPresente": [
        "passerais",
        "passerais",
        "passerait",
        "passerions",
        "passeriez",
        "passeraient"
      ],
      "subjPresente": [
        "passe",
        "passes",
        "passe",
        "passions",
        "passiez",
        "passent"
      ],
      "imperatif": [
        null,
        "passe",
        null,
        "passons",
        "passez",
        null
      ]
    }
  },
  "montrer": {
    "g": "g1",
    "f": {
      "presente": [
        "montre",
        "montres",
        "montre",
        "montrons",
        "montrez",
        "montrent"
      ],
      "imparfait": [
        "montrais",
        "montrais",
        "montrait",
        "montrions",
        "montriez",
        "montraient"
      ],
      "passeCompose": [
        "ai montré",
        "as montré",
        "a montré",
        "avons montré",
        "avez montré",
        "ont montré"
      ],
      "plusQueParfait": [
        "avais montré",
        "avais montré",
        "avait montré",
        "avions montré",
        "aviez montré",
        "avaient montré"
      ],
      "futurSimple": [
        "montrerai",
        "montreras",
        "montrera",
        "montrerons",
        "montrerez",
        "montreront"
      ],
      "condPresente": [
        "montrerais",
        "montrerais",
        "montrerait",
        "montrerions",
        "montreriez",
        "montreraient"
      ],
      "subjPresente": [
        "montre",
        "montres",
        "montre",
        "montrions",
        "montriez",
        "montrent"
      ],
      "imperatif": [
        null,
        "montre",
        null,
        "montrons",
        "montrez",
        null
      ]
    }
  },
  "demander": {
    "g": "g1",
    "f": {
      "presente": [
        "demande",
        "demandes",
        "demande",
        "demandons",
        "demandez",
        "demandent"
      ],
      "imparfait": [
        "demandais",
        "demandais",
        "demandait",
        "demandions",
        "demandiez",
        "demandaient"
      ],
      "passeCompose": [
        "ai demandé",
        "as demandé",
        "a demandé",
        "avons demandé",
        "avez demandé",
        "ont demandé"
      ],
      "plusQueParfait": [
        "avais demandé",
        "avais demandé",
        "avait demandé",
        "avions demandé",
        "aviez demandé",
        "avaient demandé"
      ],
      "futurSimple": [
        "demanderai",
        "demanderas",
        "demandera",
        "demanderons",
        "demanderez",
        "demanderont"
      ],
      "condPresente": [
        "demanderais",
        "demanderais",
        "demanderait",
        "demanderions",
        "demanderiez",
        "demanderaient"
      ],
      "subjPresente": [
        "demande",
        "demandes",
        "demande",
        "demandions",
        "demandiez",
        "demandent"
      ],
      "imperatif": [
        null,
        "demande",
        null,
        "demandons",
        "demandez",
        null
      ]
    }
  },
  "trouver": {
    "g": "g1",
    "f": {
      "presente": [
        "trouve",
        "trouves",
        "trouve",
        "trouvons",
        "trouvez",
        "trouvent"
      ],
      "imparfait": [
        "trouvais",
        "trouvais",
        "trouvait",
        "trouvions",
        "trouviez",
        "trouvaient"
      ],
      "passeCompose": [
        "ai trouvé",
        "as trouvé",
        "a trouvé",
        "avons trouvé",
        "avez trouvé",
        "ont trouvé"
      ],
      "plusQueParfait": [
        "avais trouvé",
        "avais trouvé",
        "avait trouvé",
        "avions trouvé",
        "aviez trouvé",
        "avaient trouvé"
      ],
      "futurSimple": [
        "trouverai",
        "trouveras",
        "trouvera",
        "trouverons",
        "trouverez",
        "trouveront"
      ],
      "condPresente": [
        "trouverais",
        "trouverais",
        "trouverait",
        "trouverions",
        "trouveriez",
        "trouveraient"
      ],
      "subjPresente": [
        "trouve",
        "trouves",
        "trouve",
        "trouvions",
        "trouviez",
        "trouvent"
      ],
      "imperatif": [
        null,
        "trouve",
        null,
        "trouvons",
        "trouvez",
        null
      ]
    }
  },
  "aider": {
    "g": "g1",
    "f": {
      "presente": [
        "aide",
        "aides",
        "aide",
        "aidons",
        "aidez",
        "aident"
      ],
      "imparfait": [
        "aidais",
        "aidais",
        "aidait",
        "aidions",
        "aidiez",
        "aidaient"
      ],
      "passeCompose": [
        "ai aidé",
        "as aidé",
        "a aidé",
        "avons aidé",
        "avez aidé",
        "ont aidé"
      ],
      "plusQueParfait": [
        "avais aidé",
        "avais aidé",
        "avait aidé",
        "avions aidé",
        "aviez aidé",
        "avaient aidé"
      ],
      "futurSimple": [
        "aiderai",
        "aideras",
        "aidera",
        "aiderons",
        "aiderez",
        "aideront"
      ],
      "condPresente": [
        "aiderais",
        "aiderais",
        "aiderait",
        "aiderions",
        "aideriez",
        "aideraient"
      ],
      "subjPresente": [
        "aide",
        "aides",
        "aide",
        "aidions",
        "aidiez",
        "aident"
      ],
      "imperatif": [
        null,
        "aide",
        null,
        "aidons",
        "aidez",
        null
      ]
    }
  },
  "commencer": {
    "g": "g1",
    "f": {
      "presente": [
        "commence",
        "commences",
        "commence",
        "commençons",
        "commencez",
        "commencent"
      ],
      "imparfait": [
        "commençais",
        "commençais",
        "commençait",
        "commencions",
        "commenciez",
        "commençaient"
      ],
      "passeCompose": [
        "ai commencé",
        "as commencé",
        "a commencé",
        "avons commencé",
        "avez commencé",
        "ont commencé"
      ],
      "plusQueParfait": [
        "avais commencé",
        "avais commencé",
        "avait commencé",
        "avions commencé",
        "aviez commencé",
        "avaient commencé"
      ],
      "futurSimple": [
        "commencerai",
        "commenceras",
        "commencera",
        "commencerons",
        "commencerez",
        "commenceront"
      ],
      "condPresente": [
        "commencerais",
        "commencerais",
        "commencerait",
        "commencerions",
        "commenceriez",
        "commenceraient"
      ],
      "subjPresente": [
        "commence",
        "commences",
        "commence",
        "commencions",
        "commenciez",
        "commencent"
      ],
      "imperatif": [
        null,
        "commence",
        null,
        "commençons",
        "commencez",
        null
      ]
    }
  },
  "continuer": {
    "g": "g1",
    "f": {
      "presente": [
        "continue",
        "continues",
        "continue",
        "continuons",
        "continuez",
        "continuent"
      ],
      "imparfait": [
        "continuais",
        "continuais",
        "continuait",
        "continuions",
        "continuiez",
        "continuaient"
      ],
      "passeCompose": [
        "ai continué",
        "as continué",
        "a continué",
        "avons continué",
        "avez continué",
        "ont continué"
      ],
      "plusQueParfait": [
        "avais continué",
        "avais continué",
        "avait continué",
        "avions continué",
        "aviez continué",
        "avaient continué"
      ],
      "futurSimple": [
        "continuerai",
        "continueras",
        "continuera",
        "continuerons",
        "continuerez",
        "continueront"
      ],
      "condPresente": [
        "continuerais",
        "continuerais",
        "continuerait",
        "continuerions",
        "continueriez",
        "continueraient"
      ],
      "subjPresente": [
        "continue",
        "continues",
        "continue",
        "continuions",
        "continuiez",
        "continuent"
      ],
      "imperatif": [
        null,
        "continue",
        null,
        "continuons",
        "continuez",
        null
      ]
    }
  },
  "changer": {
    "g": "g1",
    "f": {
      "presente": [
        "change",
        "changes",
        "change",
        "changeons",
        "changez",
        "changent"
      ],
      "imparfait": [
        "changeais",
        "changeais",
        "changeait",
        "changions",
        "changiez",
        "changeaient"
      ],
      "passeCompose": [
        "ai changé",
        "as changé",
        "a changé",
        "avons changé",
        "avez changé",
        "ont changé"
      ],
      "plusQueParfait": [
        "avais changé",
        "avais changé",
        "avait changé",
        "avions changé",
        "aviez changé",
        "avaient changé"
      ],
      "futurSimple": [
        "changerai",
        "changeras",
        "changera",
        "changerons",
        "changerez",
        "changeront"
      ],
      "condPresente": [
        "changerais",
        "changerais",
        "changerait",
        "changerions",
        "changeriez",
        "changeraient"
      ],
      "subjPresente": [
        "change",
        "changes",
        "change",
        "changions",
        "changiez",
        "changent"
      ],
      "imperatif": [
        null,
        "change",
        null,
        "changeons",
        "changez",
        null
      ]
    }
  },
  "chanter": {
    "g": "g1",
    "f": {
      "presente": [
        "chante",
        "chantes",
        "chante",
        "chantons",
        "chantez",
        "chantent"
      ],
      "imparfait": [
        "chantais",
        "chantais",
        "chantait",
        "chantions",
        "chantiez",
        "chantaient"
      ],
      "passeCompose": [
        "ai chanté",
        "as chanté",
        "a chanté",
        "avons chanté",
        "avez chanté",
        "ont chanté"
      ],
      "plusQueParfait": [
        "avais chanté",
        "avais chanté",
        "avait chanté",
        "avions chanté",
        "aviez chanté",
        "avaient chanté"
      ],
      "futurSimple": [
        "chanterai",
        "chanteras",
        "chantera",
        "chanterons",
        "chanterez",
        "chanteront"
      ],
      "condPresente": [
        "chanterais",
        "chanterais",
        "chanterait",
        "chanterions",
        "chanteriez",
        "chanteraient"
      ],
      "subjPresente": [
        "chante",
        "chantes",
        "chante",
        "chantions",
        "chantiez",
        "chantent"
      ],
      "imperatif": [
        null,
        "chante",
        null,
        "chantons",
        "chantez",
        null
      ]
    }
  },
  "dessiner": {
    "g": "g1",
    "f": {
      "presente": [
        "dessine",
        "dessines",
        "dessine",
        "dessinons",
        "dessinez",
        "dessinent"
      ],
      "imparfait": [
        "dessinais",
        "dessinais",
        "dessinait",
        "dessinions",
        "dessiniez",
        "dessinaient"
      ],
      "passeCompose": [
        "ai dessiné",
        "as dessiné",
        "a dessiné",
        "avons dessiné",
        "avez dessiné",
        "ont dessiné"
      ],
      "plusQueParfait": [
        "avais dessiné",
        "avais dessiné",
        "avait dessiné",
        "avions dessiné",
        "aviez dessiné",
        "avaient dessiné"
      ],
      "futurSimple": [
        "dessinerai",
        "dessineras",
        "dessinera",
        "dessinerons",
        "dessinerez",
        "dessineront"
      ],
      "condPresente": [
        "dessinerais",
        "dessinerais",
        "dessinerait",
        "dessinerions",
        "dessineriez",
        "dessineraient"
      ],
      "subjPresente": [
        "dessine",
        "dessines",
        "dessine",
        "dessinions",
        "dessiniez",
        "dessinent"
      ],
      "imperatif": [
        null,
        "dessine",
        null,
        "dessinons",
        "dessinez",
        null
      ]
    }
  },
  "dépenser": {
    "g": "g1",
    "f": {
      "presente": [
        "dépense",
        "dépenses",
        "dépense",
        "dépensons",
        "dépensez",
        "dépensent"
      ],
      "imparfait": [
        "dépensais",
        "dépensais",
        "dépensait",
        "dépensions",
        "dépensiez",
        "dépensaient"
      ],
      "passeCompose": [
        "ai dépensé",
        "as dépensé",
        "a dépensé",
        "avons dépensé",
        "avez dépensé",
        "ont dépensé"
      ],
      "plusQueParfait": [
        "avais dépensé",
        "avais dépensé",
        "avait dépensé",
        "avions dépensé",
        "aviez dépensé",
        "avaient dépensé"
      ],
      "futurSimple": [
        "dépenserai",
        "dépenseras",
        "dépensera",
        "dépenserons",
        "dépenserez",
        "dépenseront"
      ],
      "condPresente": [
        "dépenserais",
        "dépenserais",
        "dépenserait",
        "dépenserions",
        "dépenseriez",
        "dépenseraient"
      ],
      "subjPresente": [
        "dépense",
        "dépenses",
        "dépense",
        "dépensions",
        "dépensiez",
        "dépensent"
      ],
      "imperatif": [
        null,
        "dépense",
        null,
        "dépensons",
        "dépensez",
        null
      ]
    }
  },
  "gagner": {
    "g": "g1",
    "f": {
      "presente": [
        "gagne",
        "gagnes",
        "gagne",
        "gagnons",
        "gagnez",
        "gagnent"
      ],
      "imparfait": [
        "gagnais",
        "gagnais",
        "gagnait",
        "gagnions",
        "gagniez",
        "gagnaient"
      ],
      "passeCompose": [
        "ai gagné",
        "as gagné",
        "a gagné",
        "avons gagné",
        "avez gagné",
        "ont gagné"
      ],
      "plusQueParfait": [
        "avais gagné",
        "avais gagné",
        "avait gagné",
        "avions gagné",
        "aviez gagné",
        "avaient gagné"
      ],
      "futurSimple": [
        "gagnerai",
        "gagneras",
        "gagnera",
        "gagnerons",
        "gagnerez",
        "gagneront"
      ],
      "condPresente": [
        "gagnerais",
        "gagnerais",
        "gagnerait",
        "gagnerions",
        "gagneriez",
        "gagneraient"
      ],
      "subjPresente": [
        "gagne",
        "gagnes",
        "gagne",
        "gagnions",
        "gagniez",
        "gagnent"
      ],
      "imperatif": [
        null,
        "gagne",
        null,
        "gagnons",
        "gagnez",
        null
      ]
    }
  },
  "acheter": {
    "g": "g1",
    "f": {
      "presente": [
        "achète",
        "achètes",
        "achète",
        "achetons",
        "achetez",
        "achètent"
      ],
      "imparfait": [
        "achetais",
        "achetais",
        "achetait",
        "achetions",
        "achetiez",
        "achetaient"
      ],
      "passeCompose": [
        "ai acheté",
        "as acheté",
        "a acheté",
        "avons acheté",
        "avez acheté",
        "ont acheté"
      ],
      "plusQueParfait": [
        "avais acheté",
        "avais acheté",
        "avait acheté",
        "avions acheté",
        "aviez acheté",
        "avaient acheté"
      ],
      "futurSimple": [
        "achèterai",
        "achèteras",
        "achètera",
        "achèterons",
        "achèterez",
        "achèteront"
      ],
      "condPresente": [
        "achèterais",
        "achèterais",
        "achèterait",
        "achèterions",
        "achèteriez",
        "achèteraient"
      ],
      "subjPresente": [
        "achète",
        "achètes",
        "achète",
        "achetions",
        "achetiez",
        "achètent"
      ],
      "imperatif": [
        null,
        "achète",
        null,
        "achetons",
        "achetez",
        null
      ]
    }
  },
  "appeler": {
    "g": "g1",
    "f": {
      "presente": [
        "appelle",
        "appelles",
        "appelle",
        "appelons",
        "appelez",
        "appellent"
      ],
      "imparfait": [
        "appelais",
        "appelais",
        "appelait",
        "appelions",
        "appeliez",
        "appelaient"
      ],
      "passeCompose": [
        "ai appelé",
        "as appelé",
        "a appelé",
        "avons appelé",
        "avez appelé",
        "ont appelé"
      ],
      "plusQueParfait": [
        "avais appelé",
        "avais appelé",
        "avait appelé",
        "avions appelé",
        "aviez appelé",
        "avaient appelé"
      ],
      "futurSimple": [
        "appellerai",
        "appelleras",
        "appellera",
        "appellerons",
        "appellerez",
        "appelleront"
      ],
      "condPresente": [
        "appellerais",
        "appellerais",
        "appellerait",
        "appellerions",
        "appelleriez",
        "appelleraient"
      ],
      "subjPresente": [
        "appelle",
        "appelles",
        "appelle",
        "appelions",
        "appeliez",
        "appellent"
      ],
      "imperatif": [
        null,
        "appelle",
        null,
        "appelons",
        "appelez",
        null
      ]
    }
  },
  "jeter": {
    "g": "g1",
    "f": {
      "presente": [
        "jette",
        "jettes",
        "jette",
        "jetons",
        "jetez",
        "jettent"
      ],
      "imparfait": [
        "jetais",
        "jetais",
        "jetait",
        "jetions",
        "jetiez",
        "jetaient"
      ],
      "passeCompose": [
        "ai jeté",
        "as jeté",
        "a jeté",
        "avons jeté",
        "avez jeté",
        "ont jeté"
      ],
      "plusQueParfait": [
        "avais jeté",
        "avais jeté",
        "avait jeté",
        "avions jeté",
        "aviez jeté",
        "avaient jeté"
      ],
      "futurSimple": [
        "jetterai",
        "jetteras",
        "jettera",
        "jetterons",
        "jetterez",
        "jetteront"
      ],
      "condPresente": [
        "jetterais",
        "jetterais",
        "jetterait",
        "jetterions",
        "jetteriez",
        "jetteraient"
      ],
      "subjPresente": [
        "jette",
        "jettes",
        "jette",
        "jetions",
        "jetiez",
        "jettent"
      ],
      "imperatif": [
        null,
        "jette",
        null,
        "jetons",
        "jetez",
        null
      ]
    }
  },
  "préférer": {
    "g": "g1",
    "f": {
      "presente": [
        "préfère",
        "préfères",
        "préfère",
        "préférons",
        "préférez",
        "préfèrent"
      ],
      "imparfait": [
        "préférais",
        "préférais",
        "préférait",
        "préférions",
        "préfériez",
        "préféraient"
      ],
      "passeCompose": [
        "ai préféré",
        "as préféré",
        "a préféré",
        "avons préféré",
        "avez préféré",
        "ont préféré"
      ],
      "plusQueParfait": [
        "avais préféré",
        "avais préféré",
        "avait préféré",
        "avions préféré",
        "aviez préféré",
        "avaient préféré"
      ],
      "futurSimple": [
        "préférerai/préfèrerai",
        "préféreras/préfèreras",
        "préférera/préfèrera",
        "préférerons/préfèrerons",
        "préférerez/préfèrerez",
        "préféreront/préfèreront"
      ],
      "condPresente": [
        "préférerais/préfèrerais",
        "préférerais/préfèrerais",
        "préférerait/préfèrerait",
        "préférerions/préfèrerions",
        "préféreriez/préfèreriez",
        "préféreraient/préfèreraient"
      ],
      "subjPresente": [
        "préfère",
        "préfères",
        "préfère",
        "préférions",
        "préfériez",
        "préfèrent"
      ],
      "imperatif": [
        null,
        "préfère",
        null,
        "préférons",
        "préférez",
        null
      ]
    }
  },
  "espérer": {
    "g": "g1",
    "f": {
      "presente": [
        "espère",
        "espères",
        "espère",
        "espérons",
        "espérez",
        "espèrent"
      ],
      "imparfait": [
        "espérais",
        "espérais",
        "espérait",
        "espérions",
        "espériez",
        "espéraient"
      ],
      "passeCompose": [
        "ai espéré",
        "as espéré",
        "a espéré",
        "avons espéré",
        "avez espéré",
        "ont espéré"
      ],
      "plusQueParfait": [
        "avais espéré",
        "avais espéré",
        "avait espéré",
        "avions espéré",
        "aviez espéré",
        "avaient espéré"
      ],
      "futurSimple": [
        "espérerai/espèrerai",
        "espéreras/espèreras",
        "espérera/espèrera",
        "espérerons/espèrerons",
        "espérerez/espèrerez",
        "espéreront/espèreront"
      ],
      "condPresente": [
        "espérerais/espèrerais",
        "espérerais/espèrerais",
        "espérerait/espèrerait",
        "espérerions/espèrerions",
        "espéreriez/espèreriez",
        "espéreraient/espèreraient"
      ],
      "subjPresente": [
        "espère",
        "espères",
        "espère",
        "espérions",
        "espériez",
        "espèrent"
      ],
      "imperatif": [
        null,
        "espère",
        null,
        "espérons",
        "espérez",
        null
      ]
    }
  },
  "payer": {
    "g": "g1",
    "f": {
      "presente": [
        "paie/paye",
        "paies/payes",
        "paie/paye",
        "payons",
        "payez",
        "paient/payent"
      ],
      "imparfait": [
        "payais",
        "payais",
        "payait",
        "payions",
        "payiez",
        "payaient"
      ],
      "passeCompose": [
        "ai payé",
        "as payé",
        "a payé",
        "avons payé",
        "avez payé",
        "ont payé"
      ],
      "plusQueParfait": [
        "avais payé",
        "avais payé",
        "avait payé",
        "avions payé",
        "aviez payé",
        "avaient payé"
      ],
      "futurSimple": [
        "paierai/payerai",
        "paieras/payeras",
        "paiera/payera",
        "paierons/payerons",
        "paierez/payerez",
        "paieront/payeront"
      ],
      "condPresente": [
        "paierais/payerais",
        "paierais/payerais",
        "paierait/payerait",
        "paierions/payerions",
        "paieriez/payeriez",
        "paieraient/payeraient"
      ],
      "subjPresente": [
        "paie/paye",
        "paies/payes",
        "paie/paye",
        "payions",
        "payiez",
        "paient/payent"
      ],
      "imperatif": [
        null,
        "paie/paye",
        null,
        "payons",
        "payez",
        null
      ]
    }
  },
  "envoyer": {
    "g": "g1",
    "f": {
      "presente": [
        "envoie",
        "envoies",
        "envoie",
        "envoyons",
        "envoyez",
        "envoient"
      ],
      "imparfait": [
        "envoyais",
        "envoyais",
        "envoyait",
        "envoyions",
        "envoyiez",
        "envoyaient"
      ],
      "passeCompose": [
        "ai envoyé",
        "as envoyé",
        "a envoyé",
        "avons envoyé",
        "avez envoyé",
        "ont envoyé"
      ],
      "plusQueParfait": [
        "avais envoyé",
        "avais envoyé",
        "avait envoyé",
        "avions envoyé",
        "aviez envoyé",
        "avaient envoyé"
      ],
      "futurSimple": [
        "enverrai",
        "enverras",
        "enverra",
        "enverrons",
        "enverrez",
        "enverront"
      ],
      "condPresente": [
        "enverrais",
        "enverrais",
        "enverrait",
        "enverrions",
        "enverriez",
        "enverraient"
      ],
      "subjPresente": [
        "envoie",
        "envoies",
        "envoie",
        "envoyions",
        "envoyiez",
        "envoient"
      ],
      "imperatif": [
        null,
        "envoie",
        null,
        "envoyons",
        "envoyez",
        null
      ]
    }
  },
  "nettoyer": {
    "g": "g1",
    "f": {
      "presente": [
        "nettoie",
        "nettoies",
        "nettoie",
        "nettoyons",
        "nettoyez",
        "nettoient"
      ],
      "imparfait": [
        "nettoyais",
        "nettoyais",
        "nettoyait",
        "nettoyions",
        "nettoyiez",
        "nettoyaient"
      ],
      "passeCompose": [
        "ai nettoyé",
        "as nettoyé",
        "a nettoyé",
        "avons nettoyé",
        "avez nettoyé",
        "ont nettoyé"
      ],
      "plusQueParfait": [
        "avais nettoyé",
        "avais nettoyé",
        "avait nettoyé",
        "avions nettoyé",
        "aviez nettoyé",
        "avaient nettoyé"
      ],
      "futurSimple": [
        "nettoierai",
        "nettoieras",
        "nettoiera",
        "nettoierons",
        "nettoierez",
        "nettoieront"
      ],
      "condPresente": [
        "nettoierais",
        "nettoierais",
        "nettoierait",
        "nettoierions",
        "nettoieriez",
        "nettoieraient"
      ],
      "subjPresente": [
        "nettoie",
        "nettoies",
        "nettoie",
        "nettoyions",
        "nettoyiez",
        "nettoient"
      ],
      "imperatif": [
        null,
        "nettoie",
        null,
        "nettoyons",
        "nettoyez",
        null
      ]
    }
  },
  "employer": {
    "g": "g1",
    "f": {
      "presente": [
        "emploie",
        "emploies",
        "emploie",
        "employons",
        "employez",
        "emploient"
      ],
      "imparfait": [
        "employais",
        "employais",
        "employait",
        "employions",
        "employiez",
        "employaient"
      ],
      "passeCompose": [
        "ai employé",
        "as employé",
        "a employé",
        "avons employé",
        "avez employé",
        "ont employé"
      ],
      "plusQueParfait": [
        "avais employé",
        "avais employé",
        "avait employé",
        "avions employé",
        "aviez employé",
        "avaient employé"
      ],
      "futurSimple": [
        "emploierai",
        "emploieras",
        "emploiera",
        "emploierons",
        "emploierez",
        "emploieront"
      ],
      "condPresente": [
        "emploierais",
        "emploierais",
        "emploierait",
        "emploierions",
        "emploieriez",
        "emploieraient"
      ],
      "subjPresente": [
        "emploie",
        "emploies",
        "emploie",
        "employions",
        "employiez",
        "emploient"
      ],
      "imperatif": [
        null,
        "emploie",
        null,
        "employons",
        "employez",
        null
      ]
    }
  },
  "essayer": {
    "g": "g1",
    "f": {
      "presente": [
        "essaie/essaye",
        "essaies/essayes",
        "essaie/essaye",
        "essayons",
        "essayez",
        "essaient/essayent"
      ],
      "imparfait": [
        "essayais",
        "essayais",
        "essayait",
        "essayions",
        "essayiez",
        "essayaient"
      ],
      "passeCompose": [
        "ai essayé",
        "as essayé",
        "a essayé",
        "avons essayé",
        "avez essayé",
        "ont essayé"
      ],
      "plusQueParfait": [
        "avais essayé",
        "avais essayé",
        "avait essayé",
        "avions essayé",
        "aviez essayé",
        "avaient essayé"
      ],
      "futurSimple": [
        "essaierai/essayerai",
        "essaieras/essayeras",
        "essaiera/essayera",
        "essaierons/essayerons",
        "essaierez/essayerez",
        "essaieront/essayeront"
      ],
      "condPresente": [
        "essaierais/essayerais",
        "essaierais/essayerais",
        "essaierait/essayerait",
        "essaierions/essayerions",
        "essaieriez/essayeriez",
        "essaieraient/essayeraient"
      ],
      "subjPresente": [
        "essaie/essaye",
        "essaies/essayes",
        "essaie/essaye",
        "essayions",
        "essayiez",
        "essaient/essayent"
      ],
      "imperatif": [
        null,
        "essaie/essaye",
        null,
        "essayons",
        "essayez",
        null
      ]
    }
  },
  "voyager": {
    "g": "g1",
    "f": {
      "presente": [
        "voyage",
        "voyages",
        "voyage",
        "voyageons",
        "voyagez",
        "voyagent"
      ],
      "imparfait": [
        "voyageais",
        "voyageais",
        "voyageait",
        "voyagions",
        "voyagiez",
        "voyageaient"
      ],
      "passeCompose": [
        "ai voyagé",
        "as voyagé",
        "a voyagé",
        "avons voyagé",
        "avez voyagé",
        "ont voyagé"
      ],
      "plusQueParfait": [
        "avais voyagé",
        "avais voyagé",
        "avait voyagé",
        "avions voyagé",
        "aviez voyagé",
        "avaient voyagé"
      ],
      "futurSimple": [
        "voyagerai",
        "voyageras",
        "voyagera",
        "voyagerons",
        "voyagerez",
        "voyageront"
      ],
      "condPresente": [
        "voyagerais",
        "voyagerais",
        "voyagerait",
        "voyagerions",
        "voyageriez",
        "voyageraient"
      ],
      "subjPresente": [
        "voyage",
        "voyages",
        "voyage",
        "voyagions",
        "voyagiez",
        "voyagent"
      ],
      "imperatif": [
        null,
        "voyage",
        null,
        "voyageons",
        "voyagez",
        null
      ]
    }
  },
  "ranger": {
    "g": "g1",
    "f": {
      "presente": [
        "range",
        "ranges",
        "range",
        "rangeons",
        "rangez",
        "rangent"
      ],
      "imparfait": [
        "rangeais",
        "rangeais",
        "rangeait",
        "rangions",
        "rangiez",
        "rangeaient"
      ],
      "passeCompose": [
        "ai rangé",
        "as rangé",
        "a rangé",
        "avons rangé",
        "avez rangé",
        "ont rangé"
      ],
      "plusQueParfait": [
        "avais rangé",
        "avais rangé",
        "avait rangé",
        "avions rangé",
        "aviez rangé",
        "avaient rangé"
      ],
      "futurSimple": [
        "rangerai",
        "rangeras",
        "rangera",
        "rangerons",
        "rangerez",
        "rangeront"
      ],
      "condPresente": [
        "rangerais",
        "rangerais",
        "rangerait",
        "rangerions",
        "rangeriez",
        "rangeraient"
      ],
      "subjPresente": [
        "range",
        "ranges",
        "range",
        "rangions",
        "rangiez",
        "rangent"
      ],
      "imperatif": [
        null,
        "range",
        null,
        "rangeons",
        "rangez",
        null
      ]
    }
  },
  "partager": {
    "g": "g1",
    "f": {
      "presente": [
        "partage",
        "partages",
        "partage",
        "partageons",
        "partagez",
        "partagent"
      ],
      "imparfait": [
        "partageais",
        "partageais",
        "partageait",
        "partagions",
        "partagiez",
        "partageaient"
      ],
      "passeCompose": [
        "ai partagé",
        "as partagé",
        "a partagé",
        "avons partagé",
        "avez partagé",
        "ont partagé"
      ],
      "plusQueParfait": [
        "avais partagé",
        "avais partagé",
        "avait partagé",
        "avions partagé",
        "aviez partagé",
        "avaient partagé"
      ],
      "futurSimple": [
        "partagerai",
        "partageras",
        "partagera",
        "partagerons",
        "partagerez",
        "partageront"
      ],
      "condPresente": [
        "partagerais",
        "partagerais",
        "partagerait",
        "partagerions",
        "partageriez",
        "partageraient"
      ],
      "subjPresente": [
        "partage",
        "partages",
        "partage",
        "partagions",
        "partagiez",
        "partagent"
      ],
      "imperatif": [
        null,
        "partage",
        null,
        "partageons",
        "partagez",
        null
      ]
    }
  },
  "marcher": {
    "g": "g1",
    "f": {
      "presente": [
        "marche",
        "marches",
        "marche",
        "marchons",
        "marchez",
        "marchent"
      ],
      "imparfait": [
        "marchais",
        "marchais",
        "marchait",
        "marchions",
        "marchiez",
        "marchaient"
      ],
      "passeCompose": [
        "ai marché",
        "as marché",
        "a marché",
        "avons marché",
        "avez marché",
        "ont marché"
      ],
      "plusQueParfait": [
        "avais marché",
        "avais marché",
        "avait marché",
        "avions marché",
        "aviez marché",
        "avaient marché"
      ],
      "futurSimple": [
        "marcherai",
        "marcheras",
        "marchera",
        "marcherons",
        "marcherez",
        "marcheront"
      ],
      "condPresente": [
        "marcherais",
        "marcherais",
        "marcherait",
        "marcherions",
        "marcheriez",
        "marcheraient"
      ],
      "subjPresente": [
        "marche",
        "marches",
        "marche",
        "marchions",
        "marchiez",
        "marchent"
      ],
      "imperatif": [
        null,
        "marche",
        null,
        "marchons",
        "marchez",
        null
      ]
    }
  },
  "tomber": {
    "g": "g1",
    "f": {
      "presente": [
        "tombe",
        "tombes",
        "tombe",
        "tombons",
        "tombez",
        "tombent"
      ],
      "imparfait": [
        "tombais",
        "tombais",
        "tombait",
        "tombions",
        "tombiez",
        "tombaient"
      ],
      "passeCompose": [
        "ai tombé",
        "as tombé",
        "a tombé",
        "avons tombé",
        "avez tombé",
        "ont tombé"
      ],
      "plusQueParfait": [
        "avais tombé",
        "avais tombé",
        "avait tombé",
        "avions tombé",
        "aviez tombé",
        "avaient tombé"
      ],
      "futurSimple": [
        "tomberai",
        "tomberas",
        "tombera",
        "tomberons",
        "tomberez",
        "tomberont"
      ],
      "condPresente": [
        "tomberais",
        "tomberais",
        "tomberait",
        "tomberions",
        "tomberiez",
        "tomberaient"
      ],
      "subjPresente": [
        "tombe",
        "tombes",
        "tombe",
        "tombions",
        "tombiez",
        "tombent"
      ],
      "imperatif": [
        null,
        "tombe",
        null,
        "tombons",
        "tombez",
        null
      ]
    }
  },
  "casser": {
    "g": "g1",
    "f": {
      "presente": [
        "casse",
        "casses",
        "casse",
        "cassons",
        "cassez",
        "cassent"
      ],
      "imparfait": [
        "cassais",
        "cassais",
        "cassait",
        "cassions",
        "cassiez",
        "cassaient"
      ],
      "passeCompose": [
        "ai cassé",
        "as cassé",
        "a cassé",
        "avons cassé",
        "avez cassé",
        "ont cassé"
      ],
      "plusQueParfait": [
        "avais cassé",
        "avais cassé",
        "avait cassé",
        "avions cassé",
        "aviez cassé",
        "avaient cassé"
      ],
      "futurSimple": [
        "casserai",
        "casseras",
        "cassera",
        "casserons",
        "casserez",
        "casseront"
      ],
      "condPresente": [
        "casserais",
        "casserais",
        "casserait",
        "casserions",
        "casseriez",
        "casseraient"
      ],
      "subjPresente": [
        "casse",
        "casses",
        "casse",
        "cassions",
        "cassiez",
        "cassent"
      ],
      "imperatif": [
        null,
        "casse",
        null,
        "cassons",
        "cassez",
        null
      ]
    }
  },
  "laver": {
    "g": "g1",
    "f": {
      "presente": [
        "lave",
        "laves",
        "lave",
        "lavons",
        "lavez",
        "lavent"
      ],
      "imparfait": [
        "lavais",
        "lavais",
        "lavait",
        "lavions",
        "laviez",
        "lavaient"
      ],
      "passeCompose": [
        "ai lavé",
        "as lavé",
        "a lavé",
        "avons lavé",
        "avez lavé",
        "ont lavé"
      ],
      "plusQueParfait": [
        "avais lavé",
        "avais lavé",
        "avait lavé",
        "avions lavé",
        "aviez lavé",
        "avaient lavé"
      ],
      "futurSimple": [
        "laverai",
        "laveras",
        "lavera",
        "laverons",
        "laverez",
        "laveront"
      ],
      "condPresente": [
        "laverais",
        "laverais",
        "laverait",
        "laverions",
        "laveriez",
        "laveraient"
      ],
      "subjPresente": [
        "lave",
        "laves",
        "lave",
        "lavions",
        "laviez",
        "lavent"
      ],
      "imperatif": [
        null,
        "lave",
        null,
        "lavons",
        "lavez",
        null
      ]
    }
  },
  "préparer": {
    "g": "g1",
    "f": {
      "presente": [
        "prépare",
        "prépares",
        "prépare",
        "préparons",
        "préparez",
        "préparent"
      ],
      "imparfait": [
        "préparais",
        "préparais",
        "préparait",
        "préparions",
        "prépariez",
        "préparaient"
      ],
      "passeCompose": [
        "ai préparé",
        "as préparé",
        "a préparé",
        "avons préparé",
        "avez préparé",
        "ont préparé"
      ],
      "plusQueParfait": [
        "avais préparé",
        "avais préparé",
        "avait préparé",
        "avions préparé",
        "aviez préparé",
        "avaient préparé"
      ],
      "futurSimple": [
        "préparerai",
        "prépareras",
        "préparera",
        "préparerons",
        "préparerez",
        "prépareront"
      ],
      "condPresente": [
        "préparerais",
        "préparerais",
        "préparerait",
        "préparerions",
        "prépareriez",
        "prépareraient"
      ],
      "subjPresente": [
        "prépare",
        "prépares",
        "prépare",
        "préparions",
        "prépariez",
        "préparent"
      ],
      "imperatif": [
        null,
        "prépare",
        null,
        "préparons",
        "préparez",
        null
      ]
    }
  },
  "inviter": {
    "g": "g1",
    "f": {
      "presente": [
        "invite",
        "invites",
        "invite",
        "invitons",
        "invitez",
        "invitent"
      ],
      "imparfait": [
        "invitais",
        "invitais",
        "invitait",
        "invitions",
        "invitiez",
        "invitaient"
      ],
      "passeCompose": [
        "ai invité",
        "as invité",
        "a invité",
        "avons invité",
        "avez invité",
        "ont invité"
      ],
      "plusQueParfait": [
        "avais invité",
        "avais invité",
        "avait invité",
        "avions invité",
        "aviez invité",
        "avaient invité"
      ],
      "futurSimple": [
        "inviterai",
        "inviteras",
        "invitera",
        "inviterons",
        "inviterez",
        "inviteront"
      ],
      "condPresente": [
        "inviterais",
        "inviterais",
        "inviterait",
        "inviterions",
        "inviteriez",
        "inviteraient"
      ],
      "subjPresente": [
        "invite",
        "invites",
        "invite",
        "invitions",
        "invitiez",
        "invitent"
      ],
      "imperatif": [
        null,
        "invite",
        null,
        "invitons",
        "invitez",
        null
      ]
    }
  },
  "accepter": {
    "g": "g1",
    "f": {
      "presente": [
        "accepte",
        "acceptes",
        "accepte",
        "acceptons",
        "acceptez",
        "acceptent"
      ],
      "imparfait": [
        "acceptais",
        "acceptais",
        "acceptait",
        "acceptions",
        "acceptiez",
        "acceptaient"
      ],
      "passeCompose": [
        "ai accepté",
        "as accepté",
        "a accepté",
        "avons accepté",
        "avez accepté",
        "ont accepté"
      ],
      "plusQueParfait": [
        "avais accepté",
        "avais accepté",
        "avait accepté",
        "avions accepté",
        "aviez accepté",
        "avaient accepté"
      ],
      "futurSimple": [
        "accepterai",
        "accepteras",
        "acceptera",
        "accepterons",
        "accepterez",
        "accepteront"
      ],
      "condPresente": [
        "accepterais",
        "accepterais",
        "accepterait",
        "accepterions",
        "accepteriez",
        "accepteraient"
      ],
      "subjPresente": [
        "accepte",
        "acceptes",
        "accepte",
        "acceptions",
        "acceptiez",
        "acceptent"
      ],
      "imperatif": [
        null,
        "accepte",
        null,
        "acceptons",
        "acceptez",
        null
      ]
    }
  },
  "refuser": {
    "g": "g1",
    "f": {
      "presente": [
        "refuse",
        "refuses",
        "refuse",
        "refusons",
        "refusez",
        "refusent"
      ],
      "imparfait": [
        "refusais",
        "refusais",
        "refusait",
        "refusions",
        "refusiez",
        "refusaient"
      ],
      "passeCompose": [
        "ai refusé",
        "as refusé",
        "a refusé",
        "avons refusé",
        "avez refusé",
        "ont refusé"
      ],
      "plusQueParfait": [
        "avais refusé",
        "avais refusé",
        "avait refusé",
        "avions refusé",
        "aviez refusé",
        "avaient refusé"
      ],
      "futurSimple": [
        "refuserai",
        "refuseras",
        "refusera",
        "refuserons",
        "refuserez",
        "refuseront"
      ],
      "condPresente": [
        "refuserais",
        "refuserais",
        "refuserait",
        "refuserions",
        "refuseriez",
        "refuseraient"
      ],
      "subjPresente": [
        "refuse",
        "refuses",
        "refuse",
        "refusions",
        "refusiez",
        "refusent"
      ],
      "imperatif": [
        null,
        "refuse",
        null,
        "refusons",
        "refusez",
        null
      ]
    }
  },
  "oublier": {
    "g": "g1",
    "f": {
      "presente": [
        "oublie",
        "oublies",
        "oublie",
        "oublions",
        "oubliez",
        "oublient"
      ],
      "imparfait": [
        "oubliais",
        "oubliais",
        "oubliait",
        "oubliions",
        "oubliiez",
        "oubliaient"
      ],
      "passeCompose": [
        "ai oublié",
        "as oublié",
        "a oublié",
        "avons oublié",
        "avez oublié",
        "ont oublié"
      ],
      "plusQueParfait": [
        "avais oublié",
        "avais oublié",
        "avait oublié",
        "avions oublié",
        "aviez oublié",
        "avaient oublié"
      ],
      "futurSimple": [
        "oublierai",
        "oublieras",
        "oubliera",
        "oublierons",
        "oublierez",
        "oublieront"
      ],
      "condPresente": [
        "oublierais",
        "oublierais",
        "oublierait",
        "oublierions",
        "oublieriez",
        "oublieraient"
      ],
      "subjPresente": [
        "oublie",
        "oublies",
        "oublie",
        "oubliions",
        "oubliiez",
        "oublient"
      ],
      "imperatif": [
        null,
        "oublie",
        null,
        "oublions",
        "oubliez",
        null
      ]
    }
  },
  "expliquer": {
    "g": "g1",
    "f": {
      "presente": [
        "explique",
        "expliques",
        "explique",
        "expliquons",
        "expliquez",
        "expliquent"
      ],
      "imparfait": [
        "expliquais",
        "expliquais",
        "expliquait",
        "expliquions",
        "expliquiez",
        "expliquaient"
      ],
      "passeCompose": [
        "ai expliqué",
        "as expliqué",
        "a expliqué",
        "avons expliqué",
        "avez expliqué",
        "ont expliqué"
      ],
      "plusQueParfait": [
        "avais expliqué",
        "avais expliqué",
        "avait expliqué",
        "avions expliqué",
        "aviez expliqué",
        "avaient expliqué"
      ],
      "futurSimple": [
        "expliquerai",
        "expliqueras",
        "expliquera",
        "expliquerons",
        "expliquerez",
        "expliqueront"
      ],
      "condPresente": [
        "expliquerais",
        "expliquerais",
        "expliquerait",
        "expliquerions",
        "expliqueriez",
        "expliqueraient"
      ],
      "subjPresente": [
        "explique",
        "expliques",
        "explique",
        "expliquions",
        "expliquiez",
        "expliquent"
      ],
      "imperatif": [
        null,
        "explique",
        null,
        "expliquons",
        "expliquez",
        null
      ]
    }
  },
  "présenter": {
    "g": "g1",
    "f": {
      "presente": [
        "présente",
        "présentes",
        "présente",
        "présentons",
        "présentez",
        "présentent"
      ],
      "imparfait": [
        "présentais",
        "présentais",
        "présentait",
        "présentions",
        "présentiez",
        "présentaient"
      ],
      "passeCompose": [
        "ai présenté",
        "as présenté",
        "a présenté",
        "avons présenté",
        "avez présenté",
        "ont présenté"
      ],
      "plusQueParfait": [
        "avais présenté",
        "avais présenté",
        "avait présenté",
        "avions présenté",
        "aviez présenté",
        "avaient présenté"
      ],
      "futurSimple": [
        "présenterai",
        "présenteras",
        "présentera",
        "présenterons",
        "présenterez",
        "présenteront"
      ],
      "condPresente": [
        "présenterais",
        "présenterais",
        "présenterait",
        "présenterions",
        "présenteriez",
        "présenteraient"
      ],
      "subjPresente": [
        "présente",
        "présentes",
        "présente",
        "présentions",
        "présentiez",
        "présentent"
      ],
      "imperatif": [
        null,
        "présente",
        null,
        "présentons",
        "présentez",
        null
      ]
    }
  },
  "apporter": {
    "g": "g1",
    "f": {
      "presente": [
        "apporte",
        "apportes",
        "apporte",
        "apportons",
        "apportez",
        "apportent"
      ],
      "imparfait": [
        "apportais",
        "apportais",
        "apportait",
        "apportions",
        "apportiez",
        "apportaient"
      ],
      "passeCompose": [
        "ai apporté",
        "as apporté",
        "a apporté",
        "avons apporté",
        "avez apporté",
        "ont apporté"
      ],
      "plusQueParfait": [
        "avais apporté",
        "avais apporté",
        "avait apporté",
        "avions apporté",
        "aviez apporté",
        "avaient apporté"
      ],
      "futurSimple": [
        "apporterai",
        "apporteras",
        "apportera",
        "apporterons",
        "apporterez",
        "apporteront"
      ],
      "condPresente": [
        "apporterais",
        "apporterais",
        "apporterait",
        "apporterions",
        "apporteriez",
        "apporteraient"
      ],
      "subjPresente": [
        "apporte",
        "apportes",
        "apporte",
        "apportions",
        "apportiez",
        "apportent"
      ],
      "imperatif": [
        null,
        "apporte",
        null,
        "apportons",
        "apportez",
        null
      ]
    }
  },
  "emmener": {
    "g": "g1",
    "f": {
      "presente": [
        "emmène",
        "emmènes",
        "emmène",
        "emmenons",
        "emmenez",
        "emmènent"
      ],
      "imparfait": [
        "emmenais",
        "emmenais",
        "emmenait",
        "emmenions",
        "emmeniez",
        "emmenaient"
      ],
      "passeCompose": [
        "ai emmené",
        "as emmené",
        "a emmené",
        "avons emmené",
        "avez emmené",
        "ont emmené"
      ],
      "plusQueParfait": [
        "avais emmené",
        "avais emmené",
        "avait emmené",
        "avions emmené",
        "aviez emmené",
        "avaient emmené"
      ],
      "futurSimple": [
        "emmènerai",
        "emmèneras",
        "emmènera",
        "emmènerons",
        "emmènerez",
        "emmèneront"
      ],
      "condPresente": [
        "emmènerais",
        "emmènerais",
        "emmènerait",
        "emmènerions",
        "emmèneriez",
        "emmèneraient"
      ],
      "subjPresente": [
        "emmène",
        "emmènes",
        "emmène",
        "emmenions",
        "emmeniez",
        "emmènent"
      ],
      "imperatif": [
        null,
        "emmène",
        null,
        "emmenons",
        "emmenez",
        null
      ]
    }
  },
  "amener": {
    "g": "g1",
    "f": {
      "presente": [
        "amène",
        "amènes",
        "amène",
        "amenons",
        "amenez",
        "amènent"
      ],
      "imparfait": [
        "amenais",
        "amenais",
        "amenait",
        "amenions",
        "ameniez",
        "amenaient"
      ],
      "passeCompose": [
        "ai amené",
        "as amené",
        "a amené",
        "avons amené",
        "avez amené",
        "ont amené"
      ],
      "plusQueParfait": [
        "avais amené",
        "avais amené",
        "avait amené",
        "avions amené",
        "aviez amené",
        "avaient amené"
      ],
      "futurSimple": [
        "amènerai",
        "amèneras",
        "amènera",
        "amènerons",
        "amènerez",
        "amèneront"
      ],
      "condPresente": [
        "amènerais",
        "amènerais",
        "amènerait",
        "amènerions",
        "amèneriez",
        "amèneraient"
      ],
      "subjPresente": [
        "amène",
        "amènes",
        "amène",
        "amenions",
        "ameniez",
        "amènent"
      ],
      "imperatif": [
        null,
        "amène",
        null,
        "amenons",
        "amenez",
        null
      ]
    }
  },
  "rentrer": {
    "g": "g1",
    "f": {
      "presente": [
        "rentre",
        "rentres",
        "rentre",
        "rentrons",
        "rentrez",
        "rentrent"
      ],
      "imparfait": [
        "rentrais",
        "rentrais",
        "rentrait",
        "rentrions",
        "rentriez",
        "rentraient"
      ],
      "passeCompose": [
        "suis rentré",
        "es rentré",
        "est rentré",
        "sommes rentrés",
        "êtes rentrés",
        "sont rentrés"
      ],
      "plusQueParfait": [
        "étais rentré",
        "étais rentré",
        "était rentré",
        "étions rentrés",
        "étiez rentrés",
        "étaient rentrés"
      ],
      "futurSimple": [
        "rentrerai",
        "rentreras",
        "rentrera",
        "rentrerons",
        "rentrerez",
        "rentreront"
      ],
      "condPresente": [
        "rentrerais",
        "rentrerais",
        "rentrerait",
        "rentrerions",
        "rentreriez",
        "rentreraient"
      ],
      "subjPresente": [
        "rentre",
        "rentres",
        "rentre",
        "rentrions",
        "rentriez",
        "rentrent"
      ],
      "imperatif": [
        null,
        "rentre",
        null,
        "rentrons",
        "rentrez",
        null
      ]
    }
  },
  "retourner": {
    "g": "g1",
    "f": {
      "presente": [
        "retourne",
        "retournes",
        "retourne",
        "retournons",
        "retournez",
        "retournent"
      ],
      "imparfait": [
        "retournais",
        "retournais",
        "retournait",
        "retournions",
        "retourniez",
        "retournaient"
      ],
      "passeCompose": [
        "ai retourné",
        "as retourné",
        "a retourné",
        "avons retourné",
        "avez retourné",
        "ont retourné"
      ],
      "plusQueParfait": [
        "avais retourné",
        "avais retourné",
        "avait retourné",
        "avions retourné",
        "aviez retourné",
        "avaient retourné"
      ],
      "futurSimple": [
        "retournerai",
        "retourneras",
        "retournera",
        "retournerons",
        "retournerez",
        "retourneront"
      ],
      "condPresente": [
        "retournerais",
        "retournerais",
        "retournerait",
        "retournerions",
        "retourneriez",
        "retourneraient"
      ],
      "subjPresente": [
        "retourne",
        "retournes",
        "retourne",
        "retournions",
        "retourniez",
        "retournent"
      ],
      "imperatif": [
        null,
        "retourne",
        null,
        "retournons",
        "retournez",
        null
      ]
    }
  },
  "quitter": {
    "g": "g1",
    "f": {
      "presente": [
        "quitte",
        "quittes",
        "quitte",
        "quittons",
        "quittez",
        "quittent"
      ],
      "imparfait": [
        "quittais",
        "quittais",
        "quittait",
        "quittions",
        "quittiez",
        "quittaient"
      ],
      "passeCompose": [
        "ai quitté",
        "as quitté",
        "a quitté",
        "avons quitté",
        "avez quitté",
        "ont quitté"
      ],
      "plusQueParfait": [
        "avais quitté",
        "avais quitté",
        "avait quitté",
        "avions quitté",
        "aviez quitté",
        "avaient quitté"
      ],
      "futurSimple": [
        "quitterai",
        "quitteras",
        "quittera",
        "quitterons",
        "quitterez",
        "quitteront"
      ],
      "condPresente": [
        "quitterais",
        "quitterais",
        "quitterait",
        "quitterions",
        "quitteriez",
        "quitteraient"
      ],
      "subjPresente": [
        "quitte",
        "quittes",
        "quitte",
        "quittions",
        "quittiez",
        "quittent"
      ],
      "imperatif": [
        null,
        "quitte",
        null,
        "quittons",
        "quittez",
        null
      ]
    }
  },
  "fermer": {
    "g": "g1",
    "f": {
      "presente": [
        "ferme",
        "fermes",
        "ferme",
        "fermons",
        "fermez",
        "ferment"
      ],
      "imparfait": [
        "fermais",
        "fermais",
        "fermait",
        "fermions",
        "fermiez",
        "fermaient"
      ],
      "passeCompose": [
        "ai fermé",
        "as fermé",
        "a fermé",
        "avons fermé",
        "avez fermé",
        "ont fermé"
      ],
      "plusQueParfait": [
        "avais fermé",
        "avais fermé",
        "avait fermé",
        "avions fermé",
        "aviez fermé",
        "avaient fermé"
      ],
      "futurSimple": [
        "fermerai",
        "fermeras",
        "fermera",
        "fermerons",
        "fermerez",
        "fermeront"
      ],
      "condPresente": [
        "fermerais",
        "fermerais",
        "fermerait",
        "fermerions",
        "fermeriez",
        "fermeraient"
      ],
      "subjPresente": [
        "ferme",
        "fermes",
        "ferme",
        "fermions",
        "fermiez",
        "ferment"
      ],
      "imperatif": [
        null,
        "ferme",
        null,
        "fermons",
        "fermez",
        null
      ]
    }
  },
  "utiliser": {
    "g": "g1",
    "f": {
      "presente": [
        "utilise",
        "utilises",
        "utilise",
        "utilisons",
        "utilisez",
        "utilisent"
      ],
      "imparfait": [
        "utilisais",
        "utilisais",
        "utilisait",
        "utilisions",
        "utilisiez",
        "utilisaient"
      ],
      "passeCompose": [
        "ai utilisé",
        "as utilisé",
        "a utilisé",
        "avons utilisé",
        "avez utilisé",
        "ont utilisé"
      ],
      "plusQueParfait": [
        "avais utilisé",
        "avais utilisé",
        "avait utilisé",
        "avions utilisé",
        "aviez utilisé",
        "avaient utilisé"
      ],
      "futurSimple": [
        "utiliserai",
        "utiliseras",
        "utilisera",
        "utiliserons",
        "utiliserez",
        "utiliseront"
      ],
      "condPresente": [
        "utiliserais",
        "utiliserais",
        "utiliserait",
        "utiliserions",
        "utiliseriez",
        "utiliseraient"
      ],
      "subjPresente": [
        "utilise",
        "utilises",
        "utilise",
        "utilisions",
        "utilisiez",
        "utilisent"
      ],
      "imperatif": [
        null,
        "utilise",
        null,
        "utilisons",
        "utilisez",
        null
      ]
    }
  },
  "danser": {
    "g": "g1",
    "f": {
      "presente": [
        "danse",
        "danses",
        "danse",
        "dansons",
        "dansez",
        "dansent"
      ],
      "imparfait": [
        "dansais",
        "dansais",
        "dansait",
        "dansions",
        "dansiez",
        "dansaient"
      ],
      "passeCompose": [
        "ai dansé",
        "as dansé",
        "a dansé",
        "avons dansé",
        "avez dansé",
        "ont dansé"
      ],
      "plusQueParfait": [
        "avais dansé",
        "avais dansé",
        "avait dansé",
        "avions dansé",
        "aviez dansé",
        "avaient dansé"
      ],
      "futurSimple": [
        "danserai",
        "danseras",
        "dansera",
        "danserons",
        "danserez",
        "danseront"
      ],
      "condPresente": [
        "danserais",
        "danserais",
        "danserait",
        "danserions",
        "danseriez",
        "danseraient"
      ],
      "subjPresente": [
        "danse",
        "danses",
        "danse",
        "dansions",
        "dansiez",
        "dansent"
      ],
      "imperatif": [
        null,
        "danse",
        null,
        "dansons",
        "dansez",
        null
      ]
    }
  },
  "nager": {
    "g": "g1",
    "f": {
      "presente": [
        "nage",
        "nages",
        "nage",
        "nageons",
        "nagez",
        "nagent"
      ],
      "imparfait": [
        "nageais",
        "nageais",
        "nageait",
        "nagions",
        "nagiez",
        "nageaient"
      ],
      "passeCompose": [
        "ai nagé",
        "as nagé",
        "a nagé",
        "avons nagé",
        "avez nagé",
        "ont nagé"
      ],
      "plusQueParfait": [
        "avais nagé",
        "avais nagé",
        "avait nagé",
        "avions nagé",
        "aviez nagé",
        "avaient nagé"
      ],
      "futurSimple": [
        "nagerai",
        "nageras",
        "nagera",
        "nagerons",
        "nagerez",
        "nageront"
      ],
      "condPresente": [
        "nagerais",
        "nagerais",
        "nagerait",
        "nagerions",
        "nageriez",
        "nageraient"
      ],
      "subjPresente": [
        "nage",
        "nages",
        "nage",
        "nagions",
        "nagiez",
        "nagent"
      ],
      "imperatif": [
        null,
        "nage",
        null,
        "nageons",
        "nagez",
        null
      ]
    }
  },
  "skier": {
    "g": "g1",
    "f": {
      "presente": [
        "skie",
        "skies",
        "skie",
        "skions",
        "skiez",
        "skient"
      ],
      "imparfait": [
        "skiais",
        "skiais",
        "skiait",
        "skiions",
        "skiiez",
        "skiaient"
      ],
      "passeCompose": [
        "ai skié",
        "as skié",
        "a skié",
        "avons skié",
        "avez skié",
        "ont skié"
      ],
      "plusQueParfait": [
        "avais skié",
        "avais skié",
        "avait skié",
        "avions skié",
        "aviez skié",
        "avaient skié"
      ],
      "futurSimple": [
        "skierai",
        "skieras",
        "skiera",
        "skierons",
        "skierez",
        "skieront"
      ],
      "condPresente": [
        "skierais",
        "skierais",
        "skierait",
        "skierions",
        "skieriez",
        "skieraient"
      ],
      "subjPresente": [
        "skie",
        "skies",
        "skie",
        "skiions",
        "skiiez",
        "skient"
      ],
      "imperatif": [
        null,
        "skie",
        null,
        "skions",
        "skiez",
        null
      ]
    }
  },
  "coûter": {
    "g": "g1",
    "f": {
      "presente": [
        "coûte",
        "coûtes",
        "coûte",
        "coûtons",
        "coûtez",
        "coûtent"
      ],
      "imparfait": [
        "coûtais",
        "coûtais",
        "coûtait",
        "coûtions",
        "coûtiez",
        "coûtaient"
      ],
      "passeCompose": [
        "ai coûté",
        "as coûté",
        "a coûté",
        "avons coûté",
        "avez coûté",
        "ont coûté"
      ],
      "plusQueParfait": [
        "avais coûté",
        "avais coûté",
        "avait coûté",
        "avions coûté",
        "aviez coûté",
        "avaient coûté"
      ],
      "futurSimple": [
        "coûterai",
        "coûteras",
        "coûtera",
        "coûterons",
        "coûterez",
        "coûteront"
      ],
      "condPresente": [
        "coûterais",
        "coûterais",
        "coûterait",
        "coûterions",
        "coûteriez",
        "coûteraient"
      ],
      "subjPresente": [
        "coûte",
        "coûtes",
        "coûte",
        "coûtions",
        "coûtiez",
        "coûtent"
      ],
      "imperatif": [
        null,
        "coûte",
        null,
        "coûtons",
        "coûtez",
        null
      ]
    }
  },
  "durer": {
    "g": "g1",
    "f": {
      "presente": [
        "dure",
        "dures",
        "dure",
        "durons",
        "durez",
        "durent"
      ],
      "imparfait": [
        "durais",
        "durais",
        "durait",
        "durions",
        "duriez",
        "duraient"
      ],
      "passeCompose": [
        "ai duré",
        "as duré",
        "a duré",
        "avons duré",
        "avez duré",
        "ont duré"
      ],
      "plusQueParfait": [
        "avais duré",
        "avais duré",
        "avait duré",
        "avions duré",
        "aviez duré",
        "avaient duré"
      ],
      "futurSimple": [
        "durerai",
        "dureras",
        "durera",
        "durerons",
        "durerez",
        "dureront"
      ],
      "condPresente": [
        "durerais",
        "durerais",
        "durerait",
        "durerions",
        "dureriez",
        "dureraient"
      ],
      "subjPresente": [
        "dure",
        "dures",
        "dure",
        "durions",
        "duriez",
        "durent"
      ],
      "imperatif": [
        null,
        "dure",
        null,
        "durons",
        "durez",
        null
      ]
    }
  },
  "sembler": {
    "g": "g1",
    "f": {
      "presente": [
        "semble",
        "sembles",
        "semble",
        "semblons",
        "semblez",
        "semblent"
      ],
      "imparfait": [
        "semblais",
        "semblais",
        "semblait",
        "semblions",
        "sembliez",
        "semblaient"
      ],
      "passeCompose": [
        "ai semblé",
        "as semblé",
        "a semblé",
        "avons semblé",
        "avez semblé",
        "ont semblé"
      ],
      "plusQueParfait": [
        "avais semblé",
        "avais semblé",
        "avait semblé",
        "avions semblé",
        "aviez semblé",
        "avaient semblé"
      ],
      "futurSimple": [
        "semblerai",
        "sembleras",
        "semblera",
        "semblerons",
        "semblerez",
        "sembleront"
      ],
      "condPresente": [
        "semblerais",
        "semblerais",
        "semblerait",
        "semblerions",
        "sembleriez",
        "sembleraient"
      ],
      "subjPresente": [
        "semble",
        "sembles",
        "semble",
        "semblions",
        "sembliez",
        "semblent"
      ],
      "imperatif": [
        null,
        "semble",
        null,
        "semblons",
        "semblez",
        null
      ]
    }
  },
  "exister": {
    "g": "g1",
    "f": {
      "presente": [
        "existe",
        "existes",
        "existe",
        "existons",
        "existez",
        "existent"
      ],
      "imparfait": [
        "existais",
        "existais",
        "existait",
        "existions",
        "existiez",
        "existaient"
      ],
      "passeCompose": [
        "ai existé",
        "as existé",
        "a existé",
        "avons existé",
        "avez existé",
        "ont existé"
      ],
      "plusQueParfait": [
        "avais existé",
        "avais existé",
        "avait existé",
        "avions existé",
        "aviez existé",
        "avaient existé"
      ],
      "futurSimple": [
        "existerai",
        "existeras",
        "existera",
        "existerons",
        "existerez",
        "existeront"
      ],
      "condPresente": [
        "existerais",
        "existerais",
        "existerait",
        "existerions",
        "existeriez",
        "existeraient"
      ],
      "subjPresente": [
        "existe",
        "existes",
        "existe",
        "existions",
        "existiez",
        "existent"
      ],
      "imperatif": [
        null,
        "existe",
        null,
        "existons",
        "existez",
        null
      ]
    }
  },
  "participer": {
    "g": "g1",
    "f": {
      "presente": [
        "participe",
        "participes",
        "participe",
        "participons",
        "participez",
        "participent"
      ],
      "imparfait": [
        "participais",
        "participais",
        "participait",
        "participions",
        "participiez",
        "participaient"
      ],
      "passeCompose": [
        "ai participé",
        "as participé",
        "a participé",
        "avons participé",
        "avez participé",
        "ont participé"
      ],
      "plusQueParfait": [
        "avais participé",
        "avais participé",
        "avait participé",
        "avions participé",
        "aviez participé",
        "avaient participé"
      ],
      "futurSimple": [
        "participerai",
        "participeras",
        "participera",
        "participerons",
        "participerez",
        "participeront"
      ],
      "condPresente": [
        "participerais",
        "participerais",
        "participerait",
        "participerions",
        "participeriez",
        "participeraient"
      ],
      "subjPresente": [
        "participe",
        "participes",
        "participe",
        "participions",
        "participiez",
        "participent"
      ],
      "imperatif": [
        null,
        "participe",
        null,
        "participons",
        "participez",
        null
      ]
    }
  },
  "décider": {
    "g": "g1",
    "f": {
      "presente": [
        "décide",
        "décides",
        "décide",
        "décidons",
        "décidez",
        "décident"
      ],
      "imparfait": [
        "décidais",
        "décidais",
        "décidait",
        "décidions",
        "décidiez",
        "décidaient"
      ],
      "passeCompose": [
        "ai décidé",
        "as décidé",
        "a décidé",
        "avons décidé",
        "avez décidé",
        "ont décidé"
      ],
      "plusQueParfait": [
        "avais décidé",
        "avais décidé",
        "avait décidé",
        "avions décidé",
        "aviez décidé",
        "avaient décidé"
      ],
      "futurSimple": [
        "déciderai",
        "décideras",
        "décidera",
        "déciderons",
        "déciderez",
        "décideront"
      ],
      "condPresente": [
        "déciderais",
        "déciderais",
        "déciderait",
        "déciderions",
        "décideriez",
        "décideraient"
      ],
      "subjPresente": [
        "décide",
        "décides",
        "décide",
        "décidions",
        "décidiez",
        "décident"
      ],
      "imperatif": [
        null,
        "décide",
        null,
        "décidons",
        "décidez",
        null
      ]
    }
  },
  "tourner": {
    "g": "g1",
    "f": {
      "presente": [
        "tourne",
        "tournes",
        "tourne",
        "tournons",
        "tournez",
        "tournent"
      ],
      "imparfait": [
        "tournais",
        "tournais",
        "tournait",
        "tournions",
        "tourniez",
        "tournaient"
      ],
      "passeCompose": [
        "ai tourné",
        "as tourné",
        "a tourné",
        "avons tourné",
        "avez tourné",
        "ont tourné"
      ],
      "plusQueParfait": [
        "avais tourné",
        "avais tourné",
        "avait tourné",
        "avions tourné",
        "aviez tourné",
        "avaient tourné"
      ],
      "futurSimple": [
        "tournerai",
        "tourneras",
        "tournera",
        "tournerons",
        "tournerez",
        "tourneront"
      ],
      "condPresente": [
        "tournerais",
        "tournerais",
        "tournerait",
        "tournerions",
        "tourneriez",
        "tourneraient"
      ],
      "subjPresente": [
        "tourne",
        "tournes",
        "tourne",
        "tournions",
        "tourniez",
        "tournent"
      ],
      "imperatif": [
        null,
        "tourne",
        null,
        "tournons",
        "tournez",
        null
      ]
    }
  },
  "compter": {
    "g": "g1",
    "f": {
      "presente": [
        "compte",
        "comptes",
        "compte",
        "comptons",
        "comptez",
        "comptent"
      ],
      "imparfait": [
        "comptais",
        "comptais",
        "comptait",
        "comptions",
        "comptiez",
        "comptaient"
      ],
      "passeCompose": [
        "ai compté",
        "as compté",
        "a compté",
        "avons compté",
        "avez compté",
        "ont compté"
      ],
      "plusQueParfait": [
        "avais compté",
        "avais compté",
        "avait compté",
        "avions compté",
        "aviez compté",
        "avaient compté"
      ],
      "futurSimple": [
        "compterai",
        "compteras",
        "comptera",
        "compterons",
        "compterez",
        "compteront"
      ],
      "condPresente": [
        "compterais",
        "compterais",
        "compterait",
        "compterions",
        "compteriez",
        "compteraient"
      ],
      "subjPresente": [
        "compte",
        "comptes",
        "compte",
        "comptions",
        "comptiez",
        "comptent"
      ],
      "imperatif": [
        null,
        "compte",
        null,
        "comptons",
        "comptez",
        null
      ]
    }
  },
  "mesurer": {
    "g": "g1",
    "f": {
      "presente": [
        "mesure",
        "mesures",
        "mesure",
        "mesurons",
        "mesurez",
        "mesurent"
      ],
      "imparfait": [
        "mesurais",
        "mesurais",
        "mesurait",
        "mesurions",
        "mesuriez",
        "mesuraient"
      ],
      "passeCompose": [
        "ai mesuré",
        "as mesuré",
        "a mesuré",
        "avons mesuré",
        "avez mesuré",
        "ont mesuré"
      ],
      "plusQueParfait": [
        "avais mesuré",
        "avais mesuré",
        "avait mesuré",
        "avions mesuré",
        "aviez mesuré",
        "avaient mesuré"
      ],
      "futurSimple": [
        "mesurerai",
        "mesureras",
        "mesurera",
        "mesurerons",
        "mesurerez",
        "mesureront"
      ],
      "condPresente": [
        "mesurerais",
        "mesurerais",
        "mesurerait",
        "mesurerions",
        "mesureriez",
        "mesureraient"
      ],
      "subjPresente": [
        "mesure",
        "mesures",
        "mesure",
        "mesurions",
        "mesuriez",
        "mesurent"
      ],
      "imperatif": [
        null,
        "mesure",
        null,
        "mesurons",
        "mesurez",
        null
      ]
    }
  },
  "peser": {
    "g": "g1",
    "f": {
      "presente": [
        "pèse",
        "pèses",
        "pèse",
        "pesons",
        "pesez",
        "pèsent"
      ],
      "imparfait": [
        "pesais",
        "pesais",
        "pesait",
        "pesions",
        "pesiez",
        "pesaient"
      ],
      "passeCompose": [
        "ai pesé",
        "as pesé",
        "a pesé",
        "avons pesé",
        "avez pesé",
        "ont pesé"
      ],
      "plusQueParfait": [
        "avais pesé",
        "avais pesé",
        "avait pesé",
        "avions pesé",
        "aviez pesé",
        "avaient pesé"
      ],
      "futurSimple": [
        "pèserai",
        "pèseras",
        "pèsera",
        "pèserons",
        "pèserez",
        "pèseront"
      ],
      "condPresente": [
        "pèserais",
        "pèserais",
        "pèserait",
        "pèserions",
        "pèseriez",
        "pèseraient"
      ],
      "subjPresente": [
        "pèse",
        "pèses",
        "pèse",
        "pesions",
        "pesiez",
        "pèsent"
      ],
      "imperatif": [
        null,
        "pèse",
        null,
        "pesons",
        "pesez",
        null
      ]
    }
  },
  "pousser": {
    "g": "g1",
    "f": {
      "presente": [
        "pousse",
        "pousses",
        "pousse",
        "poussons",
        "poussez",
        "poussent"
      ],
      "imparfait": [
        "poussais",
        "poussais",
        "poussait",
        "poussions",
        "poussiez",
        "poussaient"
      ],
      "passeCompose": [
        "ai poussé",
        "as poussé",
        "a poussé",
        "avons poussé",
        "avez poussé",
        "ont poussé"
      ],
      "plusQueParfait": [
        "avais poussé",
        "avais poussé",
        "avait poussé",
        "avions poussé",
        "aviez poussé",
        "avaient poussé"
      ],
      "futurSimple": [
        "pousserai",
        "pousseras",
        "poussera",
        "pousserons",
        "pousserez",
        "pousseront"
      ],
      "condPresente": [
        "pousserais",
        "pousserais",
        "pousserait",
        "pousserions",
        "pousseriez",
        "pousseraient"
      ],
      "subjPresente": [
        "pousse",
        "pousses",
        "pousse",
        "poussions",
        "poussiez",
        "poussent"
      ],
      "imperatif": [
        null,
        "pousse",
        null,
        "poussons",
        "poussez",
        null
      ]
    }
  },
  "tirer": {
    "g": "g1",
    "f": {
      "presente": [
        "tire",
        "tires",
        "tire",
        "tirons",
        "tirez",
        "tirent"
      ],
      "imparfait": [
        "tirais",
        "tirais",
        "tirait",
        "tirions",
        "tiriez",
        "tiraient"
      ],
      "passeCompose": [
        "ai tiré",
        "as tiré",
        "a tiré",
        "avons tiré",
        "avez tiré",
        "ont tiré"
      ],
      "plusQueParfait": [
        "avais tiré",
        "avais tiré",
        "avait tiré",
        "avions tiré",
        "aviez tiré",
        "avaient tiré"
      ],
      "futurSimple": [
        "tirerai",
        "tireras",
        "tirera",
        "tirerons",
        "tirerez",
        "tireront"
      ],
      "condPresente": [
        "tirerais",
        "tirerais",
        "tirerait",
        "tirerions",
        "tireriez",
        "tireraient"
      ],
      "subjPresente": [
        "tire",
        "tires",
        "tire",
        "tirions",
        "tiriez",
        "tirent"
      ],
      "imperatif": [
        null,
        "tire",
        null,
        "tirons",
        "tirez",
        null
      ]
    }
  },
  "lancer": {
    "g": "g1",
    "f": {
      "presente": [
        "lance",
        "lances",
        "lance",
        "lançons",
        "lancez",
        "lancent"
      ],
      "imparfait": [
        "lançais",
        "lançais",
        "lançait",
        "lancions",
        "lanciez",
        "lançaient"
      ],
      "passeCompose": [
        "ai lancé",
        "as lancé",
        "a lancé",
        "avons lancé",
        "avez lancé",
        "ont lancé"
      ],
      "plusQueParfait": [
        "avais lancé",
        "avais lancé",
        "avait lancé",
        "avions lancé",
        "aviez lancé",
        "avaient lancé"
      ],
      "futurSimple": [
        "lancerai",
        "lanceras",
        "lancera",
        "lancerons",
        "lancerez",
        "lanceront"
      ],
      "condPresente": [
        "lancerais",
        "lancerais",
        "lancerait",
        "lancerions",
        "lanceriez",
        "lanceraient"
      ],
      "subjPresente": [
        "lance",
        "lances",
        "lance",
        "lancions",
        "lanciez",
        "lancent"
      ],
      "imperatif": [
        null,
        "lance",
        null,
        "lançons",
        "lancez",
        null
      ]
    }
  },
  "attraper": {
    "g": "g1",
    "f": {
      "presente": [
        "attrape",
        "attrapes",
        "attrape",
        "attrapons",
        "attrapez",
        "attrapent"
      ],
      "imparfait": [
        "attrapais",
        "attrapais",
        "attrapait",
        "attrapions",
        "attrapiez",
        "attrapaient"
      ],
      "passeCompose": [
        "ai attrapé",
        "as attrapé",
        "a attrapé",
        "avons attrapé",
        "avez attrapé",
        "ont attrapé"
      ],
      "plusQueParfait": [
        "avais attrapé",
        "avais attrapé",
        "avait attrapé",
        "avions attrapé",
        "aviez attrapé",
        "avaient attrapé"
      ],
      "futurSimple": [
        "attraperai",
        "attraperas",
        "attrapera",
        "attraperons",
        "attraperez",
        "attraperont"
      ],
      "condPresente": [
        "attraperais",
        "attraperais",
        "attraperait",
        "attraperions",
        "attraperiez",
        "attraperaient"
      ],
      "subjPresente": [
        "attrape",
        "attrapes",
        "attrape",
        "attrapions",
        "attrapiez",
        "attrapent"
      ],
      "imperatif": [
        null,
        "attrape",
        null,
        "attrapons",
        "attrapez",
        null
      ]
    }
  },
  "toucher": {
    "g": "g1",
    "f": {
      "presente": [
        "touche",
        "touches",
        "touche",
        "touchons",
        "touchez",
        "touchent"
      ],
      "imparfait": [
        "touchais",
        "touchais",
        "touchait",
        "touchions",
        "touchiez",
        "touchaient"
      ],
      "passeCompose": [
        "ai touché",
        "as touché",
        "a touché",
        "avons touché",
        "avez touché",
        "ont touché"
      ],
      "plusQueParfait": [
        "avais touché",
        "avais touché",
        "avait touché",
        "avions touché",
        "aviez touché",
        "avaient touché"
      ],
      "futurSimple": [
        "toucherai",
        "toucheras",
        "touchera",
        "toucherons",
        "toucherez",
        "toucheront"
      ],
      "condPresente": [
        "toucherais",
        "toucherais",
        "toucherait",
        "toucherions",
        "toucheriez",
        "toucheraient"
      ],
      "subjPresente": [
        "touche",
        "touches",
        "touche",
        "touchions",
        "touchiez",
        "touchent"
      ],
      "imperatif": [
        null,
        "touche",
        null,
        "touchons",
        "touchez",
        null
      ]
    }
  },
  "sonner": {
    "g": "g1",
    "f": {
      "presente": [
        "sonne",
        "sonnes",
        "sonne",
        "sonnons",
        "sonnez",
        "sonnent"
      ],
      "imparfait": [
        "sonnais",
        "sonnais",
        "sonnait",
        "sonnions",
        "sonniez",
        "sonnaient"
      ],
      "passeCompose": [
        "ai sonné",
        "as sonné",
        "a sonné",
        "avons sonné",
        "avez sonné",
        "ont sonné"
      ],
      "plusQueParfait": [
        "avais sonné",
        "avais sonné",
        "avait sonné",
        "avions sonné",
        "aviez sonné",
        "avaient sonné"
      ],
      "futurSimple": [
        "sonnerai",
        "sonneras",
        "sonnera",
        "sonnerons",
        "sonnerez",
        "sonneront"
      ],
      "condPresente": [
        "sonnerais",
        "sonnerais",
        "sonnerait",
        "sonnerions",
        "sonneriez",
        "sonneraient"
      ],
      "subjPresente": [
        "sonne",
        "sonnes",
        "sonne",
        "sonnions",
        "sonniez",
        "sonnent"
      ],
      "imperatif": [
        null,
        "sonne",
        null,
        "sonnons",
        "sonnez",
        null
      ]
    }
  },
  "garder": {
    "g": "g1",
    "f": {
      "presente": [
        "garde",
        "gardes",
        "garde",
        "gardons",
        "gardez",
        "gardent"
      ],
      "imparfait": [
        "gardais",
        "gardais",
        "gardait",
        "gardions",
        "gardiez",
        "gardaient"
      ],
      "passeCompose": [
        "ai gardé",
        "as gardé",
        "a gardé",
        "avons gardé",
        "avez gardé",
        "ont gardé"
      ],
      "plusQueParfait": [
        "avais gardé",
        "avais gardé",
        "avait gardé",
        "avions gardé",
        "aviez gardé",
        "avaient gardé"
      ],
      "futurSimple": [
        "garderai",
        "garderas",
        "gardera",
        "garderons",
        "garderez",
        "garderont"
      ],
      "condPresente": [
        "garderais",
        "garderais",
        "garderait",
        "garderions",
        "garderiez",
        "garderaient"
      ],
      "subjPresente": [
        "garde",
        "gardes",
        "garde",
        "gardions",
        "gardiez",
        "gardent"
      ],
      "imperatif": [
        null,
        "garde",
        null,
        "gardons",
        "gardez",
        null
      ]
    }
  },
  "signer": {
    "g": "g1",
    "f": {
      "presente": [
        "signe",
        "signes",
        "signe",
        "signons",
        "signez",
        "signent"
      ],
      "imparfait": [
        "signais",
        "signais",
        "signait",
        "signions",
        "signiez",
        "signaient"
      ],
      "passeCompose": [
        "ai signé",
        "as signé",
        "a signé",
        "avons signé",
        "avez signé",
        "ont signé"
      ],
      "plusQueParfait": [
        "avais signé",
        "avais signé",
        "avait signé",
        "avions signé",
        "aviez signé",
        "avaient signé"
      ],
      "futurSimple": [
        "signerai",
        "signeras",
        "signera",
        "signerons",
        "signerez",
        "signeront"
      ],
      "condPresente": [
        "signerais",
        "signerais",
        "signerait",
        "signerions",
        "signeriez",
        "signeraient"
      ],
      "subjPresente": [
        "signe",
        "signes",
        "signe",
        "signions",
        "signiez",
        "signent"
      ],
      "imperatif": [
        null,
        "signe",
        null,
        "signons",
        "signez",
        null
      ]
    }
  },
  "copier": {
    "g": "g1",
    "f": {
      "presente": [
        "copie",
        "copies",
        "copie",
        "copions",
        "copiez",
        "copient"
      ],
      "imparfait": [
        "copiais",
        "copiais",
        "copiait",
        "copiions",
        "copiiez",
        "copiaient"
      ],
      "passeCompose": [
        "ai copié",
        "as copié",
        "a copié",
        "avons copié",
        "avez copié",
        "ont copié"
      ],
      "plusQueParfait": [
        "avais copié",
        "avais copié",
        "avait copié",
        "avions copié",
        "aviez copié",
        "avaient copié"
      ],
      "futurSimple": [
        "copierai",
        "copieras",
        "copiera",
        "copierons",
        "copierez",
        "copieront"
      ],
      "condPresente": [
        "copierais",
        "copierais",
        "copierait",
        "copierions",
        "copieriez",
        "copieraient"
      ],
      "subjPresente": [
        "copie",
        "copies",
        "copie",
        "copiions",
        "copiiez",
        "copient"
      ],
      "imperatif": [
        null,
        "copie",
        null,
        "copions",
        "copiez",
        null
      ]
    }
  },
  "coller": {
    "g": "g1",
    "f": {
      "presente": [
        "colle",
        "colles",
        "colle",
        "collons",
        "collez",
        "collent"
      ],
      "imparfait": [
        "collais",
        "collais",
        "collait",
        "collions",
        "colliez",
        "collaient"
      ],
      "passeCompose": [
        "ai collé",
        "as collé",
        "a collé",
        "avons collé",
        "avez collé",
        "ont collé"
      ],
      "plusQueParfait": [
        "avais collé",
        "avais collé",
        "avait collé",
        "avions collé",
        "aviez collé",
        "avaient collé"
      ],
      "futurSimple": [
        "collerai",
        "colleras",
        "collera",
        "collerons",
        "collerez",
        "colleront"
      ],
      "condPresente": [
        "collerais",
        "collerais",
        "collerait",
        "collerions",
        "colleriez",
        "colleraient"
      ],
      "subjPresente": [
        "colle",
        "colles",
        "colle",
        "collions",
        "colliez",
        "collent"
      ],
      "imperatif": [
        null,
        "colle",
        null,
        "collons",
        "collez",
        null
      ]
    }
  },
  "imprimer": {
    "g": "g1",
    "f": {
      "presente": [
        "imprime",
        "imprimes",
        "imprime",
        "imprimons",
        "imprimez",
        "impriment"
      ],
      "imparfait": [
        "imprimais",
        "imprimais",
        "imprimait",
        "imprimions",
        "imprimiez",
        "imprimaient"
      ],
      "passeCompose": [
        "ai imprimé",
        "as imprimé",
        "a imprimé",
        "avons imprimé",
        "avez imprimé",
        "ont imprimé"
      ],
      "plusQueParfait": [
        "avais imprimé",
        "avais imprimé",
        "avait imprimé",
        "avions imprimé",
        "aviez imprimé",
        "avaient imprimé"
      ],
      "futurSimple": [
        "imprimerai",
        "imprimeras",
        "imprimera",
        "imprimerons",
        "imprimerez",
        "imprimeront"
      ],
      "condPresente": [
        "imprimerais",
        "imprimerais",
        "imprimerait",
        "imprimerions",
        "imprimeriez",
        "imprimeraient"
      ],
      "subjPresente": [
        "imprime",
        "imprimes",
        "imprime",
        "imprimions",
        "imprimiez",
        "impriment"
      ],
      "imperatif": [
        null,
        "imprime",
        null,
        "imprimons",
        "imprimez",
        null
      ]
    }
  },
  "allumer": {
    "g": "g1",
    "f": {
      "presente": [
        "allume",
        "allumes",
        "allume",
        "allumons",
        "allumez",
        "allument"
      ],
      "imparfait": [
        "allumais",
        "allumais",
        "allumait",
        "allumions",
        "allumiez",
        "allumaient"
      ],
      "passeCompose": [
        "ai allumé",
        "as allumé",
        "a allumé",
        "avons allumé",
        "avez allumé",
        "ont allumé"
      ],
      "plusQueParfait": [
        "avais allumé",
        "avais allumé",
        "avait allumé",
        "avions allumé",
        "aviez allumé",
        "avaient allumé"
      ],
      "futurSimple": [
        "allumerai",
        "allumeras",
        "allumera",
        "allumerons",
        "allumerez",
        "allumeront"
      ],
      "condPresente": [
        "allumerais",
        "allumerais",
        "allumerait",
        "allumerions",
        "allumeriez",
        "allumeraient"
      ],
      "subjPresente": [
        "allume",
        "allumes",
        "allume",
        "allumions",
        "allumiez",
        "allument"
      ],
      "imperatif": [
        null,
        "allume",
        null,
        "allumons",
        "allumez",
        null
      ]
    }
  },
  "éteindre": {
    "g": "g1",
    "f": {
      "presente": [
        "éteins",
        "éteins",
        "éteint",
        "éteignons",
        "éteignez",
        "éteignent"
      ],
      "imparfait": [
        "éteignais",
        "éteignais",
        "éteignait",
        "éteignions",
        "éteigniez",
        "éteignaient"
      ],
      "passeCompose": [
        "ai éteint",
        "as éteint",
        "a éteint",
        "avons éteint",
        "avez éteint",
        "ont éteint"
      ],
      "plusQueParfait": [
        "avais éteint",
        "avais éteint",
        "avait éteint",
        "avions éteint",
        "aviez éteint",
        "avaient éteint"
      ],
      "futurSimple": [
        "éteindrai",
        "éteindras",
        "éteindra",
        "éteindrons",
        "éteindrez",
        "éteindront"
      ],
      "condPresente": [
        "éteindrais",
        "éteindrais",
        "éteindrait",
        "éteindrions",
        "éteindriez",
        "éteindraient"
      ],
      "subjPresente": [
        "éteigne",
        "éteignes",
        "éteigne",
        "éteignions",
        "éteigniez",
        "éteignent"
      ],
      "imperatif": [
        null,
        "éteins",
        null,
        "éteignons",
        "éteignez",
        null
      ]
    }
  },
  "installer": {
    "g": "g1",
    "f": {
      "presente": [
        "installe",
        "installes",
        "installe",
        "installons",
        "installez",
        "installent"
      ],
      "imparfait": [
        "installais",
        "installais",
        "installait",
        "installions",
        "installiez",
        "installaient"
      ],
      "passeCompose": [
        "ai installé",
        "as installé",
        "a installé",
        "avons installé",
        "avez installé",
        "ont installé"
      ],
      "plusQueParfait": [
        "avais installé",
        "avais installé",
        "avait installé",
        "avions installé",
        "aviez installé",
        "avaient installé"
      ],
      "futurSimple": [
        "installerai",
        "installeras",
        "installera",
        "installerons",
        "installerez",
        "installeront"
      ],
      "condPresente": [
        "installerais",
        "installerais",
        "installerait",
        "installerions",
        "installeriez",
        "installeraient"
      ],
      "subjPresente": [
        "installe",
        "installes",
        "installe",
        "installions",
        "installiez",
        "installent"
      ],
      "imperatif": [
        null,
        "installe",
        null,
        "installons",
        "installez",
        null
      ]
    }
  },
  "vérifier": {
    "g": "g1",
    "f": {
      "presente": [
        "vérifie",
        "vérifies",
        "vérifie",
        "vérifions",
        "vérifiez",
        "vérifient"
      ],
      "imparfait": [
        "vérifiais",
        "vérifiais",
        "vérifiait",
        "vérifiions",
        "vérifiiez",
        "vérifiaient"
      ],
      "passeCompose": [
        "ai vérifié",
        "as vérifié",
        "a vérifié",
        "avons vérifié",
        "avez vérifié",
        "ont vérifié"
      ],
      "plusQueParfait": [
        "avais vérifié",
        "avais vérifié",
        "avait vérifié",
        "avions vérifié",
        "aviez vérifié",
        "avaient vérifié"
      ],
      "futurSimple": [
        "vérifierai",
        "vérifieras",
        "vérifiera",
        "vérifierons",
        "vérifierez",
        "vérifieront"
      ],
      "condPresente": [
        "vérifierais",
        "vérifierais",
        "vérifierait",
        "vérifierions",
        "vérifieriez",
        "vérifieraient"
      ],
      "subjPresente": [
        "vérifie",
        "vérifies",
        "vérifie",
        "vérifiions",
        "vérifiiez",
        "vérifient"
      ],
      "imperatif": [
        null,
        "vérifie",
        null,
        "vérifions",
        "vérifiez",
        null
      ]
    }
  },
  "confirmer": {
    "g": "g1",
    "f": {
      "presente": [
        "confirme",
        "confirmes",
        "confirme",
        "confirmons",
        "confirmez",
        "confirment"
      ],
      "imparfait": [
        "confirmais",
        "confirmais",
        "confirmait",
        "confirmions",
        "confirmiez",
        "confirmaient"
      ],
      "passeCompose": [
        "ai confirmé",
        "as confirmé",
        "a confirmé",
        "avons confirmé",
        "avez confirmé",
        "ont confirmé"
      ],
      "plusQueParfait": [
        "avais confirmé",
        "avais confirmé",
        "avait confirmé",
        "avions confirmé",
        "aviez confirmé",
        "avaient confirmé"
      ],
      "futurSimple": [
        "confirmerai",
        "confirmeras",
        "confirmera",
        "confirmerons",
        "confirmerez",
        "confirmeront"
      ],
      "condPresente": [
        "confirmerais",
        "confirmerais",
        "confirmerait",
        "confirmerions",
        "confirmeriez",
        "confirmeraient"
      ],
      "subjPresente": [
        "confirme",
        "confirmes",
        "confirme",
        "confirmions",
        "confirmiez",
        "confirment"
      ],
      "imperatif": [
        null,
        "confirme",
        null,
        "confirmons",
        "confirmez",
        null
      ]
    }
  },
  "annuler": {
    "g": "g1",
    "f": {
      "presente": [
        "annule",
        "annules",
        "annule",
        "annulons",
        "annulez",
        "annulent"
      ],
      "imparfait": [
        "annulais",
        "annulais",
        "annulait",
        "annulions",
        "annuliez",
        "annulaient"
      ],
      "passeCompose": [
        "ai annulé",
        "as annulé",
        "a annulé",
        "avons annulé",
        "avez annulé",
        "ont annulé"
      ],
      "plusQueParfait": [
        "avais annulé",
        "avais annulé",
        "avait annulé",
        "avions annulé",
        "aviez annulé",
        "avaient annulé"
      ],
      "futurSimple": [
        "annulerai",
        "annuleras",
        "annulera",
        "annulerons",
        "annulerez",
        "annuleront"
      ],
      "condPresente": [
        "annulerais",
        "annulerais",
        "annulerait",
        "annulerions",
        "annuleriez",
        "annuleraient"
      ],
      "subjPresente": [
        "annule",
        "annules",
        "annule",
        "annulions",
        "annuliez",
        "annulent"
      ],
      "imperatif": [
        null,
        "annule",
        null,
        "annulons",
        "annulez",
        null
      ]
    }
  },
  "réserver": {
    "g": "g1",
    "f": {
      "presente": [
        "réserve",
        "réserves",
        "réserve",
        "réservons",
        "réservez",
        "réservent"
      ],
      "imparfait": [
        "réservais",
        "réservais",
        "réservait",
        "réservions",
        "réserviez",
        "réservaient"
      ],
      "passeCompose": [
        "ai réservé",
        "as réservé",
        "a réservé",
        "avons réservé",
        "avez réservé",
        "ont réservé"
      ],
      "plusQueParfait": [
        "avais réservé",
        "avais réservé",
        "avait réservé",
        "avions réservé",
        "aviez réservé",
        "avaient réservé"
      ],
      "futurSimple": [
        "réserverai",
        "réserveras",
        "réservera",
        "réserverons",
        "réserverez",
        "réserveront"
      ],
      "condPresente": [
        "réserverais",
        "réserverais",
        "réserverait",
        "réserverions",
        "réserveriez",
        "réserveraient"
      ],
      "subjPresente": [
        "réserve",
        "réserves",
        "réserve",
        "réservions",
        "réserviez",
        "réservent"
      ],
      "imperatif": [
        null,
        "réserve",
        null,
        "réservons",
        "réservez",
        null
      ]
    }
  },
  "emprunter": {
    "g": "g1",
    "f": {
      "presente": [
        "emprunte",
        "empruntes",
        "emprunte",
        "empruntons",
        "empruntez",
        "empruntent"
      ],
      "imparfait": [
        "empruntais",
        "empruntais",
        "empruntait",
        "empruntions",
        "empruntiez",
        "empruntaient"
      ],
      "passeCompose": [
        "ai emprunté",
        "as emprunté",
        "a emprunté",
        "avons emprunté",
        "avez emprunté",
        "ont emprunté"
      ],
      "plusQueParfait": [
        "avais emprunté",
        "avais emprunté",
        "avait emprunté",
        "avions emprunté",
        "aviez emprunté",
        "avaient emprunté"
      ],
      "futurSimple": [
        "emprunterai",
        "emprunteras",
        "empruntera",
        "emprunterons",
        "emprunterez",
        "emprunteront"
      ],
      "condPresente": [
        "emprunterais",
        "emprunterais",
        "emprunterait",
        "emprunterions",
        "emprunteriez",
        "emprunteraient"
      ],
      "subjPresente": [
        "emprunte",
        "empruntes",
        "emprunte",
        "empruntions",
        "empruntiez",
        "empruntent"
      ],
      "imperatif": [
        null,
        "emprunte",
        null,
        "empruntons",
        "empruntez",
        null
      ]
    }
  },
  "prêter": {
    "g": "g1",
    "f": {
      "presente": [
        "prête",
        "prêtes",
        "prête",
        "prêtons",
        "prêtez",
        "prêtent"
      ],
      "imparfait": [
        "prêtais",
        "prêtais",
        "prêtait",
        "prêtions",
        "prêtiez",
        "prêtaient"
      ],
      "passeCompose": [
        "ai prêté",
        "as prêté",
        "a prêté",
        "avons prêté",
        "avez prêté",
        "ont prêté"
      ],
      "plusQueParfait": [
        "avais prêté",
        "avais prêté",
        "avait prêté",
        "avions prêté",
        "aviez prêté",
        "avaient prêté"
      ],
      "futurSimple": [
        "prêterai",
        "prêteras",
        "prêtera",
        "prêterons",
        "prêterez",
        "prêteront"
      ],
      "condPresente": [
        "prêterais",
        "prêterais",
        "prêterait",
        "prêterions",
        "prêteriez",
        "prêteraient"
      ],
      "subjPresente": [
        "prête",
        "prêtes",
        "prête",
        "prêtions",
        "prêtiez",
        "prêtent"
      ],
      "imperatif": [
        null,
        "prête",
        null,
        "prêtons",
        "prêtez",
        null
      ]
    }
  },
  "rembourser": {
    "g": "g1",
    "f": {
      "presente": [
        "rembourse",
        "rembourses",
        "rembourse",
        "remboursons",
        "remboursez",
        "remboursent"
      ],
      "imparfait": [
        "remboursais",
        "remboursais",
        "remboursait",
        "remboursions",
        "remboursiez",
        "remboursaient"
      ],
      "passeCompose": [
        "ai remboursé",
        "as remboursé",
        "a remboursé",
        "avons remboursé",
        "avez remboursé",
        "ont remboursé"
      ],
      "plusQueParfait": [
        "avais remboursé",
        "avais remboursé",
        "avait remboursé",
        "avions remboursé",
        "aviez remboursé",
        "avaient remboursé"
      ],
      "futurSimple": [
        "rembourserai",
        "rembourseras",
        "remboursera",
        "rembourserons",
        "rembourserez",
        "rembourseront"
      ],
      "condPresente": [
        "rembourserais",
        "rembourserais",
        "rembourserait",
        "rembourserions",
        "rembourseriez",
        "rembourseraient"
      ],
      "subjPresente": [
        "rembourse",
        "rembourses",
        "rembourse",
        "remboursions",
        "remboursiez",
        "remboursent"
      ],
      "imperatif": [
        null,
        "rembourse",
        null,
        "remboursons",
        "remboursez",
        null
      ]
    }
  },
  "économiser": {
    "g": "g1",
    "f": {
      "presente": [
        "économise",
        "économises",
        "économise",
        "économisons",
        "économisez",
        "économisent"
      ],
      "imparfait": [
        "économisais",
        "économisais",
        "économisait",
        "économisions",
        "économisiez",
        "économisaient"
      ],
      "passeCompose": [
        "ai économisé",
        "as économisé",
        "a économisé",
        "avons économisé",
        "avez économisé",
        "ont économisé"
      ],
      "plusQueParfait": [
        "avais économisé",
        "avais économisé",
        "avait économisé",
        "avions économisé",
        "aviez économisé",
        "avaient économisé"
      ],
      "futurSimple": [
        "économiserai",
        "économiseras",
        "économisera",
        "économiserons",
        "économiserez",
        "économiseront"
      ],
      "condPresente": [
        "économiserais",
        "économiserais",
        "économiserait",
        "économiserions",
        "économiseriez",
        "économiseraient"
      ],
      "subjPresente": [
        "économise",
        "économises",
        "économise",
        "économisions",
        "économisiez",
        "économisent"
      ],
      "imperatif": [
        null,
        "économise",
        null,
        "économisons",
        "économisez",
        null
      ]
    }
  },
  "déjeuner": {
    "g": "g1",
    "f": {
      "presente": [
        "déjeune",
        "déjeunes",
        "déjeune",
        "déjeunons",
        "déjeunez",
        "déjeunent"
      ],
      "imparfait": [
        "déjeunais",
        "déjeunais",
        "déjeunait",
        "déjeunions",
        "déjeuniez",
        "déjeunaient"
      ],
      "passeCompose": [
        "ai déjeuné",
        "as déjeuné",
        "a déjeuné",
        "avons déjeuné",
        "avez déjeuné",
        "ont déjeuné"
      ],
      "plusQueParfait": [
        "avais déjeuné",
        "avais déjeuné",
        "avait déjeuné",
        "avions déjeuné",
        "aviez déjeuné",
        "avaient déjeuné"
      ],
      "futurSimple": [
        "déjeunerai",
        "déjeuneras",
        "déjeunera",
        "déjeunerons",
        "déjeunerez",
        "déjeuneront"
      ],
      "condPresente": [
        "déjeunerais",
        "déjeunerais",
        "déjeunerait",
        "déjeunerions",
        "déjeuneriez",
        "déjeuneraient"
      ],
      "subjPresente": [
        "déjeune",
        "déjeunes",
        "déjeune",
        "déjeunions",
        "déjeuniez",
        "déjeunent"
      ],
      "imperatif": [
        null,
        "déjeune",
        null,
        "déjeunons",
        "déjeunez",
        null
      ]
    }
  },
  "dîner": {
    "g": "g1",
    "f": {
      "presente": [
        "dîne",
        "dînes",
        "dîne",
        "dînons",
        "dînez",
        "dînent"
      ],
      "imparfait": [
        "dînais",
        "dînais",
        "dînait",
        "dînions",
        "dîniez",
        "dînaient"
      ],
      "passeCompose": [
        "ai dîné",
        "as dîné",
        "a dîné",
        "avons dîné",
        "avez dîné",
        "ont dîné"
      ],
      "plusQueParfait": [
        "avais dîné",
        "avais dîné",
        "avait dîné",
        "avions dîné",
        "aviez dîné",
        "avaient dîné"
      ],
      "futurSimple": [
        "dînerai",
        "dîneras",
        "dînera",
        "dînerons",
        "dînerez",
        "dîneront"
      ],
      "condPresente": [
        "dînerais",
        "dînerais",
        "dînerait",
        "dînerions",
        "dîneriez",
        "dîneraient"
      ],
      "subjPresente": [
        "dîne",
        "dînes",
        "dîne",
        "dînions",
        "dîniez",
        "dînent"
      ],
      "imperatif": [
        null,
        "dîne",
        null,
        "dînons",
        "dînez",
        null
      ]
    }
  },
  "cuisiner": {
    "g": "g1",
    "f": {
      "presente": [
        "cuisine",
        "cuisines",
        "cuisine",
        "cuisinons",
        "cuisinez",
        "cuisinent"
      ],
      "imparfait": [
        "cuisinais",
        "cuisinais",
        "cuisinait",
        "cuisinions",
        "cuisiniez",
        "cuisinaient"
      ],
      "passeCompose": [
        "ai cuisiné",
        "as cuisiné",
        "a cuisiné",
        "avons cuisiné",
        "avez cuisiné",
        "ont cuisiné"
      ],
      "plusQueParfait": [
        "avais cuisiné",
        "avais cuisiné",
        "avait cuisiné",
        "avions cuisiné",
        "aviez cuisiné",
        "avaient cuisiné"
      ],
      "futurSimple": [
        "cuisinerai",
        "cuisineras",
        "cuisinera",
        "cuisinerons",
        "cuisinerez",
        "cuisineront"
      ],
      "condPresente": [
        "cuisinerais",
        "cuisinerais",
        "cuisinerait",
        "cuisinerions",
        "cuisineriez",
        "cuisineraient"
      ],
      "subjPresente": [
        "cuisine",
        "cuisines",
        "cuisine",
        "cuisinions",
        "cuisiniez",
        "cuisinent"
      ],
      "imperatif": [
        null,
        "cuisine",
        null,
        "cuisinons",
        "cuisinez",
        null
      ]
    }
  },
  "goûter": {
    "g": "g1",
    "f": {
      "presente": [
        "goûte",
        "goûtes",
        "goûte",
        "goûtons",
        "goûtez",
        "goûtent"
      ],
      "imparfait": [
        "goûtais",
        "goûtais",
        "goûtait",
        "goûtions",
        "goûtiez",
        "goûtaient"
      ],
      "passeCompose": [
        "ai goûté",
        "as goûté",
        "a goûté",
        "avons goûté",
        "avez goûté",
        "ont goûté"
      ],
      "plusQueParfait": [
        "avais goûté",
        "avais goûté",
        "avait goûté",
        "avions goûté",
        "aviez goûté",
        "avaient goûté"
      ],
      "futurSimple": [
        "goûterai",
        "goûteras",
        "goûtera",
        "goûterons",
        "goûterez",
        "goûteront"
      ],
      "condPresente": [
        "goûterais",
        "goûterais",
        "goûterait",
        "goûterions",
        "goûteriez",
        "goûteraient"
      ],
      "subjPresente": [
        "goûte",
        "goûtes",
        "goûte",
        "goûtions",
        "goûtiez",
        "goûtent"
      ],
      "imperatif": [
        null,
        "goûte",
        null,
        "goûtons",
        "goûtez",
        null
      ]
    }
  },
  "commander": {
    "g": "g1",
    "f": {
      "presente": [
        "commande",
        "commandes",
        "commande",
        "commandons",
        "commandez",
        "commandent"
      ],
      "imparfait": [
        "commandais",
        "commandais",
        "commandait",
        "commandions",
        "commandiez",
        "commandaient"
      ],
      "passeCompose": [
        "ai commandé",
        "as commandé",
        "a commandé",
        "avons commandé",
        "avez commandé",
        "ont commandé"
      ],
      "plusQueParfait": [
        "avais commandé",
        "avais commandé",
        "avait commandé",
        "avions commandé",
        "aviez commandé",
        "avaient commandé"
      ],
      "futurSimple": [
        "commanderai",
        "commanderas",
        "commandera",
        "commanderons",
        "commanderez",
        "commanderont"
      ],
      "condPresente": [
        "commanderais",
        "commanderais",
        "commanderait",
        "commanderions",
        "commanderiez",
        "commanderaient"
      ],
      "subjPresente": [
        "commande",
        "commandes",
        "commande",
        "commandions",
        "commandiez",
        "commandent"
      ],
      "imperatif": [
        null,
        "commande",
        null,
        "commandons",
        "commandez",
        null
      ]
    }
  },
  "servir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "sers",
        "sers",
        "sert",
        "servons",
        "servez",
        "servent"
      ],
      "imparfait": [
        "servais",
        "servais",
        "servait",
        "servions",
        "serviez",
        "servaient"
      ],
      "passeCompose": [
        "ai servi",
        "as servi",
        "a servi",
        "avons servi",
        "avez servi",
        "ont servi"
      ],
      "plusQueParfait": [
        "avais servi",
        "avais servi",
        "avait servi",
        "avions servi",
        "aviez servi",
        "avaient servi"
      ],
      "futurSimple": [
        "servirai",
        "serviras",
        "servira",
        "servirons",
        "servirez",
        "serviront"
      ],
      "condPresente": [
        "servirais",
        "servirais",
        "servirait",
        "servirions",
        "serviriez",
        "serviraient"
      ],
      "subjPresente": [
        "serve",
        "serves",
        "serve",
        "servions",
        "serviez",
        "servent"
      ],
      "imperatif": [
        null,
        "sers",
        null,
        "servons",
        "servez",
        null
      ]
    }
  },
  "laisser": {
    "g": "g1",
    "f": {
      "presente": [
        "laisse",
        "laisses",
        "laisse",
        "laissons",
        "laissez",
        "laissent"
      ],
      "imparfait": [
        "laissais",
        "laissais",
        "laissait",
        "laissions",
        "laissiez",
        "laissaient"
      ],
      "passeCompose": [
        "ai laissé",
        "as laissé",
        "a laissé",
        "avons laissé",
        "avez laissé",
        "ont laissé"
      ],
      "plusQueParfait": [
        "avais laissé",
        "avais laissé",
        "avait laissé",
        "avions laissé",
        "aviez laissé",
        "avaient laissé"
      ],
      "futurSimple": [
        "laisserai",
        "laisseras",
        "laissera",
        "laisserons",
        "laisserez",
        "laisseront"
      ],
      "condPresente": [
        "laisserais",
        "laisserais",
        "laisserait",
        "laisserions",
        "laisseriez",
        "laisseraient"
      ],
      "subjPresente": [
        "laisse",
        "laisses",
        "laisse",
        "laissions",
        "laissiez",
        "laissent"
      ],
      "imperatif": [
        null,
        "laisse",
        null,
        "laissons",
        "laissez",
        null
      ]
    }
  },
  "téléphoner": {
    "g": "g1",
    "f": {
      "presente": [
        "téléphone",
        "téléphones",
        "téléphone",
        "téléphonons",
        "téléphonez",
        "téléphonent"
      ],
      "imparfait": [
        "téléphonais",
        "téléphonais",
        "téléphonait",
        "téléphonions",
        "téléphoniez",
        "téléphonaient"
      ],
      "passeCompose": [
        "ai téléphoné",
        "as téléphoné",
        "a téléphoné",
        "avons téléphoné",
        "avez téléphoné",
        "ont téléphoné"
      ],
      "plusQueParfait": [
        "avais téléphoné",
        "avais téléphoné",
        "avait téléphoné",
        "avions téléphoné",
        "aviez téléphoné",
        "avaient téléphoné"
      ],
      "futurSimple": [
        "téléphonerai",
        "téléphoneras",
        "téléphonera",
        "téléphonerons",
        "téléphonerez",
        "téléphoneront"
      ],
      "condPresente": [
        "téléphonerais",
        "téléphonerais",
        "téléphonerait",
        "téléphonerions",
        "téléphoneriez",
        "téléphoneraient"
      ],
      "subjPresente": [
        "téléphone",
        "téléphones",
        "téléphone",
        "téléphonions",
        "téléphoniez",
        "téléphonent"
      ],
      "imperatif": [
        null,
        "téléphone",
        null,
        "téléphonons",
        "téléphonez",
        null
      ]
    }
  },
  "discuter": {
    "g": "g1",
    "f": {
      "presente": [
        "discute",
        "discutes",
        "discute",
        "discutons",
        "discutez",
        "discutent"
      ],
      "imparfait": [
        "discutais",
        "discutais",
        "discutait",
        "discutions",
        "discutiez",
        "discutaient"
      ],
      "passeCompose": [
        "ai discuté",
        "as discuté",
        "a discuté",
        "avons discuté",
        "avez discuté",
        "ont discuté"
      ],
      "plusQueParfait": [
        "avais discuté",
        "avais discuté",
        "avait discuté",
        "avions discuté",
        "aviez discuté",
        "avaient discuté"
      ],
      "futurSimple": [
        "discuterai",
        "discuteras",
        "discutera",
        "discuterons",
        "discuterez",
        "discuteront"
      ],
      "condPresente": [
        "discuterais",
        "discuterais",
        "discuterait",
        "discuterions",
        "discuteriez",
        "discuteraient"
      ],
      "subjPresente": [
        "discute",
        "discutes",
        "discute",
        "discutions",
        "discutiez",
        "discutent"
      ],
      "imperatif": [
        null,
        "discute",
        null,
        "discutons",
        "discutez",
        null
      ]
    }
  },
  "raconter": {
    "g": "g1",
    "f": {
      "presente": [
        "raconte",
        "racontes",
        "raconte",
        "racontons",
        "racontez",
        "racontent"
      ],
      "imparfait": [
        "racontais",
        "racontais",
        "racontait",
        "racontions",
        "racontiez",
        "racontaient"
      ],
      "passeCompose": [
        "ai raconté",
        "as raconté",
        "a raconté",
        "avons raconté",
        "avez raconté",
        "ont raconté"
      ],
      "plusQueParfait": [
        "avais raconté",
        "avais raconté",
        "avait raconté",
        "avions raconté",
        "aviez raconté",
        "avaient raconté"
      ],
      "futurSimple": [
        "raconterai",
        "raconteras",
        "racontera",
        "raconterons",
        "raconterez",
        "raconteront"
      ],
      "condPresente": [
        "raconterais",
        "raconterais",
        "raconterait",
        "raconterions",
        "raconteriez",
        "raconteraient"
      ],
      "subjPresente": [
        "raconte",
        "racontes",
        "raconte",
        "racontions",
        "racontiez",
        "racontent"
      ],
      "imperatif": [
        null,
        "raconte",
        null,
        "racontons",
        "racontez",
        null
      ]
    }
  },
  "crier": {
    "g": "g1",
    "f": {
      "presente": [
        "crie",
        "cries",
        "crie",
        "crions",
        "criez",
        "crient"
      ],
      "imparfait": [
        "criais",
        "criais",
        "criait",
        "criions",
        "criiez",
        "criaient"
      ],
      "passeCompose": [
        "ai crié",
        "as crié",
        "a crié",
        "avons crié",
        "avez crié",
        "ont crié"
      ],
      "plusQueParfait": [
        "avais crié",
        "avais crié",
        "avait crié",
        "avions crié",
        "aviez crié",
        "avaient crié"
      ],
      "futurSimple": [
        "crierai",
        "crieras",
        "criera",
        "crierons",
        "crierez",
        "crieront"
      ],
      "condPresente": [
        "crierais",
        "crierais",
        "crierait",
        "crierions",
        "crieriez",
        "crieraient"
      ],
      "subjPresente": [
        "crie",
        "cries",
        "crie",
        "criions",
        "criiez",
        "crient"
      ],
      "imperatif": [
        null,
        "crie",
        null,
        "crions",
        "criez",
        null
      ]
    }
  },
  "pleurer": {
    "g": "g1",
    "f": {
      "presente": [
        "pleure",
        "pleures",
        "pleure",
        "pleurons",
        "pleurez",
        "pleurent"
      ],
      "imparfait": [
        "pleurais",
        "pleurais",
        "pleurait",
        "pleurions",
        "pleuriez",
        "pleuraient"
      ],
      "passeCompose": [
        "ai pleuré",
        "as pleuré",
        "a pleuré",
        "avons pleuré",
        "avez pleuré",
        "ont pleuré"
      ],
      "plusQueParfait": [
        "avais pleuré",
        "avais pleuré",
        "avait pleuré",
        "avions pleuré",
        "aviez pleuré",
        "avaient pleuré"
      ],
      "futurSimple": [
        "pleurerai",
        "pleureras",
        "pleurera",
        "pleurerons",
        "pleurerez",
        "pleureront"
      ],
      "condPresente": [
        "pleurerais",
        "pleurerais",
        "pleurerait",
        "pleurerions",
        "pleureriez",
        "pleureraient"
      ],
      "subjPresente": [
        "pleure",
        "pleures",
        "pleure",
        "pleurions",
        "pleuriez",
        "pleurent"
      ],
      "imperatif": [
        null,
        "pleure",
        null,
        "pleurons",
        "pleurez",
        null
      ]
    }
  },
  "rêver": {
    "g": "g1",
    "f": {
      "presente": [
        "rêve",
        "rêves",
        "rêve",
        "rêvons",
        "rêvez",
        "rêvent"
      ],
      "imparfait": [
        "rêvais",
        "rêvais",
        "rêvait",
        "rêvions",
        "rêviez",
        "rêvaient"
      ],
      "passeCompose": [
        "ai rêvé",
        "as rêvé",
        "a rêvé",
        "avons rêvé",
        "avez rêvé",
        "ont rêvé"
      ],
      "plusQueParfait": [
        "avais rêvé",
        "avais rêvé",
        "avait rêvé",
        "avions rêvé",
        "aviez rêvé",
        "avaient rêvé"
      ],
      "futurSimple": [
        "rêverai",
        "rêveras",
        "rêvera",
        "rêverons",
        "rêverez",
        "rêveront"
      ],
      "condPresente": [
        "rêverais",
        "rêverais",
        "rêverait",
        "rêverions",
        "rêveriez",
        "rêveraient"
      ],
      "subjPresente": [
        "rêve",
        "rêves",
        "rêve",
        "rêvions",
        "rêviez",
        "rêvent"
      ],
      "imperatif": [
        null,
        "rêve",
        null,
        "rêvons",
        "rêvez",
        null
      ]
    }
  },
  "imaginer": {
    "g": "g1",
    "f": {
      "presente": [
        "imagine",
        "imagines",
        "imagine",
        "imaginons",
        "imaginez",
        "imaginent"
      ],
      "imparfait": [
        "imaginais",
        "imaginais",
        "imaginait",
        "imaginions",
        "imaginiez",
        "imaginaient"
      ],
      "passeCompose": [
        "ai imaginé",
        "as imaginé",
        "a imaginé",
        "avons imaginé",
        "avez imaginé",
        "ont imaginé"
      ],
      "plusQueParfait": [
        "avais imaginé",
        "avais imaginé",
        "avait imaginé",
        "avions imaginé",
        "aviez imaginé",
        "avaient imaginé"
      ],
      "futurSimple": [
        "imaginerai",
        "imagineras",
        "imaginera",
        "imaginerons",
        "imaginerez",
        "imagineront"
      ],
      "condPresente": [
        "imaginerais",
        "imaginerais",
        "imaginerait",
        "imaginerions",
        "imagineriez",
        "imagineraient"
      ],
      "subjPresente": [
        "imagine",
        "imagines",
        "imagine",
        "imaginions",
        "imaginiez",
        "imaginent"
      ],
      "imperatif": [
        null,
        "imagine",
        null,
        "imaginons",
        "imaginez",
        null
      ]
    }
  },
  "rappeler": {
    "g": "g1",
    "f": {
      "presente": [
        "rappelle",
        "rappelles",
        "rappelle",
        "rappelons",
        "rappelez",
        "rappellent"
      ],
      "imparfait": [
        "rappelais",
        "rappelais",
        "rappelait",
        "rappelions",
        "rappeliez",
        "rappelaient"
      ],
      "passeCompose": [
        "ai rappelé",
        "as rappelé",
        "a rappelé",
        "avons rappelé",
        "avez rappelé",
        "ont rappelé"
      ],
      "plusQueParfait": [
        "avais rappelé",
        "avais rappelé",
        "avait rappelé",
        "avions rappelé",
        "aviez rappelé",
        "avaient rappelé"
      ],
      "futurSimple": [
        "rappellerai",
        "rappelleras",
        "rappellera",
        "rappellerons",
        "rappellerez",
        "rappelleront"
      ],
      "condPresente": [
        "rappellerais",
        "rappellerais",
        "rappellerait",
        "rappellerions",
        "rappelleriez",
        "rappelleraient"
      ],
      "subjPresente": [
        "rappelle",
        "rappelles",
        "rappelle",
        "rappelions",
        "rappeliez",
        "rappellent"
      ],
      "imperatif": [
        null,
        "rappelle",
        null,
        "rappelons",
        "rappelez",
        null
      ]
    }
  },
  "noter": {
    "g": "g1",
    "f": {
      "presente": [
        "note",
        "notes",
        "note",
        "notons",
        "notez",
        "notent"
      ],
      "imparfait": [
        "notais",
        "notais",
        "notait",
        "notions",
        "notiez",
        "notaient"
      ],
      "passeCompose": [
        "ai noté",
        "as noté",
        "a noté",
        "avons noté",
        "avez noté",
        "ont noté"
      ],
      "plusQueParfait": [
        "avais noté",
        "avais noté",
        "avait noté",
        "avions noté",
        "aviez noté",
        "avaient noté"
      ],
      "futurSimple": [
        "noterai",
        "noteras",
        "notera",
        "noterons",
        "noterez",
        "noteront"
      ],
      "condPresente": [
        "noterais",
        "noterais",
        "noterait",
        "noterions",
        "noteriez",
        "noteraient"
      ],
      "subjPresente": [
        "note",
        "notes",
        "note",
        "notions",
        "notiez",
        "notent"
      ],
      "imperatif": [
        null,
        "note",
        null,
        "notons",
        "notez",
        null
      ]
    }
  },
  "marquer": {
    "g": "g1",
    "f": {
      "presente": [
        "marque",
        "marques",
        "marque",
        "marquons",
        "marquez",
        "marquent"
      ],
      "imparfait": [
        "marquais",
        "marquais",
        "marquait",
        "marquions",
        "marquiez",
        "marquaient"
      ],
      "passeCompose": [
        "ai marqué",
        "as marqué",
        "a marqué",
        "avons marqué",
        "avez marqué",
        "ont marqué"
      ],
      "plusQueParfait": [
        "avais marqué",
        "avais marqué",
        "avait marqué",
        "avions marqué",
        "aviez marqué",
        "avaient marqué"
      ],
      "futurSimple": [
        "marquerai",
        "marqueras",
        "marquera",
        "marquerons",
        "marquerez",
        "marqueront"
      ],
      "condPresente": [
        "marquerais",
        "marquerais",
        "marquerait",
        "marquerions",
        "marqueriez",
        "marqueraient"
      ],
      "subjPresente": [
        "marque",
        "marques",
        "marque",
        "marquions",
        "marquiez",
        "marquent"
      ],
      "imperatif": [
        null,
        "marque",
        null,
        "marquons",
        "marquez",
        null
      ]
    }
  },
  "peindre": {
    "g": "g3re",
    "f": {
      "presente": [
        "peins",
        "peins",
        "peint",
        "peignons",
        "peignez",
        "peignent"
      ],
      "imparfait": [
        "peignais",
        "peignais",
        "peignait",
        "peignions",
        "peigniez",
        "peignaient"
      ],
      "passeCompose": [
        "ai peint",
        "as peint",
        "a peint",
        "avons peint",
        "avez peint",
        "ont peint"
      ],
      "plusQueParfait": [
        "avais peint",
        "avais peint",
        "avait peint",
        "avions peint",
        "aviez peint",
        "avaient peint"
      ],
      "futurSimple": [
        "peindrai",
        "peindras",
        "peindra",
        "peindrons",
        "peindrez",
        "peindront"
      ],
      "condPresente": [
        "peindrais",
        "peindrais",
        "peindrait",
        "peindrions",
        "peindriez",
        "peindraient"
      ],
      "subjPresente": [
        "peigne",
        "peignes",
        "peigne",
        "peignions",
        "peigniez",
        "peignent"
      ],
      "imperatif": [
        null,
        "peins",
        null,
        "peignons",
        "peignez",
        null
      ]
    }
  },
  "filmer": {
    "g": "g1",
    "f": {
      "presente": [
        "filme",
        "filmes",
        "filme",
        "filmons",
        "filmez",
        "filment"
      ],
      "imparfait": [
        "filmais",
        "filmais",
        "filmait",
        "filmions",
        "filmiez",
        "filmaient"
      ],
      "passeCompose": [
        "ai filmé",
        "as filmé",
        "a filmé",
        "avons filmé",
        "avez filmé",
        "ont filmé"
      ],
      "plusQueParfait": [
        "avais filmé",
        "avais filmé",
        "avait filmé",
        "avions filmé",
        "aviez filmé",
        "avaient filmé"
      ],
      "futurSimple": [
        "filmerai",
        "filmeras",
        "filmera",
        "filmerons",
        "filmerez",
        "filmeront"
      ],
      "condPresente": [
        "filmerais",
        "filmerais",
        "filmerait",
        "filmerions",
        "filmeriez",
        "filmeraient"
      ],
      "subjPresente": [
        "filme",
        "filmes",
        "filme",
        "filmions",
        "filmiez",
        "filment"
      ],
      "imperatif": [
        null,
        "filme",
        null,
        "filmons",
        "filmez",
        null
      ]
    }
  },
  "enregistrer": {
    "g": "g1",
    "f": {
      "presente": [
        "enregistre",
        "enregistres",
        "enregistre",
        "enregistrons",
        "enregistrez",
        "enregistrent"
      ],
      "imparfait": [
        "enregistrais",
        "enregistrais",
        "enregistrait",
        "enregistrions",
        "enregistriez",
        "enregistraient"
      ],
      "passeCompose": [
        "ai enregistré",
        "as enregistré",
        "a enregistré",
        "avons enregistré",
        "avez enregistré",
        "ont enregistré"
      ],
      "plusQueParfait": [
        "avais enregistré",
        "avais enregistré",
        "avait enregistré",
        "avions enregistré",
        "aviez enregistré",
        "avaient enregistré"
      ],
      "futurSimple": [
        "enregistrerai",
        "enregistreras",
        "enregistrera",
        "enregistrerons",
        "enregistrerez",
        "enregistreront"
      ],
      "condPresente": [
        "enregistrerais",
        "enregistrerais",
        "enregistrerait",
        "enregistrerions",
        "enregistreriez",
        "enregistreraient"
      ],
      "subjPresente": [
        "enregistre",
        "enregistres",
        "enregistre",
        "enregistrions",
        "enregistriez",
        "enregistrent"
      ],
      "imperatif": [
        null,
        "enregistre",
        null,
        "enregistrons",
        "enregistrez",
        null
      ]
    }
  },
  "publier": {
    "g": "g1",
    "f": {
      "presente": [
        "publie",
        "publies",
        "publie",
        "publions",
        "publiez",
        "publient"
      ],
      "imparfait": [
        "publiais",
        "publiais",
        "publiait",
        "publiions",
        "publiiez",
        "publiaient"
      ],
      "passeCompose": [
        "ai publié",
        "as publié",
        "a publié",
        "avons publié",
        "avez publié",
        "ont publié"
      ],
      "plusQueParfait": [
        "avais publié",
        "avais publié",
        "avait publié",
        "avions publié",
        "aviez publié",
        "avaient publié"
      ],
      "futurSimple": [
        "publierai",
        "publieras",
        "publiera",
        "publierons",
        "publierez",
        "publieront"
      ],
      "condPresente": [
        "publierais",
        "publierais",
        "publierait",
        "publierions",
        "publieriez",
        "publieraient"
      ],
      "subjPresente": [
        "publie",
        "publies",
        "publie",
        "publiions",
        "publiiez",
        "publient"
      ],
      "imperatif": [
        null,
        "publie",
        null,
        "publions",
        "publiez",
        null
      ]
    }
  },
  "poster": {
    "g": "g1",
    "f": {
      "presente": [
        "poste",
        "postes",
        "poste",
        "postons",
        "postez",
        "postent"
      ],
      "imparfait": [
        "postais",
        "postais",
        "postait",
        "postions",
        "postiez",
        "postaient"
      ],
      "passeCompose": [
        "ai posté",
        "as posté",
        "a posté",
        "avons posté",
        "avez posté",
        "ont posté"
      ],
      "plusQueParfait": [
        "avais posté",
        "avais posté",
        "avait posté",
        "avions posté",
        "aviez posté",
        "avaient posté"
      ],
      "futurSimple": [
        "posterai",
        "posteras",
        "postera",
        "posterons",
        "posterez",
        "posteront"
      ],
      "condPresente": [
        "posterais",
        "posterais",
        "posterait",
        "posterions",
        "posteriez",
        "posteraient"
      ],
      "subjPresente": [
        "poste",
        "postes",
        "poste",
        "postions",
        "postiez",
        "postent"
      ],
      "imperatif": [
        null,
        "poste",
        null,
        "postons",
        "postez",
        null
      ]
    }
  },
  "suivre": {
    "g": "g3re",
    "f": {
      "presente": [
        "suis",
        "suis",
        "suit",
        "suivons",
        "suivez",
        "suivent"
      ],
      "imparfait": [
        "suivais",
        "suivais",
        "suivait",
        "suivions",
        "suiviez",
        "suivaient"
      ],
      "passeCompose": [
        "ai suivi",
        "as suivi",
        "a suivi",
        "avons suivi",
        "avez suivi",
        "ont suivi"
      ],
      "plusQueParfait": [
        "avais suivi",
        "avais suivi",
        "avait suivi",
        "avions suivi",
        "aviez suivi",
        "avaient suivi"
      ],
      "futurSimple": [
        "suivrai",
        "suivras",
        "suivra",
        "suivrons",
        "suivrez",
        "suivront"
      ],
      "condPresente": [
        "suivrais",
        "suivrais",
        "suivrait",
        "suivrions",
        "suivriez",
        "suivraient"
      ],
      "subjPresente": [
        "suive",
        "suives",
        "suive",
        "suivions",
        "suiviez",
        "suivent"
      ],
      "imperatif": [
        null,
        "suis",
        null,
        "suivons",
        "suivez",
        null
      ]
    }
  },
  "bloquer": {
    "g": "g1",
    "f": {
      "presente": [
        "bloque",
        "bloques",
        "bloque",
        "bloquons",
        "bloquez",
        "bloquent"
      ],
      "imparfait": [
        "bloquais",
        "bloquais",
        "bloquait",
        "bloquions",
        "bloquiez",
        "bloquaient"
      ],
      "passeCompose": [
        "ai bloqué",
        "as bloqué",
        "a bloqué",
        "avons bloqué",
        "avez bloqué",
        "ont bloqué"
      ],
      "plusQueParfait": [
        "avais bloqué",
        "avais bloqué",
        "avait bloqué",
        "avions bloqué",
        "aviez bloqué",
        "avaient bloqué"
      ],
      "futurSimple": [
        "bloquerai",
        "bloqueras",
        "bloquera",
        "bloquerons",
        "bloquerez",
        "bloqueront"
      ],
      "condPresente": [
        "bloquerais",
        "bloquerais",
        "bloquerait",
        "bloquerions",
        "bloqueriez",
        "bloqueraient"
      ],
      "subjPresente": [
        "bloque",
        "bloques",
        "bloque",
        "bloquions",
        "bloquiez",
        "bloquent"
      ],
      "imperatif": [
        null,
        "bloque",
        null,
        "bloquons",
        "bloquez",
        null
      ]
    }
  },
  "brancher": {
    "g": "g1",
    "f": {
      "presente": [
        "branche",
        "branches",
        "branche",
        "branchons",
        "branchez",
        "branchent"
      ],
      "imparfait": [
        "branchais",
        "branchais",
        "branchait",
        "branchions",
        "branchiez",
        "branchaient"
      ],
      "passeCompose": [
        "ai branché",
        "as branché",
        "a branché",
        "avons branché",
        "avez branché",
        "ont branché"
      ],
      "plusQueParfait": [
        "avais branché",
        "avais branché",
        "avait branché",
        "avions branché",
        "aviez branché",
        "avaient branché"
      ],
      "futurSimple": [
        "brancherai",
        "brancheras",
        "branchera",
        "brancherons",
        "brancherez",
        "brancheront"
      ],
      "condPresente": [
        "brancherais",
        "brancherais",
        "brancherait",
        "brancherions",
        "brancheriez",
        "brancheraient"
      ],
      "subjPresente": [
        "branche",
        "branches",
        "branche",
        "branchions",
        "branchiez",
        "branchent"
      ],
      "imperatif": [
        null,
        "branche",
        null,
        "branchons",
        "branchez",
        null
      ]
    }
  },
  "débrancher": {
    "g": "g1",
    "f": {
      "presente": [
        "débranche",
        "débranches",
        "débranche",
        "débranchons",
        "débranchez",
        "débranchent"
      ],
      "imparfait": [
        "débranchais",
        "débranchais",
        "débranchait",
        "débranchions",
        "débranchiez",
        "débranchaient"
      ],
      "passeCompose": [
        "ai débranché",
        "as débranché",
        "a débranché",
        "avons débranché",
        "avez débranché",
        "ont débranché"
      ],
      "plusQueParfait": [
        "avais débranché",
        "avais débranché",
        "avait débranché",
        "avions débranché",
        "aviez débranché",
        "avaient débranché"
      ],
      "futurSimple": [
        "débrancherai",
        "débrancheras",
        "débranchera",
        "débrancherons",
        "débrancherez",
        "débrancheront"
      ],
      "condPresente": [
        "débrancherais",
        "débrancherais",
        "débrancherait",
        "débrancherions",
        "débrancheriez",
        "débrancheraient"
      ],
      "subjPresente": [
        "débranche",
        "débranches",
        "débranche",
        "débranchions",
        "débranchiez",
        "débranchent"
      ],
      "imperatif": [
        null,
        "débranche",
        null,
        "débranchons",
        "débranchez",
        null
      ]
    }
  },
  "réparer": {
    "g": "g1",
    "f": {
      "presente": [
        "répare",
        "répares",
        "répare",
        "réparons",
        "réparez",
        "réparent"
      ],
      "imparfait": [
        "réparais",
        "réparais",
        "réparait",
        "réparions",
        "répariez",
        "réparaient"
      ],
      "passeCompose": [
        "ai réparé",
        "as réparé",
        "a réparé",
        "avons réparé",
        "avez réparé",
        "ont réparé"
      ],
      "plusQueParfait": [
        "avais réparé",
        "avais réparé",
        "avait réparé",
        "avions réparé",
        "aviez réparé",
        "avaient réparé"
      ],
      "futurSimple": [
        "réparerai",
        "répareras",
        "réparera",
        "réparerons",
        "réparerez",
        "répareront"
      ],
      "condPresente": [
        "réparerais",
        "réparerais",
        "réparerait",
        "réparerions",
        "répareriez",
        "répareraient"
      ],
      "subjPresente": [
        "répare",
        "répares",
        "répare",
        "réparions",
        "répariez",
        "réparent"
      ],
      "imperatif": [
        null,
        "répare",
        null,
        "réparons",
        "réparez",
        null
      ]
    }
  },
  "construire": {
    "g": "g3re",
    "f": {
      "presente": [
        "construis",
        "construis",
        "construit",
        "construisons",
        "construisez",
        "construisent"
      ],
      "imparfait": [
        "construisais",
        "construisais",
        "construisait",
        "construisions",
        "construisiez",
        "construisaient"
      ],
      "passeCompose": [
        "ai construit",
        "as construit",
        "a construit",
        "avons construit",
        "avez construit",
        "ont construit"
      ],
      "plusQueParfait": [
        "avais construit",
        "avais construit",
        "avait construit",
        "avions construit",
        "aviez construit",
        "avaient construit"
      ],
      "futurSimple": [
        "construirai",
        "construiras",
        "construira",
        "construirons",
        "construirez",
        "construiront"
      ],
      "condPresente": [
        "construirais",
        "construirais",
        "construirait",
        "construirions",
        "construiriez",
        "construiraient"
      ],
      "subjPresente": [
        "construise",
        "construises",
        "construise",
        "construisions",
        "construisiez",
        "construisent"
      ],
      "imperatif": [
        null,
        "construis",
        null,
        "construisons",
        "construisez",
        null
      ]
    }
  },
  "planter": {
    "g": "g1",
    "f": {
      "presente": [
        "plante",
        "plantes",
        "plante",
        "plantons",
        "plantez",
        "plantent"
      ],
      "imparfait": [
        "plantais",
        "plantais",
        "plantait",
        "plantions",
        "plantiez",
        "plantaient"
      ],
      "passeCompose": [
        "ai planté",
        "as planté",
        "a planté",
        "avons planté",
        "avez planté",
        "ont planté"
      ],
      "plusQueParfait": [
        "avais planté",
        "avais planté",
        "avait planté",
        "avions planté",
        "aviez planté",
        "avaient planté"
      ],
      "futurSimple": [
        "planterai",
        "planteras",
        "plantera",
        "planterons",
        "planterez",
        "planteront"
      ],
      "condPresente": [
        "planterais",
        "planterais",
        "planterait",
        "planterions",
        "planteriez",
        "planteraient"
      ],
      "subjPresente": [
        "plante",
        "plantes",
        "plante",
        "plantions",
        "plantiez",
        "plantent"
      ],
      "imperatif": [
        null,
        "plante",
        null,
        "plantons",
        "plantez",
        null
      ]
    }
  },
  "arroser": {
    "g": "g1",
    "f": {
      "presente": [
        "arrose",
        "arroses",
        "arrose",
        "arrosons",
        "arrosez",
        "arrosent"
      ],
      "imparfait": [
        "arrosais",
        "arrosais",
        "arrosait",
        "arrosions",
        "arrosiez",
        "arrosaient"
      ],
      "passeCompose": [
        "ai arrosé",
        "as arrosé",
        "a arrosé",
        "avons arrosé",
        "avez arrosé",
        "ont arrosé"
      ],
      "plusQueParfait": [
        "avais arrosé",
        "avais arrosé",
        "avait arrosé",
        "avions arrosé",
        "aviez arrosé",
        "avaient arrosé"
      ],
      "futurSimple": [
        "arroserai",
        "arroseras",
        "arrosera",
        "arroserons",
        "arroserez",
        "arroseront"
      ],
      "condPresente": [
        "arroserais",
        "arroserais",
        "arroserait",
        "arroserions",
        "arroseriez",
        "arroseraient"
      ],
      "subjPresente": [
        "arrose",
        "arroses",
        "arrose",
        "arrosions",
        "arrosiez",
        "arrosent"
      ],
      "imperatif": [
        null,
        "arrose",
        null,
        "arrosons",
        "arrosez",
        null
      ]
    }
  },
  "couper": {
    "g": "g1",
    "f": {
      "presente": [
        "coupe",
        "coupes",
        "coupe",
        "coupons",
        "coupez",
        "coupent"
      ],
      "imparfait": [
        "coupais",
        "coupais",
        "coupait",
        "coupions",
        "coupiez",
        "coupaient"
      ],
      "passeCompose": [
        "ai coupé",
        "as coupé",
        "a coupé",
        "avons coupé",
        "avez coupé",
        "ont coupé"
      ],
      "plusQueParfait": [
        "avais coupé",
        "avais coupé",
        "avait coupé",
        "avions coupé",
        "aviez coupé",
        "avaient coupé"
      ],
      "futurSimple": [
        "couperai",
        "couperas",
        "coupera",
        "couperons",
        "couperez",
        "couperont"
      ],
      "condPresente": [
        "couperais",
        "couperais",
        "couperait",
        "couperions",
        "couperiez",
        "couperaient"
      ],
      "subjPresente": [
        "coupe",
        "coupes",
        "coupe",
        "coupions",
        "coupiez",
        "coupent"
      ],
      "imperatif": [
        null,
        "coupe",
        null,
        "coupons",
        "coupez",
        null
      ]
    }
  },
  "sécher": {
    "g": "g1",
    "f": {
      "presente": [
        "sèche",
        "sèches",
        "sèche",
        "séchons",
        "séchez",
        "sèchent"
      ],
      "imparfait": [
        "séchais",
        "séchais",
        "séchait",
        "séchions",
        "séchiez",
        "séchaient"
      ],
      "passeCompose": [
        "ai séché",
        "as séché",
        "a séché",
        "avons séché",
        "avez séché",
        "ont séché"
      ],
      "plusQueParfait": [
        "avais séché",
        "avais séché",
        "avait séché",
        "avions séché",
        "aviez séché",
        "avaient séché"
      ],
      "futurSimple": [
        "sécherai",
        "sécheras",
        "séchera",
        "sécherons",
        "sécherez",
        "sécheront"
      ],
      "condPresente": [
        "sécherais",
        "sécherais",
        "sécherait",
        "sécherions",
        "sécheriez",
        "sécheraient"
      ],
      "subjPresente": [
        "sèche",
        "sèches",
        "sèche",
        "séchions",
        "séchiez",
        "sèchent"
      ],
      "imperatif": [
        null,
        "sèche",
        null,
        "séchons",
        "séchez",
        null
      ]
    }
  },
  "plier": {
    "g": "g1",
    "f": {
      "presente": [
        "plie",
        "plies",
        "plie",
        "plions",
        "pliez",
        "plient"
      ],
      "imparfait": [
        "pliais",
        "pliais",
        "pliait",
        "pliions",
        "pliiez",
        "pliaient"
      ],
      "passeCompose": [
        "ai plié",
        "as plié",
        "a plié",
        "avons plié",
        "avez plié",
        "ont plié"
      ],
      "plusQueParfait": [
        "avais plié",
        "avais plié",
        "avait plié",
        "avions plié",
        "aviez plié",
        "avaient plié"
      ],
      "futurSimple": [
        "plierai",
        "plieras",
        "pliera",
        "plierons",
        "plierez",
        "plieront"
      ],
      "condPresente": [
        "plierais",
        "plierais",
        "plierait",
        "plierions",
        "plieriez",
        "plieraient"
      ],
      "subjPresente": [
        "plie",
        "plies",
        "plie",
        "pliions",
        "pliiez",
        "plient"
      ],
      "imperatif": [
        null,
        "plie",
        null,
        "plions",
        "pliez",
        null
      ]
    }
  },
  "déranger": {
    "g": "g1",
    "f": {
      "presente": [
        "dérange",
        "déranges",
        "dérange",
        "dérangeons",
        "dérangez",
        "dérangent"
      ],
      "imparfait": [
        "dérangeais",
        "dérangeais",
        "dérangeait",
        "dérangions",
        "dérangiez",
        "dérangeaient"
      ],
      "passeCompose": [
        "ai dérangé",
        "as dérangé",
        "a dérangé",
        "avons dérangé",
        "avez dérangé",
        "ont dérangé"
      ],
      "plusQueParfait": [
        "avais dérangé",
        "avais dérangé",
        "avait dérangé",
        "avions dérangé",
        "aviez dérangé",
        "avaient dérangé"
      ],
      "futurSimple": [
        "dérangerai",
        "dérangeras",
        "dérangera",
        "dérangerons",
        "dérangerez",
        "dérangeront"
      ],
      "condPresente": [
        "dérangerais",
        "dérangerais",
        "dérangerait",
        "dérangerions",
        "dérangeriez",
        "dérangeraient"
      ],
      "subjPresente": [
        "dérange",
        "déranges",
        "dérange",
        "dérangions",
        "dérangiez",
        "dérangent"
      ],
      "imperatif": [
        null,
        "dérange",
        null,
        "dérangeons",
        "dérangez",
        null
      ]
    }
  },
  "emballer": {
    "g": "g1",
    "f": {
      "presente": [
        "emballe",
        "emballes",
        "emballe",
        "emballons",
        "emballez",
        "emballent"
      ],
      "imparfait": [
        "emballais",
        "emballais",
        "emballait",
        "emballions",
        "emballiez",
        "emballaient"
      ],
      "passeCompose": [
        "ai emballé",
        "as emballé",
        "a emballé",
        "avons emballé",
        "avez emballé",
        "ont emballé"
      ],
      "plusQueParfait": [
        "avais emballé",
        "avais emballé",
        "avait emballé",
        "avions emballé",
        "aviez emballé",
        "avaient emballé"
      ],
      "futurSimple": [
        "emballerai",
        "emballeras",
        "emballera",
        "emballerons",
        "emballerez",
        "emballeront"
      ],
      "condPresente": [
        "emballerais",
        "emballerais",
        "emballerait",
        "emballerions",
        "emballeriez",
        "emballeraient"
      ],
      "subjPresente": [
        "emballe",
        "emballes",
        "emballe",
        "emballions",
        "emballiez",
        "emballent"
      ],
      "imperatif": [
        null,
        "emballe",
        null,
        "emballons",
        "emballez",
        null
      ]
    }
  },
  "déballer": {
    "g": "g1",
    "f": {
      "presente": [
        "déballe",
        "déballes",
        "déballe",
        "déballons",
        "déballez",
        "déballent"
      ],
      "imparfait": [
        "déballais",
        "déballais",
        "déballait",
        "déballions",
        "déballiez",
        "déballaient"
      ],
      "passeCompose": [
        "ai déballé",
        "as déballé",
        "a déballé",
        "avons déballé",
        "avez déballé",
        "ont déballé"
      ],
      "plusQueParfait": [
        "avais déballé",
        "avais déballé",
        "avait déballé",
        "avions déballé",
        "aviez déballé",
        "avaient déballé"
      ],
      "futurSimple": [
        "déballerai",
        "déballeras",
        "déballera",
        "déballerons",
        "déballerez",
        "déballeront"
      ],
      "condPresente": [
        "déballerais",
        "déballerais",
        "déballerait",
        "déballerions",
        "déballeriez",
        "déballeraient"
      ],
      "subjPresente": [
        "déballe",
        "déballes",
        "déballe",
        "déballions",
        "déballiez",
        "déballent"
      ],
      "imperatif": [
        null,
        "déballe",
        null,
        "déballons",
        "déballez",
        null
      ]
    }
  },
  "finir": {
    "g": "g2",
    "f": {
      "presente": [
        "finis",
        "finis",
        "finit",
        "finissons",
        "finissez",
        "finissent"
      ],
      "imparfait": [
        "finissais",
        "finissais",
        "finissait",
        "finissions",
        "finissiez",
        "finissaient"
      ],
      "passeCompose": [
        "ai fini",
        "as fini",
        "a fini",
        "avons fini",
        "avez fini",
        "ont fini"
      ],
      "plusQueParfait": [
        "avais fini",
        "avais fini",
        "avait fini",
        "avions fini",
        "aviez fini",
        "avaient fini"
      ],
      "futurSimple": [
        "finirai",
        "finiras",
        "finira",
        "finirons",
        "finirez",
        "finiront"
      ],
      "condPresente": [
        "finirais",
        "finirais",
        "finirait",
        "finirions",
        "finiriez",
        "finiraient"
      ],
      "subjPresente": [
        "finisse",
        "finisses",
        "finisse",
        "finissions",
        "finissiez",
        "finissent"
      ],
      "imperatif": [
        null,
        "finis",
        null,
        "finissons",
        "finissez",
        null
      ]
    }
  },
  "choisir": {
    "g": "g2",
    "f": {
      "presente": [
        "choisis",
        "choisis",
        "choisit",
        "choisissons",
        "choisissez",
        "choisissent"
      ],
      "imparfait": [
        "choisissais",
        "choisissais",
        "choisissait",
        "choisissions",
        "choisissiez",
        "choisissaient"
      ],
      "passeCompose": [
        "ai choisi",
        "as choisi",
        "a choisi",
        "avons choisi",
        "avez choisi",
        "ont choisi"
      ],
      "plusQueParfait": [
        "avais choisi",
        "avais choisi",
        "avait choisi",
        "avions choisi",
        "aviez choisi",
        "avaient choisi"
      ],
      "futurSimple": [
        "choisirai",
        "choisiras",
        "choisira",
        "choisirons",
        "choisirez",
        "choisiront"
      ],
      "condPresente": [
        "choisirais",
        "choisirais",
        "choisirait",
        "choisirions",
        "choisiriez",
        "choisiraient"
      ],
      "subjPresente": [
        "choisisse",
        "choisisses",
        "choisisse",
        "choisissions",
        "choisissiez",
        "choisissent"
      ],
      "imperatif": [
        null,
        "choisis",
        null,
        "choisissons",
        "choisissez",
        null
      ]
    }
  },
  "réussir": {
    "g": "g2",
    "f": {
      "presente": [
        "réussis",
        "réussis",
        "réussit",
        "réussissons",
        "réussissez",
        "réussissent"
      ],
      "imparfait": [
        "réussissais",
        "réussissais",
        "réussissait",
        "réussissions",
        "réussissiez",
        "réussissaient"
      ],
      "passeCompose": [
        "ai réussi",
        "as réussi",
        "a réussi",
        "avons réussi",
        "avez réussi",
        "ont réussi"
      ],
      "plusQueParfait": [
        "avais réussi",
        "avais réussi",
        "avait réussi",
        "avions réussi",
        "aviez réussi",
        "avaient réussi"
      ],
      "futurSimple": [
        "réussirai",
        "réussiras",
        "réussira",
        "réussirons",
        "réussirez",
        "réussiront"
      ],
      "condPresente": [
        "réussirais",
        "réussirais",
        "réussirait",
        "réussirions",
        "réussiriez",
        "réussiraient"
      ],
      "subjPresente": [
        "réussisse",
        "réussisses",
        "réussisse",
        "réussissions",
        "réussissiez",
        "réussissent"
      ],
      "imperatif": [
        null,
        "réussis",
        null,
        "réussissons",
        "réussissez",
        null
      ]
    }
  },
  "remplir": {
    "g": "g2",
    "f": {
      "presente": [
        "remplis",
        "remplis",
        "remplit",
        "remplissons",
        "remplissez",
        "remplissent"
      ],
      "imparfait": [
        "remplissais",
        "remplissais",
        "remplissait",
        "remplissions",
        "remplissiez",
        "remplissaient"
      ],
      "passeCompose": [
        "ai rempli",
        "as rempli",
        "a rempli",
        "avons rempli",
        "avez rempli",
        "ont rempli"
      ],
      "plusQueParfait": [
        "avais rempli",
        "avais rempli",
        "avait rempli",
        "avions rempli",
        "aviez rempli",
        "avaient rempli"
      ],
      "futurSimple": [
        "remplirai",
        "rempliras",
        "remplira",
        "remplirons",
        "remplirez",
        "rempliront"
      ],
      "condPresente": [
        "remplirais",
        "remplirais",
        "remplirait",
        "remplirions",
        "rempliriez",
        "rempliraient"
      ],
      "subjPresente": [
        "remplisse",
        "remplisses",
        "remplisse",
        "remplissions",
        "remplissiez",
        "remplissent"
      ],
      "imperatif": [
        null,
        "remplis",
        null,
        "remplissons",
        "remplissez",
        null
      ]
    }
  },
  "grandir": {
    "g": "g2",
    "f": {
      "presente": [
        "grandis",
        "grandis",
        "grandit",
        "grandissons",
        "grandissez",
        "grandissent"
      ],
      "imparfait": [
        "grandissais",
        "grandissais",
        "grandissait",
        "grandissions",
        "grandissiez",
        "grandissaient"
      ],
      "passeCompose": [
        "ai grandi",
        "as grandi",
        "a grandi",
        "avons grandi",
        "avez grandi",
        "ont grandi"
      ],
      "plusQueParfait": [
        "avais grandi",
        "avais grandi",
        "avait grandi",
        "avions grandi",
        "aviez grandi",
        "avaient grandi"
      ],
      "futurSimple": [
        "grandirai",
        "grandiras",
        "grandira",
        "grandirons",
        "grandirez",
        "grandiront"
      ],
      "condPresente": [
        "grandirais",
        "grandirais",
        "grandirait",
        "grandirions",
        "grandiriez",
        "grandiraient"
      ],
      "subjPresente": [
        "grandisse",
        "grandisses",
        "grandisse",
        "grandissions",
        "grandissiez",
        "grandissent"
      ],
      "imperatif": [
        null,
        "grandis",
        null,
        "grandissons",
        "grandissez",
        null
      ]
    }
  },
  "grossir": {
    "g": "g2",
    "f": {
      "presente": [
        "grossis",
        "grossis",
        "grossit",
        "grossissons",
        "grossissez",
        "grossissent"
      ],
      "imparfait": [
        "grossissais",
        "grossissais",
        "grossissait",
        "grossissions",
        "grossissiez",
        "grossissaient"
      ],
      "passeCompose": [
        "ai grossi",
        "as grossi",
        "a grossi",
        "avons grossi",
        "avez grossi",
        "ont grossi"
      ],
      "plusQueParfait": [
        "avais grossi",
        "avais grossi",
        "avait grossi",
        "avions grossi",
        "aviez grossi",
        "avaient grossi"
      ],
      "futurSimple": [
        "grossirai",
        "grossiras",
        "grossira",
        "grossirons",
        "grossirez",
        "grossiront"
      ],
      "condPresente": [
        "grossirais",
        "grossirais",
        "grossirait",
        "grossirions",
        "grossiriez",
        "grossiraient"
      ],
      "subjPresente": [
        "grossisse",
        "grossisses",
        "grossisse",
        "grossissions",
        "grossissiez",
        "grossissent"
      ],
      "imperatif": [
        null,
        "grossis",
        null,
        "grossissons",
        "grossissez",
        null
      ]
    }
  },
  "maigrir": {
    "g": "g2",
    "f": {
      "presente": [
        "maigris",
        "maigris",
        "maigrit",
        "maigrissons",
        "maigrissez",
        "maigrissent"
      ],
      "imparfait": [
        "maigrissais",
        "maigrissais",
        "maigrissait",
        "maigrissions",
        "maigrissiez",
        "maigrissaient"
      ],
      "passeCompose": [
        "ai maigri",
        "as maigri",
        "a maigri",
        "avons maigri",
        "avez maigri",
        "ont maigri"
      ],
      "plusQueParfait": [
        "avais maigri",
        "avais maigri",
        "avait maigri",
        "avions maigri",
        "aviez maigri",
        "avaient maigri"
      ],
      "futurSimple": [
        "maigrirai",
        "maigriras",
        "maigrira",
        "maigrirons",
        "maigrirez",
        "maigriront"
      ],
      "condPresente": [
        "maigrirais",
        "maigrirais",
        "maigrirait",
        "maigririons",
        "maigririez",
        "maigriraient"
      ],
      "subjPresente": [
        "maigrisse",
        "maigrisses",
        "maigrisse",
        "maigrissions",
        "maigrissiez",
        "maigrissent"
      ],
      "imperatif": [
        null,
        "maigris",
        null,
        "maigrissons",
        "maigrissez",
        null
      ]
    }
  },
  "vieillir": {
    "g": "g2",
    "f": {
      "presente": [
        "vieillis",
        "vieillis",
        "vieillit",
        "vieillissons",
        "vieillissez",
        "vieillissent"
      ],
      "imparfait": [
        "vieillissais",
        "vieillissais",
        "vieillissait",
        "vieillissions",
        "vieillissiez",
        "vieillissaient"
      ],
      "passeCompose": [
        "ai vieilli",
        "as vieilli",
        "a vieilli",
        "avons vieilli",
        "avez vieilli",
        "ont vieilli"
      ],
      "plusQueParfait": [
        "avais vieilli",
        "avais vieilli",
        "avait vieilli",
        "avions vieilli",
        "aviez vieilli",
        "avaient vieilli"
      ],
      "futurSimple": [
        "vieillirai",
        "vieilliras",
        "vieillira",
        "vieillirons",
        "vieillirez",
        "vieilliront"
      ],
      "condPresente": [
        "vieillirais",
        "vieillirais",
        "vieillirait",
        "vieillirions",
        "vieilliriez",
        "vieilliraient"
      ],
      "subjPresente": [
        "vieillisse",
        "vieillisses",
        "vieillisse",
        "vieillissions",
        "vieillissiez",
        "vieillissent"
      ],
      "imperatif": [
        null,
        "vieillis",
        null,
        "vieillissons",
        "vieillissez",
        null
      ]
    }
  },
  "rougir": {
    "g": "g2",
    "f": {
      "presente": [
        "rougis",
        "rougis",
        "rougit",
        "rougissons",
        "rougissez",
        "rougissent"
      ],
      "imparfait": [
        "rougissais",
        "rougissais",
        "rougissait",
        "rougissions",
        "rougissiez",
        "rougissaient"
      ],
      "passeCompose": [
        "ai rougi",
        "as rougi",
        "a rougi",
        "avons rougi",
        "avez rougi",
        "ont rougi"
      ],
      "plusQueParfait": [
        "avais rougi",
        "avais rougi",
        "avait rougi",
        "avions rougi",
        "aviez rougi",
        "avaient rougi"
      ],
      "futurSimple": [
        "rougirai",
        "rougiras",
        "rougira",
        "rougirons",
        "rougirez",
        "rougiront"
      ],
      "condPresente": [
        "rougirais",
        "rougirais",
        "rougirait",
        "rougirions",
        "rougiriez",
        "rougiraient"
      ],
      "subjPresente": [
        "rougisse",
        "rougisses",
        "rougisse",
        "rougissions",
        "rougissiez",
        "rougissent"
      ],
      "imperatif": [
        null,
        "rougis",
        null,
        "rougissons",
        "rougissez",
        null
      ]
    }
  },
  "pâlir": {
    "g": "g2",
    "f": {
      "presente": [
        "pâlis",
        "pâlis",
        "pâlit",
        "pâlissons",
        "pâlissez",
        "pâlissent"
      ],
      "imparfait": [
        "pâlissais",
        "pâlissais",
        "pâlissait",
        "pâlissions",
        "pâlissiez",
        "pâlissaient"
      ],
      "passeCompose": [
        "ai pâli",
        "as pâli",
        "a pâli",
        "avons pâli",
        "avez pâli",
        "ont pâli"
      ],
      "plusQueParfait": [
        "avais pâli",
        "avais pâli",
        "avait pâli",
        "avions pâli",
        "aviez pâli",
        "avaient pâli"
      ],
      "futurSimple": [
        "pâlirai",
        "pâliras",
        "pâlira",
        "pâlirons",
        "pâlirez",
        "pâliront"
      ],
      "condPresente": [
        "pâlirais",
        "pâlirais",
        "pâlirait",
        "pâlirions",
        "pâliriez",
        "pâliraient"
      ],
      "subjPresente": [
        "pâlisse",
        "pâlisses",
        "pâlisse",
        "pâlissions",
        "pâlissiez",
        "pâlissent"
      ],
      "imperatif": [
        null,
        "pâlis",
        null,
        "pâlissons",
        "pâlissez",
        null
      ]
    }
  },
  "réfléchir": {
    "g": "g2",
    "f": {
      "presente": [
        "réfléchis",
        "réfléchis",
        "réfléchit",
        "réfléchissons",
        "réfléchissez",
        "réfléchissent"
      ],
      "imparfait": [
        "réfléchissais",
        "réfléchissais",
        "réfléchissait",
        "réfléchissions",
        "réfléchissiez",
        "réfléchissaient"
      ],
      "passeCompose": [
        "ai réfléchi",
        "as réfléchi",
        "a réfléchi",
        "avons réfléchi",
        "avez réfléchi",
        "ont réfléchi"
      ],
      "plusQueParfait": [
        "avais réfléchi",
        "avais réfléchi",
        "avait réfléchi",
        "avions réfléchi",
        "aviez réfléchi",
        "avaient réfléchi"
      ],
      "futurSimple": [
        "réfléchirai",
        "réfléchiras",
        "réfléchira",
        "réfléchirons",
        "réfléchirez",
        "réfléchiront"
      ],
      "condPresente": [
        "réfléchirais",
        "réfléchirais",
        "réfléchirait",
        "réfléchirions",
        "réfléchiriez",
        "réfléchiraient"
      ],
      "subjPresente": [
        "réfléchisse",
        "réfléchisses",
        "réfléchisse",
        "réfléchissions",
        "réfléchissiez",
        "réfléchissent"
      ],
      "imperatif": [
        null,
        "réfléchis",
        null,
        "réfléchissons",
        "réfléchissez",
        null
      ]
    }
  },
  "obéir": {
    "g": "g2",
    "f": {
      "presente": [
        "obéis",
        "obéis",
        "obéit",
        "obéissons",
        "obéissez",
        "obéissent"
      ],
      "imparfait": [
        "obéissais",
        "obéissais",
        "obéissait",
        "obéissions",
        "obéissiez",
        "obéissaient"
      ],
      "passeCompose": [
        "ai obéi",
        "as obéi",
        "a obéi",
        "avons obéi",
        "avez obéi",
        "ont obéi"
      ],
      "plusQueParfait": [
        "avais obéi",
        "avais obéi",
        "avait obéi",
        "avions obéi",
        "aviez obéi",
        "avaient obéi"
      ],
      "futurSimple": [
        "obéirai",
        "obéiras",
        "obéira",
        "obéirons",
        "obéirez",
        "obéiront"
      ],
      "condPresente": [
        "obéirais",
        "obéirais",
        "obéirait",
        "obéirions",
        "obéiriez",
        "obéiraient"
      ],
      "subjPresente": [
        "obéisse",
        "obéisses",
        "obéisse",
        "obéissions",
        "obéissiez",
        "obéissent"
      ],
      "imperatif": [
        null,
        "obéis",
        null,
        "obéissons",
        "obéissez",
        null
      ]
    }
  },
  "punir": {
    "g": "g2",
    "f": {
      "presente": [
        "punis",
        "punis",
        "punit",
        "punissons",
        "punissez",
        "punissent"
      ],
      "imparfait": [
        "punissais",
        "punissais",
        "punissait",
        "punissions",
        "punissiez",
        "punissaient"
      ],
      "passeCompose": [
        "ai puni",
        "as puni",
        "a puni",
        "avons puni",
        "avez puni",
        "ont puni"
      ],
      "plusQueParfait": [
        "avais puni",
        "avais puni",
        "avait puni",
        "avions puni",
        "aviez puni",
        "avaient puni"
      ],
      "futurSimple": [
        "punirai",
        "puniras",
        "punira",
        "punirons",
        "punirez",
        "puniront"
      ],
      "condPresente": [
        "punirais",
        "punirais",
        "punirait",
        "punirions",
        "puniriez",
        "puniraient"
      ],
      "subjPresente": [
        "punisse",
        "punisses",
        "punisse",
        "punissions",
        "punissiez",
        "punissent"
      ],
      "imperatif": [
        null,
        "punis",
        null,
        "punissons",
        "punissez",
        null
      ]
    }
  },
  "avertir": {
    "g": "g2",
    "f": {
      "presente": [
        "avertis",
        "avertis",
        "avertit",
        "avertissons",
        "avertissez",
        "avertissent"
      ],
      "imparfait": [
        "avertissais",
        "avertissais",
        "avertissait",
        "avertissions",
        "avertissiez",
        "avertissaient"
      ],
      "passeCompose": [
        "ai averti",
        "as averti",
        "a averti",
        "avons averti",
        "avez averti",
        "ont averti"
      ],
      "plusQueParfait": [
        "avais averti",
        "avais averti",
        "avait averti",
        "avions averti",
        "aviez averti",
        "avaient averti"
      ],
      "futurSimple": [
        "avertirai",
        "avertiras",
        "avertira",
        "avertirons",
        "avertirez",
        "avertiront"
      ],
      "condPresente": [
        "avertirais",
        "avertirais",
        "avertirait",
        "avertirions",
        "avertiriez",
        "avertiraient"
      ],
      "subjPresente": [
        "avertisse",
        "avertisses",
        "avertisse",
        "avertissions",
        "avertissiez",
        "avertissent"
      ],
      "imperatif": [
        null,
        "avertis",
        null,
        "avertissons",
        "avertissez",
        null
      ]
    }
  },
  "établir": {
    "g": "g2",
    "f": {
      "presente": [
        "établis",
        "établis",
        "établit",
        "établissons",
        "établissez",
        "établissent"
      ],
      "imparfait": [
        "établissais",
        "établissais",
        "établissait",
        "établissions",
        "établissiez",
        "établissaient"
      ],
      "passeCompose": [
        "ai établi",
        "as établi",
        "a établi",
        "avons établi",
        "avez établi",
        "ont établi"
      ],
      "plusQueParfait": [
        "avais établi",
        "avais établi",
        "avait établi",
        "avions établi",
        "aviez établi",
        "avaient établi"
      ],
      "futurSimple": [
        "établirai",
        "établiras",
        "établira",
        "établirons",
        "établirez",
        "établiront"
      ],
      "condPresente": [
        "établirais",
        "établirais",
        "établirait",
        "établirions",
        "établiriez",
        "établiraient"
      ],
      "subjPresente": [
        "établisse",
        "établisses",
        "établisse",
        "établissions",
        "établissiez",
        "établissent"
      ],
      "imperatif": [
        null,
        "établis",
        null,
        "établissons",
        "établissez",
        null
      ]
    }
  },
  "fournir": {
    "g": "g2",
    "f": {
      "presente": [
        "fournis",
        "fournis",
        "fournit",
        "fournissons",
        "fournissez",
        "fournissent"
      ],
      "imparfait": [
        "fournissais",
        "fournissais",
        "fournissait",
        "fournissions",
        "fournissiez",
        "fournissaient"
      ],
      "passeCompose": [
        "ai fourni",
        "as fourni",
        "a fourni",
        "avons fourni",
        "avez fourni",
        "ont fourni"
      ],
      "plusQueParfait": [
        "avais fourni",
        "avais fourni",
        "avait fourni",
        "avions fourni",
        "aviez fourni",
        "avaient fourni"
      ],
      "futurSimple": [
        "fournirai",
        "fourniras",
        "fournira",
        "fournirons",
        "fournirez",
        "fourniront"
      ],
      "condPresente": [
        "fournirais",
        "fournirais",
        "fournirait",
        "fournirions",
        "fourniriez",
        "fourniraient"
      ],
      "subjPresente": [
        "fournisse",
        "fournisses",
        "fournisse",
        "fournissions",
        "fournissiez",
        "fournissent"
      ],
      "imperatif": [
        null,
        "fournis",
        null,
        "fournissons",
        "fournissez",
        null
      ]
    }
  },
  "guérir": {
    "g": "g2",
    "f": {
      "presente": [
        "guéris",
        "guéris",
        "guérit",
        "guérissons",
        "guérissez",
        "guérissent"
      ],
      "imparfait": [
        "guérissais",
        "guérissais",
        "guérissait",
        "guérissions",
        "guérissiez",
        "guérissaient"
      ],
      "passeCompose": [
        "ai guéri",
        "as guéri",
        "a guéri",
        "avons guéri",
        "avez guéri",
        "ont guéri"
      ],
      "plusQueParfait": [
        "avais guéri",
        "avais guéri",
        "avait guéri",
        "avions guéri",
        "aviez guéri",
        "avaient guéri"
      ],
      "futurSimple": [
        "guérirai",
        "guériras",
        "guérira",
        "guérirons",
        "guérirez",
        "guériront"
      ],
      "condPresente": [
        "guérirais",
        "guérirais",
        "guérirait",
        "guéririons",
        "guéririez",
        "guériraient"
      ],
      "subjPresente": [
        "guérisse",
        "guérisses",
        "guérisse",
        "guérissions",
        "guérissiez",
        "guérissent"
      ],
      "imperatif": [
        null,
        "guéris",
        null,
        "guérissons",
        "guérissez",
        null
      ]
    }
  },
  "nourrir": {
    "g": "g2",
    "f": {
      "presente": [
        "nourris",
        "nourris",
        "nourrit",
        "nourrissons",
        "nourrissez",
        "nourrissent"
      ],
      "imparfait": [
        "nourrissais",
        "nourrissais",
        "nourrissait",
        "nourrissions",
        "nourrissiez",
        "nourrissaient"
      ],
      "passeCompose": [
        "ai nourri",
        "as nourri",
        "a nourri",
        "avons nourri",
        "avez nourri",
        "ont nourri"
      ],
      "plusQueParfait": [
        "avais nourri",
        "avais nourri",
        "avait nourri",
        "avions nourri",
        "aviez nourri",
        "avaient nourri"
      ],
      "futurSimple": [
        "nourrirai",
        "nourriras",
        "nourrira",
        "nourrirons",
        "nourrirez",
        "nourriront"
      ],
      "condPresente": [
        "nourrirais",
        "nourrirais",
        "nourrirait",
        "nourririons",
        "nourririez",
        "nourriraient"
      ],
      "subjPresente": [
        "nourrisse",
        "nourrisses",
        "nourrisse",
        "nourrissions",
        "nourrissiez",
        "nourrissent"
      ],
      "imperatif": [
        null,
        "nourris",
        null,
        "nourrissons",
        "nourrissez",
        null
      ]
    }
  },
  "saisir": {
    "g": "g2",
    "f": {
      "presente": [
        "saisis",
        "saisis",
        "saisit",
        "saisissons",
        "saisissez",
        "saisissent"
      ],
      "imparfait": [
        "saisissais",
        "saisissais",
        "saisissait",
        "saisissions",
        "saisissiez",
        "saisissaient"
      ],
      "passeCompose": [
        "ai saisi",
        "as saisi",
        "a saisi",
        "avons saisi",
        "avez saisi",
        "ont saisi"
      ],
      "plusQueParfait": [
        "avais saisi",
        "avais saisi",
        "avait saisi",
        "avions saisi",
        "aviez saisi",
        "avaient saisi"
      ],
      "futurSimple": [
        "saisirai",
        "saisiras",
        "saisira",
        "saisirons",
        "saisirez",
        "saisiront"
      ],
      "condPresente": [
        "saisirais",
        "saisirais",
        "saisirait",
        "saisirions",
        "saisiriez",
        "saisiraient"
      ],
      "subjPresente": [
        "saisisse",
        "saisisses",
        "saisisse",
        "saisissions",
        "saisissiez",
        "saisissent"
      ],
      "imperatif": [
        null,
        "saisis",
        null,
        "saisissons",
        "saisissez",
        null
      ]
    }
  },
  "agir": {
    "g": "g2",
    "f": {
      "presente": [
        "agis",
        "agis",
        "agit",
        "agissons",
        "agissez",
        "agissent"
      ],
      "imparfait": [
        "agissais",
        "agissais",
        "agissait",
        "agissions",
        "agissiez",
        "agissaient"
      ],
      "passeCompose": [
        "ai agi",
        "as agi",
        "a agi",
        "avons agi",
        "avez agi",
        "ont agi"
      ],
      "plusQueParfait": [
        "avais agi",
        "avais agi",
        "avait agi",
        "avions agi",
        "aviez agi",
        "avaient agi"
      ],
      "futurSimple": [
        "agirai",
        "agiras",
        "agira",
        "agirons",
        "agirez",
        "agiront"
      ],
      "condPresente": [
        "agirais",
        "agirais",
        "agirait",
        "agirions",
        "agiriez",
        "agiraient"
      ],
      "subjPresente": [
        "agisse",
        "agisses",
        "agisse",
        "agissions",
        "agissiez",
        "agissent"
      ],
      "imperatif": [
        null,
        "agis",
        null,
        "agissons",
        "agissez",
        null
      ]
    }
  },
  "bâtir": {
    "g": "g2",
    "f": {
      "presente": [
        "bâtis",
        "bâtis",
        "bâtit",
        "bâtissons",
        "bâtissez",
        "bâtissent"
      ],
      "imparfait": [
        "bâtissais",
        "bâtissais",
        "bâtissait",
        "bâtissions",
        "bâtissiez",
        "bâtissaient"
      ],
      "passeCompose": [
        "ai bâti",
        "as bâti",
        "a bâti",
        "avons bâti",
        "avez bâti",
        "ont bâti"
      ],
      "plusQueParfait": [
        "avais bâti",
        "avais bâti",
        "avait bâti",
        "avions bâti",
        "aviez bâti",
        "avaient bâti"
      ],
      "futurSimple": [
        "bâtirai",
        "bâtiras",
        "bâtira",
        "bâtirons",
        "bâtirez",
        "bâtiront"
      ],
      "condPresente": [
        "bâtirais",
        "bâtirais",
        "bâtirait",
        "bâtirions",
        "bâtiriez",
        "bâtiraient"
      ],
      "subjPresente": [
        "bâtisse",
        "bâtisses",
        "bâtisse",
        "bâtissions",
        "bâtissiez",
        "bâtissent"
      ],
      "imperatif": [
        null,
        "bâtis",
        null,
        "bâtissons",
        "bâtissez",
        null
      ]
    }
  },
  "ralentir": {
    "g": "g2",
    "f": {
      "presente": [
        "ralentis",
        "ralentis",
        "ralentit",
        "ralentissons",
        "ralentissez",
        "ralentissent"
      ],
      "imparfait": [
        "ralentissais",
        "ralentissais",
        "ralentissait",
        "ralentissions",
        "ralentissiez",
        "ralentissaient"
      ],
      "passeCompose": [
        "ai ralenti",
        "as ralenti",
        "a ralenti",
        "avons ralenti",
        "avez ralenti",
        "ont ralenti"
      ],
      "plusQueParfait": [
        "avais ralenti",
        "avais ralenti",
        "avait ralenti",
        "avions ralenti",
        "aviez ralenti",
        "avaient ralenti"
      ],
      "futurSimple": [
        "ralentirai",
        "ralentiras",
        "ralentira",
        "ralentirons",
        "ralentirez",
        "ralentiront"
      ],
      "condPresente": [
        "ralentirais",
        "ralentirais",
        "ralentirait",
        "ralentirions",
        "ralentiriez",
        "ralentiraient"
      ],
      "subjPresente": [
        "ralentisse",
        "ralentisses",
        "ralentisse",
        "ralentissions",
        "ralentissiez",
        "ralentissent"
      ],
      "imperatif": [
        null,
        "ralentis",
        null,
        "ralentissons",
        "ralentissez",
        null
      ]
    }
  },
  "accomplir": {
    "g": "g2",
    "f": {
      "presente": [
        "accomplis",
        "accomplis",
        "accomplit",
        "accomplissons",
        "accomplissez",
        "accomplissent"
      ],
      "imparfait": [
        "accomplissais",
        "accomplissais",
        "accomplissait",
        "accomplissions",
        "accomplissiez",
        "accomplissaient"
      ],
      "passeCompose": [
        "ai accompli",
        "as accompli",
        "a accompli",
        "avons accompli",
        "avez accompli",
        "ont accompli"
      ],
      "plusQueParfait": [
        "avais accompli",
        "avais accompli",
        "avait accompli",
        "avions accompli",
        "aviez accompli",
        "avaient accompli"
      ],
      "futurSimple": [
        "accomplirai",
        "accompliras",
        "accomplira",
        "accomplirons",
        "accomplirez",
        "accompliront"
      ],
      "condPresente": [
        "accomplirais",
        "accomplirais",
        "accomplirait",
        "accomplirions",
        "accompliriez",
        "accompliraient"
      ],
      "subjPresente": [
        "accomplisse",
        "accomplisses",
        "accomplisse",
        "accomplissions",
        "accomplissiez",
        "accomplissent"
      ],
      "imperatif": [
        null,
        "accomplis",
        null,
        "accomplissons",
        "accomplissez",
        null
      ]
    }
  },
  "applaudir": {
    "g": "g2",
    "f": {
      "presente": [
        "applaudis",
        "applaudis",
        "applaudit",
        "applaudissons",
        "applaudissez",
        "applaudissent"
      ],
      "imparfait": [
        "applaudissais",
        "applaudissais",
        "applaudissait",
        "applaudissions",
        "applaudissiez",
        "applaudissaient"
      ],
      "passeCompose": [
        "ai applaudi",
        "as applaudi",
        "a applaudi",
        "avons applaudi",
        "avez applaudi",
        "ont applaudi"
      ],
      "plusQueParfait": [
        "avais applaudi",
        "avais applaudi",
        "avait applaudi",
        "avions applaudi",
        "aviez applaudi",
        "avaient applaudi"
      ],
      "futurSimple": [
        "applaudirai",
        "applaudiras",
        "applaudira",
        "applaudirons",
        "applaudirez",
        "applaudiront"
      ],
      "condPresente": [
        "applaudirais",
        "applaudirais",
        "applaudirait",
        "applaudirions",
        "applaudiriez",
        "applaudiraient"
      ],
      "subjPresente": [
        "applaudisse",
        "applaudisses",
        "applaudisse",
        "applaudissions",
        "applaudissiez",
        "applaudissent"
      ],
      "imperatif": [
        null,
        "applaudis",
        null,
        "applaudissons",
        "applaudissez",
        null
      ]
    }
  },
  "atterrir": {
    "g": "g2",
    "f": {
      "presente": [
        "atterris",
        "atterris",
        "atterrit",
        "atterrissons",
        "atterrissez",
        "atterrissent"
      ],
      "imparfait": [
        "atterrissais",
        "atterrissais",
        "atterrissait",
        "atterrissions",
        "atterrissiez",
        "atterrissaient"
      ],
      "passeCompose": [
        "ai atterri",
        "as atterri",
        "a atterri",
        "avons atterri",
        "avez atterri",
        "ont atterri"
      ],
      "plusQueParfait": [
        "avais atterri",
        "avais atterri",
        "avait atterri",
        "avions atterri",
        "aviez atterri",
        "avaient atterri"
      ],
      "futurSimple": [
        "atterrirai",
        "atterriras",
        "atterrira",
        "atterrirons",
        "atterrirez",
        "atterriront"
      ],
      "condPresente": [
        "atterrirais",
        "atterrirais",
        "atterrirait",
        "atterririons",
        "atterririez",
        "atterriraient"
      ],
      "subjPresente": [
        "atterrisse",
        "atterrisses",
        "atterrisse",
        "atterrissions",
        "atterrissiez",
        "atterrissent"
      ],
      "imperatif": [
        null,
        "atterris",
        null,
        "atterrissons",
        "atterrissez",
        null
      ]
    }
  },
  "définir": {
    "g": "g2",
    "f": {
      "presente": [
        "définis",
        "définis",
        "définit",
        "définissons",
        "définissez",
        "définissent"
      ],
      "imparfait": [
        "définissais",
        "définissais",
        "définissait",
        "définissions",
        "définissiez",
        "définissaient"
      ],
      "passeCompose": [
        "ai défini",
        "as défini",
        "a défini",
        "avons défini",
        "avez défini",
        "ont défini"
      ],
      "plusQueParfait": [
        "avais défini",
        "avais défini",
        "avait défini",
        "avions défini",
        "aviez défini",
        "avaient défini"
      ],
      "futurSimple": [
        "définirai",
        "définiras",
        "définira",
        "définirons",
        "définirez",
        "définiront"
      ],
      "condPresente": [
        "définirais",
        "définirais",
        "définirait",
        "définirions",
        "définiriez",
        "définiraient"
      ],
      "subjPresente": [
        "définisse",
        "définisses",
        "définisse",
        "définissions",
        "définissiez",
        "définissent"
      ],
      "imperatif": [
        null,
        "définis",
        null,
        "définissons",
        "définissez",
        null
      ]
    }
  },
  "envahir": {
    "g": "g2",
    "f": {
      "presente": [
        "envahis",
        "envahis",
        "envahit",
        "envahissons",
        "envahissez",
        "envahissent"
      ],
      "imparfait": [
        "envahissais",
        "envahissais",
        "envahissait",
        "envahissions",
        "envahissiez",
        "envahissaient"
      ],
      "passeCompose": [
        "ai envahi",
        "as envahi",
        "a envahi",
        "avons envahi",
        "avez envahi",
        "ont envahi"
      ],
      "plusQueParfait": [
        "avais envahi",
        "avais envahi",
        "avait envahi",
        "avions envahi",
        "aviez envahi",
        "avaient envahi"
      ],
      "futurSimple": [
        "envahirai",
        "envahiras",
        "envahira",
        "envahirons",
        "envahirez",
        "envahiront"
      ],
      "condPresente": [
        "envahirais",
        "envahirais",
        "envahirait",
        "envahirions",
        "envahiriez",
        "envahiraient"
      ],
      "subjPresente": [
        "envahisse",
        "envahisses",
        "envahisse",
        "envahissions",
        "envahissiez",
        "envahissent"
      ],
      "imperatif": [
        null,
        "envahis",
        null,
        "envahissons",
        "envahissez",
        null
      ]
    }
  },
  "franchir": {
    "g": "g2",
    "f": {
      "presente": [
        "franchis",
        "franchis",
        "franchit",
        "franchissons",
        "franchissez",
        "franchissent"
      ],
      "imparfait": [
        "franchissais",
        "franchissais",
        "franchissait",
        "franchissions",
        "franchissiez",
        "franchissaient"
      ],
      "passeCompose": [
        "ai franchi",
        "as franchi",
        "a franchi",
        "avons franchi",
        "avez franchi",
        "ont franchi"
      ],
      "plusQueParfait": [
        "avais franchi",
        "avais franchi",
        "avait franchi",
        "avions franchi",
        "aviez franchi",
        "avaient franchi"
      ],
      "futurSimple": [
        "franchirai",
        "franchiras",
        "franchira",
        "franchirons",
        "franchirez",
        "franchiront"
      ],
      "condPresente": [
        "franchirais",
        "franchirais",
        "franchirait",
        "franchirions",
        "franchiriez",
        "franchiraient"
      ],
      "subjPresente": [
        "franchisse",
        "franchisses",
        "franchisse",
        "franchissions",
        "franchissiez",
        "franchissent"
      ],
      "imperatif": [
        null,
        "franchis",
        null,
        "franchissons",
        "franchissez",
        null
      ]
    }
  },
  "investir": {
    "g": "g2",
    "f": {
      "presente": [
        "investis",
        "investis",
        "investit",
        "investissons",
        "investissez",
        "investissent"
      ],
      "imparfait": [
        "investissais",
        "investissais",
        "investissait",
        "investissions",
        "investissiez",
        "investissaient"
      ],
      "passeCompose": [
        "ai investi",
        "as investi",
        "a investi",
        "avons investi",
        "avez investi",
        "ont investi"
      ],
      "plusQueParfait": [
        "avais investi",
        "avais investi",
        "avait investi",
        "avions investi",
        "aviez investi",
        "avaient investi"
      ],
      "futurSimple": [
        "investirai",
        "investiras",
        "investira",
        "investirons",
        "investirez",
        "investiront"
      ],
      "condPresente": [
        "investirais",
        "investirais",
        "investirait",
        "investirions",
        "investiriez",
        "investiraient"
      ],
      "subjPresente": [
        "investisse",
        "investisses",
        "investisse",
        "investissions",
        "investissiez",
        "investissent"
      ],
      "imperatif": [
        null,
        "investis",
        null,
        "investissons",
        "investissez",
        null
      ]
    }
  },
  "jouir": {
    "g": "g2",
    "f": {
      "presente": [
        "jouis",
        "jouis",
        "jouit",
        "jouissons",
        "jouissez",
        "jouissent"
      ],
      "imparfait": [
        "jouissais",
        "jouissais",
        "jouissait",
        "jouissions",
        "jouissiez",
        "jouissaient"
      ],
      "passeCompose": [
        "ai joui",
        "as joui",
        "a joui",
        "avons joui",
        "avez joui",
        "ont joui"
      ],
      "plusQueParfait": [
        "avais joui",
        "avais joui",
        "avait joui",
        "avions joui",
        "aviez joui",
        "avaient joui"
      ],
      "futurSimple": [
        "jouirai",
        "jouiras",
        "jouira",
        "jouirons",
        "jouirez",
        "jouiront"
      ],
      "condPresente": [
        "jouirais",
        "jouirais",
        "jouirait",
        "jouirions",
        "jouiriez",
        "jouiraient"
      ],
      "subjPresente": [
        "jouisse",
        "jouisses",
        "jouisse",
        "jouissions",
        "jouissiez",
        "jouissent"
      ],
      "imperatif": [
        null,
        "jouis",
        null,
        "jouissons",
        "jouissez",
        null
      ]
    }
  },
  "rajeunir": {
    "g": "g2",
    "f": {
      "presente": [
        "rajeunis",
        "rajeunis",
        "rajeunit",
        "rajeunissons",
        "rajeunissez",
        "rajeunissent"
      ],
      "imparfait": [
        "rajeunissais",
        "rajeunissais",
        "rajeunissait",
        "rajeunissions",
        "rajeunissiez",
        "rajeunissaient"
      ],
      "passeCompose": [
        "ai rajeuni",
        "as rajeuni",
        "a rajeuni",
        "avons rajeuni",
        "avez rajeuni",
        "ont rajeuni"
      ],
      "plusQueParfait": [
        "avais rajeuni",
        "avais rajeuni",
        "avait rajeuni",
        "avions rajeuni",
        "aviez rajeuni",
        "avaient rajeuni"
      ],
      "futurSimple": [
        "rajeunirai",
        "rajeuniras",
        "rajeunira",
        "rajeunirons",
        "rajeunirez",
        "rajeuniront"
      ],
      "condPresente": [
        "rajeunirais",
        "rajeunirais",
        "rajeunirait",
        "rajeunirions",
        "rajeuniriez",
        "rajeuniraient"
      ],
      "subjPresente": [
        "rajeunisse",
        "rajeunisses",
        "rajeunisse",
        "rajeunissions",
        "rajeunissiez",
        "rajeunissent"
      ],
      "imperatif": [
        null,
        "rajeunis",
        null,
        "rajeunissons",
        "rajeunissez",
        null
      ]
    }
  },
  "trahir": {
    "g": "g2",
    "f": {
      "presente": [
        "trahis",
        "trahis",
        "trahit",
        "trahissons",
        "trahissez",
        "trahissent"
      ],
      "imparfait": [
        "trahissais",
        "trahissais",
        "trahissait",
        "trahissions",
        "trahissiez",
        "trahissaient"
      ],
      "passeCompose": [
        "ai trahi",
        "as trahi",
        "a trahi",
        "avons trahi",
        "avez trahi",
        "ont trahi"
      ],
      "plusQueParfait": [
        "avais trahi",
        "avais trahi",
        "avait trahi",
        "avions trahi",
        "aviez trahi",
        "avaient trahi"
      ],
      "futurSimple": [
        "trahirai",
        "trahiras",
        "trahira",
        "trahirons",
        "trahirez",
        "trahiront"
      ],
      "condPresente": [
        "trahirais",
        "trahirais",
        "trahirait",
        "trahirions",
        "trahiriez",
        "trahiraient"
      ],
      "subjPresente": [
        "trahisse",
        "trahisses",
        "trahisse",
        "trahissions",
        "trahissiez",
        "trahissent"
      ],
      "imperatif": [
        null,
        "trahis",
        null,
        "trahissons",
        "trahissez",
        null
      ]
    }
  },
  "venir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "viens",
        "viens",
        "vient",
        "venons",
        "venez",
        "viennent"
      ],
      "imparfait": [
        "venais",
        "venais",
        "venait",
        "venions",
        "veniez",
        "venaient"
      ],
      "passeCompose": [
        "suis venu",
        "es venu",
        "est venu",
        "sommes venus",
        "êtes venus",
        "sont venus"
      ],
      "plusQueParfait": [
        "étais venu",
        "étais venu",
        "était venu",
        "étions venus",
        "étiez venus",
        "étaient venus"
      ],
      "futurSimple": [
        "viendrai",
        "viendras",
        "viendra",
        "viendrons",
        "viendrez",
        "viendront"
      ],
      "condPresente": [
        "viendrais",
        "viendrais",
        "viendrait",
        "viendrions",
        "viendriez",
        "viendraient"
      ],
      "subjPresente": [
        "vienne",
        "viennes",
        "vienne",
        "venions",
        "veniez",
        "viennent"
      ],
      "imperatif": [
        null,
        "viens",
        null,
        "venons",
        "venez",
        null
      ]
    }
  },
  "tenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "tiens",
        "tiens",
        "tient",
        "tenons",
        "tenez",
        "tiennent"
      ],
      "imparfait": [
        "tenais",
        "tenais",
        "tenait",
        "tenions",
        "teniez",
        "tenaient"
      ],
      "passeCompose": [
        "ai tenu",
        "as tenu",
        "a tenu",
        "avons tenu",
        "avez tenu",
        "ont tenu"
      ],
      "plusQueParfait": [
        "avais tenu",
        "avais tenu",
        "avait tenu",
        "avions tenu",
        "aviez tenu",
        "avaient tenu"
      ],
      "futurSimple": [
        "tiendrai",
        "tiendras",
        "tiendra",
        "tiendrons",
        "tiendrez",
        "tiendront"
      ],
      "condPresente": [
        "tiendrais",
        "tiendrais",
        "tiendrait",
        "tiendrions",
        "tiendriez",
        "tiendraient"
      ],
      "subjPresente": [
        "tienne",
        "tiennes",
        "tienne",
        "tenions",
        "teniez",
        "tiennent"
      ],
      "imperatif": [
        null,
        "tiens",
        null,
        "tenons",
        "tenez",
        null
      ]
    }
  },
  "partir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "pars",
        "pars",
        "part",
        "partons",
        "partez",
        "partent"
      ],
      "imparfait": [
        "partais",
        "partais",
        "partait",
        "partions",
        "partiez",
        "partaient"
      ],
      "passeCompose": [
        "suis parti",
        "es parti",
        "est parti",
        "sommes partis",
        "êtes partis",
        "sont partis"
      ],
      "plusQueParfait": [
        "étais parti",
        "étais parti",
        "était parti",
        "étions partis",
        "étiez partis",
        "étaient partis"
      ],
      "futurSimple": [
        "partirai",
        "partiras",
        "partira",
        "partirons",
        "partirez",
        "partiront"
      ],
      "condPresente": [
        "partirais",
        "partirais",
        "partirait",
        "partirions",
        "partiriez",
        "partiraient"
      ],
      "subjPresente": [
        "parte",
        "partes",
        "parte",
        "partions",
        "partiez",
        "partent"
      ],
      "imperatif": [
        null,
        "pars",
        null,
        "partons",
        "partez",
        null
      ]
    }
  },
  "sortir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "sors",
        "sors",
        "sort",
        "sortons",
        "sortez",
        "sortent"
      ],
      "imparfait": [
        "sortais",
        "sortais",
        "sortait",
        "sortions",
        "sortiez",
        "sortaient"
      ],
      "passeCompose": [
        "ai sorti",
        "as sorti",
        "a sorti",
        "avons sorti",
        "avez sorti",
        "ont sorti"
      ],
      "plusQueParfait": [
        "avais sorti",
        "avais sorti",
        "avait sorti",
        "avions sorti",
        "aviez sorti",
        "avaient sorti"
      ],
      "futurSimple": [
        "sortirai",
        "sortiras",
        "sortira",
        "sortirons",
        "sortirez",
        "sortiront"
      ],
      "condPresente": [
        "sortirais",
        "sortirais",
        "sortirait",
        "sortirions",
        "sortiriez",
        "sortiraient"
      ],
      "subjPresente": [
        "sorte",
        "sortes",
        "sorte",
        "sortions",
        "sortiez",
        "sortent"
      ],
      "imperatif": [
        null,
        "sors",
        null,
        "sortons",
        "sortez",
        null
      ]
    }
  },
  "dormir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "dors",
        "dors",
        "dort",
        "dormons",
        "dormez",
        "dorment"
      ],
      "imparfait": [
        "dormais",
        "dormais",
        "dormait",
        "dormions",
        "dormiez",
        "dormaient"
      ],
      "passeCompose": [
        "ai dormi",
        "as dormi",
        "a dormi",
        "avons dormi",
        "avez dormi",
        "ont dormi"
      ],
      "plusQueParfait": [
        "avais dormi",
        "avais dormi",
        "avait dormi",
        "avions dormi",
        "aviez dormi",
        "avaient dormi"
      ],
      "futurSimple": [
        "dormirai",
        "dormiras",
        "dormira",
        "dormirons",
        "dormirez",
        "dormiront"
      ],
      "condPresente": [
        "dormirais",
        "dormirais",
        "dormirait",
        "dormirions",
        "dormiriez",
        "dormiraient"
      ],
      "subjPresente": [
        "dorme",
        "dormes",
        "dorme",
        "dormions",
        "dormiez",
        "dorment"
      ],
      "imperatif": [
        null,
        "dors",
        null,
        "dormons",
        "dormez",
        null
      ]
    }
  },
  "sentir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "sens",
        "sens",
        "sent",
        "sentons",
        "sentez",
        "sentent"
      ],
      "imparfait": [
        "sentais",
        "sentais",
        "sentait",
        "sentions",
        "sentiez",
        "sentaient"
      ],
      "passeCompose": [
        "ai senti",
        "as senti",
        "a senti",
        "avons senti",
        "avez senti",
        "ont senti"
      ],
      "plusQueParfait": [
        "avais senti",
        "avais senti",
        "avait senti",
        "avions senti",
        "aviez senti",
        "avaient senti"
      ],
      "futurSimple": [
        "sentirai",
        "sentiras",
        "sentira",
        "sentirons",
        "sentirez",
        "sentiront"
      ],
      "condPresente": [
        "sentirais",
        "sentirais",
        "sentirait",
        "sentirions",
        "sentiriez",
        "sentiraient"
      ],
      "subjPresente": [
        "sente",
        "sentes",
        "sente",
        "sentions",
        "sentiez",
        "sentent"
      ],
      "imperatif": [
        null,
        "sens",
        null,
        "sentons",
        "sentez",
        null
      ]
    }
  },
  "mentir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "mens",
        "mens",
        "ment",
        "mentons",
        "mentez",
        "mentent"
      ],
      "imparfait": [
        "mentais",
        "mentais",
        "mentait",
        "mentions",
        "mentiez",
        "mentaient"
      ],
      "passeCompose": [
        "ai menti",
        "as menti",
        "a menti",
        "avons menti",
        "avez menti",
        "ont menti"
      ],
      "plusQueParfait": [
        "avais menti",
        "avais menti",
        "avait menti",
        "avions menti",
        "aviez menti",
        "avaient menti"
      ],
      "futurSimple": [
        "mentirai",
        "mentiras",
        "mentira",
        "mentirons",
        "mentirez",
        "mentiront"
      ],
      "condPresente": [
        "mentirais",
        "mentirais",
        "mentirait",
        "mentirions",
        "mentiriez",
        "mentiraient"
      ],
      "subjPresente": [
        "mente",
        "mentes",
        "mente",
        "mentions",
        "mentiez",
        "mentent"
      ],
      "imperatif": [
        null,
        "mens",
        null,
        "mentons",
        "mentez",
        null
      ]
    }
  },
  "courir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "cours",
        "cours",
        "court",
        "courons",
        "courez",
        "courent"
      ],
      "imparfait": [
        "courais",
        "courais",
        "courait",
        "courions",
        "couriez",
        "couraient"
      ],
      "passeCompose": [
        "ai couru",
        "as couru",
        "a couru",
        "avons couru",
        "avez couru",
        "ont couru"
      ],
      "plusQueParfait": [
        "avais couru",
        "avais couru",
        "avait couru",
        "avions couru",
        "aviez couru",
        "avaient couru"
      ],
      "futurSimple": [
        "courrai",
        "courras",
        "courra",
        "courrons",
        "courrez",
        "courront"
      ],
      "condPresente": [
        "courrais",
        "courrais",
        "courrait",
        "courrions",
        "courriez",
        "courraient"
      ],
      "subjPresente": [
        "coure",
        "coures",
        "coure",
        "courions",
        "couriez",
        "courent"
      ],
      "imperatif": [
        null,
        "cours",
        null,
        "courons",
        "courez",
        null
      ]
    }
  },
  "ouvrir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "ouvre",
        "ouvres",
        "ouvre",
        "ouvrons",
        "ouvrez",
        "ouvrent"
      ],
      "imparfait": [
        "ouvrais",
        "ouvrais",
        "ouvrait",
        "ouvrions",
        "ouvriez",
        "ouvraient"
      ],
      "passeCompose": [
        "ai ouvert",
        "as ouvert",
        "a ouvert",
        "avons ouvert",
        "avez ouvert",
        "ont ouvert"
      ],
      "plusQueParfait": [
        "avais ouvert",
        "avais ouvert",
        "avait ouvert",
        "avions ouvert",
        "aviez ouvert",
        "avaient ouvert"
      ],
      "futurSimple": [
        "ouvrirai",
        "ouvriras",
        "ouvrira",
        "ouvrirons",
        "ouvrirez",
        "ouvriront"
      ],
      "condPresente": [
        "ouvrirais",
        "ouvrirais",
        "ouvrirait",
        "ouvririons",
        "ouvririez",
        "ouvriraient"
      ],
      "subjPresente": [
        "ouvre",
        "ouvres",
        "ouvre",
        "ouvrions",
        "ouvriez",
        "ouvrent"
      ],
      "imperatif": [
        null,
        "ouvre",
        null,
        "ouvrons",
        "ouvrez",
        null
      ]
    }
  },
  "offrir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "offre",
        "offres",
        "offre",
        "offrons",
        "offrez",
        "offrent"
      ],
      "imparfait": [
        "offrais",
        "offrais",
        "offrait",
        "offrions",
        "offriez",
        "offraient"
      ],
      "passeCompose": [
        "ai offert",
        "as offert",
        "a offert",
        "avons offert",
        "avez offert",
        "ont offert"
      ],
      "plusQueParfait": [
        "avais offert",
        "avais offert",
        "avait offert",
        "avions offert",
        "aviez offert",
        "avaient offert"
      ],
      "futurSimple": [
        "offrirai",
        "offriras",
        "offrira",
        "offrirons",
        "offrirez",
        "offriront"
      ],
      "condPresente": [
        "offrirais",
        "offrirais",
        "offrirait",
        "offririons",
        "offririez",
        "offriraient"
      ],
      "subjPresente": [
        "offre",
        "offres",
        "offre",
        "offrions",
        "offriez",
        "offrent"
      ],
      "imperatif": [
        null,
        "offre",
        null,
        "offrons",
        "offrez",
        null
      ]
    }
  },
  "souffrir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "souffre",
        "souffres",
        "souffre",
        "souffrons",
        "souffrez",
        "souffrent"
      ],
      "imparfait": [
        "souffrais",
        "souffrais",
        "souffrait",
        "souffrions",
        "souffriez",
        "souffraient"
      ],
      "passeCompose": [
        "ai souffert",
        "as souffert",
        "a souffert",
        "avons souffert",
        "avez souffert",
        "ont souffert"
      ],
      "plusQueParfait": [
        "avais souffert",
        "avais souffert",
        "avait souffert",
        "avions souffert",
        "aviez souffert",
        "avaient souffert"
      ],
      "futurSimple": [
        "souffrirai",
        "souffriras",
        "souffrira",
        "souffrirons",
        "souffrirez",
        "souffriront"
      ],
      "condPresente": [
        "souffrirais",
        "souffrirais",
        "souffrirait",
        "souffririons",
        "souffririez",
        "souffriraient"
      ],
      "subjPresente": [
        "souffre",
        "souffres",
        "souffre",
        "souffrions",
        "souffriez",
        "souffrent"
      ],
      "imperatif": [
        null,
        "souffre",
        null,
        "souffrons",
        "souffrez",
        null
      ]
    }
  },
  "couvrir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "couvre",
        "couvres",
        "couvre",
        "couvrons",
        "couvrez",
        "couvrent"
      ],
      "imparfait": [
        "couvrais",
        "couvrais",
        "couvrait",
        "couvrions",
        "couvriez",
        "couvraient"
      ],
      "passeCompose": [
        "ai couvert",
        "as couvert",
        "a couvert",
        "avons couvert",
        "avez couvert",
        "ont couvert"
      ],
      "plusQueParfait": [
        "avais couvert",
        "avais couvert",
        "avait couvert",
        "avions couvert",
        "aviez couvert",
        "avaient couvert"
      ],
      "futurSimple": [
        "couvrirai",
        "couvriras",
        "couvrira",
        "couvrirons",
        "couvrirez",
        "couvriront"
      ],
      "condPresente": [
        "couvrirais",
        "couvrirais",
        "couvrirait",
        "couvririons",
        "couvririez",
        "couvriraient"
      ],
      "subjPresente": [
        "couvre",
        "couvres",
        "couvre",
        "couvrions",
        "couvriez",
        "couvrent"
      ],
      "imperatif": [
        null,
        "couvre",
        null,
        "couvrons",
        "couvrez",
        null
      ]
    }
  },
  "découvrir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "découvre",
        "découvres",
        "découvre",
        "découvrons",
        "découvrez",
        "découvrent"
      ],
      "imparfait": [
        "découvrais",
        "découvrais",
        "découvrait",
        "découvrions",
        "découvriez",
        "découvraient"
      ],
      "passeCompose": [
        "ai découvert",
        "as découvert",
        "a découvert",
        "avons découvert",
        "avez découvert",
        "ont découvert"
      ],
      "plusQueParfait": [
        "avais découvert",
        "avais découvert",
        "avait découvert",
        "avions découvert",
        "aviez découvert",
        "avaient découvert"
      ],
      "futurSimple": [
        "découvrirai",
        "découvriras",
        "découvrira",
        "découvrirons",
        "découvrirez",
        "découvriront"
      ],
      "condPresente": [
        "découvrirais",
        "découvrirais",
        "découvrirait",
        "découvririons",
        "découvririez",
        "découvriraient"
      ],
      "subjPresente": [
        "découvre",
        "découvres",
        "découvre",
        "découvrions",
        "découvriez",
        "découvrent"
      ],
      "imperatif": [
        null,
        "découvre",
        null,
        "découvrons",
        "découvrez",
        null
      ]
    }
  },
  "mourir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "meurs",
        "meurs",
        "meurt",
        "mourons",
        "mourez",
        "meurent"
      ],
      "imparfait": [
        "mourais",
        "mourais",
        "mourait",
        "mourions",
        "mouriez",
        "mouraient"
      ],
      "passeCompose": [
        "suis mort",
        "es mort",
        "est mort",
        "sommes morts",
        "êtes morts",
        "sont morts"
      ],
      "plusQueParfait": [
        "étais mort",
        "étais mort",
        "était mort",
        "étions morts",
        "étiez morts",
        "étaient morts"
      ],
      "futurSimple": [
        "mourrai",
        "mourras",
        "mourra",
        "mourrons",
        "mourrez",
        "mourront"
      ],
      "condPresente": [
        "mourrais",
        "mourrais",
        "mourrait",
        "mourrions",
        "mourriez",
        "mourraient"
      ],
      "subjPresente": [
        "meure",
        "meures",
        "meure",
        "mourions",
        "mouriez",
        "meurent"
      ],
      "imperatif": [
        null,
        "meurs",
        null,
        "mourons",
        "mourez",
        null
      ]
    }
  },
  "devenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "deviens",
        "deviens",
        "devient",
        "devenons",
        "devenez",
        "deviennent"
      ],
      "imparfait": [
        "devenais",
        "devenais",
        "devenait",
        "devenions",
        "deveniez",
        "devenaient"
      ],
      "passeCompose": [
        "suis devenu",
        "es devenu",
        "est devenu",
        "sommes devenus",
        "êtes devenus",
        "sont devenus"
      ],
      "plusQueParfait": [
        "étais devenu",
        "étais devenu",
        "était devenu",
        "étions devenus",
        "étiez devenus",
        "étaient devenus"
      ],
      "futurSimple": [
        "deviendrai",
        "deviendras",
        "deviendra",
        "deviendrons",
        "deviendrez",
        "deviendront"
      ],
      "condPresente": [
        "deviendrais",
        "deviendrais",
        "deviendrait",
        "deviendrions",
        "deviendriez",
        "deviendraient"
      ],
      "subjPresente": [
        "devienne",
        "deviennes",
        "devienne",
        "devenions",
        "deveniez",
        "deviennent"
      ],
      "imperatif": [
        null,
        "deviens",
        null,
        "devenons",
        "devenez",
        null
      ]
    }
  },
  "revenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "reviens",
        "reviens",
        "revient",
        "revenons",
        "revenez",
        "reviennent"
      ],
      "imparfait": [
        "revenais",
        "revenais",
        "revenait",
        "revenions",
        "reveniez",
        "revenaient"
      ],
      "passeCompose": [
        "suis revenu",
        "es revenu",
        "est revenu",
        "sommes revenus",
        "êtes revenus",
        "sont revenus"
      ],
      "plusQueParfait": [
        "étais revenu",
        "étais revenu",
        "était revenu",
        "étions revenus",
        "étiez revenus",
        "étaient revenus"
      ],
      "futurSimple": [
        "reviendrai",
        "reviendras",
        "reviendra",
        "reviendrons",
        "reviendrez",
        "reviendront"
      ],
      "condPresente": [
        "reviendrais",
        "reviendrais",
        "reviendrait",
        "reviendrions",
        "reviendriez",
        "reviendraient"
      ],
      "subjPresente": [
        "revienne",
        "reviennes",
        "revienne",
        "revenions",
        "reveniez",
        "reviennent"
      ],
      "imperatif": [
        null,
        "reviens",
        null,
        "revenons",
        "revenez",
        null
      ]
    }
  },
  "obtenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "obtiens",
        "obtiens",
        "obtient",
        "obtenons",
        "obtenez",
        "obtiennent"
      ],
      "imparfait": [
        "obtenais",
        "obtenais",
        "obtenait",
        "obtenions",
        "obteniez",
        "obtenaient"
      ],
      "passeCompose": [
        "ai obtenu",
        "as obtenu",
        "a obtenu",
        "avons obtenu",
        "avez obtenu",
        "ont obtenu"
      ],
      "plusQueParfait": [
        "avais obtenu",
        "avais obtenu",
        "avait obtenu",
        "avions obtenu",
        "aviez obtenu",
        "avaient obtenu"
      ],
      "futurSimple": [
        "obtiendrai",
        "obtiendras",
        "obtiendra",
        "obtiendrons",
        "obtiendrez",
        "obtiendront"
      ],
      "condPresente": [
        "obtiendrais",
        "obtiendrais",
        "obtiendrait",
        "obtiendrions",
        "obtiendriez",
        "obtiendraient"
      ],
      "subjPresente": [
        "obtienne",
        "obtiennes",
        "obtienne",
        "obtenions",
        "obteniez",
        "obtiennent"
      ],
      "imperatif": [
        null,
        "obtiens",
        null,
        "obtenons",
        "obtenez",
        null
      ]
    }
  },
  "maintenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "maintiens",
        "maintiens",
        "maintient",
        "maintenons",
        "maintenez",
        "maintiennent"
      ],
      "imparfait": [
        "maintenais",
        "maintenais",
        "maintenait",
        "maintenions",
        "mainteniez",
        "maintenaient"
      ],
      "passeCompose": [
        "ai maintenu",
        "as maintenu",
        "a maintenu",
        "avons maintenu",
        "avez maintenu",
        "ont maintenu"
      ],
      "plusQueParfait": [
        "avais maintenu",
        "avais maintenu",
        "avait maintenu",
        "avions maintenu",
        "aviez maintenu",
        "avaient maintenu"
      ],
      "futurSimple": [
        "maintiendrai",
        "maintiendras",
        "maintiendra",
        "maintiendrons",
        "maintiendrez",
        "maintiendront"
      ],
      "condPresente": [
        "maintiendrais",
        "maintiendrais",
        "maintiendrait",
        "maintiendrions",
        "maintiendriez",
        "maintiendraient"
      ],
      "subjPresente": [
        "maintienne",
        "maintiennes",
        "maintienne",
        "maintenions",
        "mainteniez",
        "maintiennent"
      ],
      "imperatif": [
        null,
        "maintiens",
        null,
        "maintenons",
        "maintenez",
        null
      ]
    }
  },
  "appartenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "appartiens",
        "appartiens",
        "appartient",
        "appartenons",
        "appartenez",
        "appartiennent"
      ],
      "imparfait": [
        "appartenais",
        "appartenais",
        "appartenait",
        "appartenions",
        "apparteniez",
        "appartenaient"
      ],
      "passeCompose": [
        "ai appartenu",
        "as appartenu",
        "a appartenu",
        "avons appartenu",
        "avez appartenu",
        "ont appartenu"
      ],
      "plusQueParfait": [
        "avais appartenu",
        "avais appartenu",
        "avait appartenu",
        "avions appartenu",
        "aviez appartenu",
        "avaient appartenu"
      ],
      "futurSimple": [
        "appartiendrai",
        "appartiendras",
        "appartiendra",
        "appartiendrons",
        "appartiendrez",
        "appartiendront"
      ],
      "condPresente": [
        "appartiendrais",
        "appartiendrais",
        "appartiendrait",
        "appartiendrions",
        "appartiendriez",
        "appartiendraient"
      ],
      "subjPresente": [
        "appartienne",
        "appartiennes",
        "appartienne",
        "appartenions",
        "apparteniez",
        "appartiennent"
      ],
      "imperatif": [
        null,
        "appartiens",
        null,
        "appartenons",
        "appartenez",
        null
      ]
    }
  },
  "retenir": {
    "g": "g3ir",
    "f": {
      "presente": [
        "retiens",
        "retiens",
        "retient",
        "retenons",
        "retenez",
        "retiennent"
      ],
      "imparfait": [
        "retenais",
        "retenais",
        "retenait",
        "retenions",
        "reteniez",
        "retenaient"
      ],
      "passeCompose": [
        "ai retenu",
        "as retenu",
        "a retenu",
        "avons retenu",
        "avez retenu",
        "ont retenu"
      ],
      "plusQueParfait": [
        "avais retenu",
        "avais retenu",
        "avait retenu",
        "avions retenu",
        "aviez retenu",
        "avaient retenu"
      ],
      "futurSimple": [
        "retiendrai",
        "retiendras",
        "retiendra",
        "retiendrons",
        "retiendrez",
        "retiendront"
      ],
      "condPresente": [
        "retiendrais",
        "retiendrais",
        "retiendrait",
        "retiendrions",
        "retiendriez",
        "retiendraient"
      ],
      "subjPresente": [
        "retienne",
        "retiennes",
        "retienne",
        "retenions",
        "reteniez",
        "retiennent"
      ],
      "imperatif": [
        null,
        "retiens",
        null,
        "retenons",
        "retenez",
        null
      ]
    }
  },
  "prendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "prends",
        "prends",
        "prend",
        "prenons",
        "prenez",
        "prennent"
      ],
      "imparfait": [
        "prenais",
        "prenais",
        "prenait",
        "prenions",
        "preniez",
        "prenaient"
      ],
      "passeCompose": [
        "ai pris",
        "as pris",
        "a pris",
        "avons pris",
        "avez pris",
        "ont pris"
      ],
      "plusQueParfait": [
        "avais pris",
        "avais pris",
        "avait pris",
        "avions pris",
        "aviez pris",
        "avaient pris"
      ],
      "futurSimple": [
        "prendrai",
        "prendras",
        "prendra",
        "prendrons",
        "prendrez",
        "prendront"
      ],
      "condPresente": [
        "prendrais",
        "prendrais",
        "prendrait",
        "prendrions",
        "prendriez",
        "prendraient"
      ],
      "subjPresente": [
        "prenne",
        "prennes",
        "prenne",
        "prenions",
        "preniez",
        "prennent"
      ],
      "imperatif": [
        null,
        "prends",
        null,
        "prenons",
        "prenez",
        null
      ]
    }
  },
  "apprendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "apprends",
        "apprends",
        "apprend",
        "apprenons",
        "apprenez",
        "apprennent"
      ],
      "imparfait": [
        "apprenais",
        "apprenais",
        "apprenait",
        "apprenions",
        "appreniez",
        "apprenaient"
      ],
      "passeCompose": [
        "ai appris",
        "as appris",
        "a appris",
        "avons appris",
        "avez appris",
        "ont appris"
      ],
      "plusQueParfait": [
        "avais appris",
        "avais appris",
        "avait appris",
        "avions appris",
        "aviez appris",
        "avaient appris"
      ],
      "futurSimple": [
        "apprendrai",
        "apprendras",
        "apprendra",
        "apprendrons",
        "apprendrez",
        "apprendront"
      ],
      "condPresente": [
        "apprendrais",
        "apprendrais",
        "apprendrait",
        "apprendrions",
        "apprendriez",
        "apprendraient"
      ],
      "subjPresente": [
        "apprenne",
        "apprennes",
        "apprenne",
        "apprenions",
        "appreniez",
        "apprennent"
      ],
      "imperatif": [
        null,
        "apprends",
        null,
        "apprenons",
        "apprenez",
        null
      ]
    }
  },
  "comprendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "comprends",
        "comprends",
        "comprend",
        "comprenons",
        "comprenez",
        "comprennent"
      ],
      "imparfait": [
        "comprenais",
        "comprenais",
        "comprenait",
        "comprenions",
        "compreniez",
        "comprenaient"
      ],
      "passeCompose": [
        "ai compris",
        "as compris",
        "a compris",
        "avons compris",
        "avez compris",
        "ont compris"
      ],
      "plusQueParfait": [
        "avais compris",
        "avais compris",
        "avait compris",
        "avions compris",
        "aviez compris",
        "avaient compris"
      ],
      "futurSimple": [
        "comprendrai",
        "comprendras",
        "comprendra",
        "comprendrons",
        "comprendrez",
        "comprendront"
      ],
      "condPresente": [
        "comprendrais",
        "comprendrais",
        "comprendrait",
        "comprendrions",
        "comprendriez",
        "comprendraient"
      ],
      "subjPresente": [
        "comprenne",
        "comprennes",
        "comprenne",
        "comprenions",
        "compreniez",
        "comprennent"
      ],
      "imperatif": [
        null,
        "comprends",
        null,
        "comprenons",
        "comprenez",
        null
      ]
    }
  },
  "surprendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "surprends",
        "surprends",
        "surprend",
        "surprenons",
        "surprenez",
        "surprennent"
      ],
      "imparfait": [
        "surprenais",
        "surprenais",
        "surprenait",
        "surprenions",
        "surpreniez",
        "surprenaient"
      ],
      "passeCompose": [
        "ai surpris",
        "as surpris",
        "a surpris",
        "avons surpris",
        "avez surpris",
        "ont surpris"
      ],
      "plusQueParfait": [
        "avais surpris",
        "avais surpris",
        "avait surpris",
        "avions surpris",
        "aviez surpris",
        "avaient surpris"
      ],
      "futurSimple": [
        "surprendrai",
        "surprendras",
        "surprendra",
        "surprendrons",
        "surprendrez",
        "surprendront"
      ],
      "condPresente": [
        "surprendrais",
        "surprendrais",
        "surprendrait",
        "surprendrions",
        "surprendriez",
        "surprendraient"
      ],
      "subjPresente": [
        "surprenne",
        "surprennes",
        "surprenne",
        "surprenions",
        "surpreniez",
        "surprennent"
      ],
      "imperatif": [
        null,
        "surprends",
        null,
        "surprenons",
        "surprenez",
        null
      ]
    }
  },
  "mettre": {
    "g": "g3re",
    "f": {
      "presente": [
        "mets",
        "mets",
        "met",
        "mettons",
        "mettez",
        "mettent"
      ],
      "imparfait": [
        "mettais",
        "mettais",
        "mettait",
        "mettions",
        "mettiez",
        "mettaient"
      ],
      "passeCompose": [
        "ai mis",
        "as mis",
        "a mis",
        "avons mis",
        "avez mis",
        "ont mis"
      ],
      "plusQueParfait": [
        "avais mis",
        "avais mis",
        "avait mis",
        "avions mis",
        "aviez mis",
        "avaient mis"
      ],
      "futurSimple": [
        "mettrai",
        "mettras",
        "mettra",
        "mettrons",
        "mettrez",
        "mettront"
      ],
      "condPresente": [
        "mettrais",
        "mettrais",
        "mettrait",
        "mettrions",
        "mettriez",
        "mettraient"
      ],
      "subjPresente": [
        "mette",
        "mettes",
        "mette",
        "mettions",
        "mettiez",
        "mettent"
      ],
      "imperatif": [
        null,
        "mets",
        null,
        "mettons",
        "mettez",
        null
      ]
    }
  },
  "permettre": {
    "g": "g3re",
    "f": {
      "presente": [
        "permets",
        "permets",
        "permet",
        "permettons",
        "permettez",
        "permettent"
      ],
      "imparfait": [
        "permettais",
        "permettais",
        "permettait",
        "permettions",
        "permettiez",
        "permettaient"
      ],
      "passeCompose": [
        "ai permis",
        "as permis",
        "a permis",
        "avons permis",
        "avez permis",
        "ont permis"
      ],
      "plusQueParfait": [
        "avais permis",
        "avais permis",
        "avait permis",
        "avions permis",
        "aviez permis",
        "avaient permis"
      ],
      "futurSimple": [
        "permettrai",
        "permettras",
        "permettra",
        "permettrons",
        "permettrez",
        "permettront"
      ],
      "condPresente": [
        "permettrais",
        "permettrais",
        "permettrait",
        "permettrions",
        "permettriez",
        "permettraient"
      ],
      "subjPresente": [
        "permette",
        "permettes",
        "permette",
        "permettions",
        "permettiez",
        "permettent"
      ],
      "imperatif": [
        null,
        "permets",
        null,
        "permettons",
        "permettez",
        null
      ]
    }
  },
  "promettre": {
    "g": "g3re",
    "f": {
      "presente": [
        "promets",
        "promets",
        "promet",
        "promettons",
        "promettez",
        "promettent"
      ],
      "imparfait": [
        "promettais",
        "promettais",
        "promettait",
        "promettions",
        "promettiez",
        "promettaient"
      ],
      "passeCompose": [
        "ai promis",
        "as promis",
        "a promis",
        "avons promis",
        "avez promis",
        "ont promis"
      ],
      "plusQueParfait": [
        "avais promis",
        "avais promis",
        "avait promis",
        "avions promis",
        "aviez promis",
        "avaient promis"
      ],
      "futurSimple": [
        "promettrai",
        "promettras",
        "promettra",
        "promettrons",
        "promettrez",
        "promettront"
      ],
      "condPresente": [
        "promettrais",
        "promettrais",
        "promettrait",
        "promettrions",
        "promettriez",
        "promettraient"
      ],
      "subjPresente": [
        "promette",
        "promettes",
        "promette",
        "promettions",
        "promettiez",
        "promettent"
      ],
      "imperatif": [
        null,
        "promets",
        null,
        "promettons",
        "promettez",
        null
      ]
    }
  },
  "dire": {
    "g": "g3re",
    "f": {
      "presente": [
        "dis",
        "dis",
        "dit",
        "disons",
        "dites",
        "disent"
      ],
      "imparfait": [
        "disais",
        "disais",
        "disait",
        "disions",
        "disiez",
        "disaient"
      ],
      "passeCompose": [
        "ai dit",
        "as dit",
        "a dit",
        "avons dit",
        "avez dit",
        "ont dit"
      ],
      "plusQueParfait": [
        "avais dit",
        "avais dit",
        "avait dit",
        "avions dit",
        "aviez dit",
        "avaient dit"
      ],
      "futurSimple": [
        "dirai",
        "diras",
        "dira",
        "dirons",
        "direz",
        "diront"
      ],
      "condPresente": [
        "dirais",
        "dirais",
        "dirait",
        "dirions",
        "diriez",
        "diraient"
      ],
      "subjPresente": [
        "dise",
        "dises",
        "dise",
        "disions",
        "disiez",
        "disent"
      ],
      "imperatif": [
        null,
        "dis",
        null,
        "disons",
        "dites",
        null
      ]
    }
  },
  "lire": {
    "g": "g3re",
    "f": {
      "presente": [
        "lis",
        "lis",
        "lit",
        "lisons",
        "lisez",
        "lisent"
      ],
      "imparfait": [
        "lisais",
        "lisais",
        "lisait",
        "lisions",
        "lisiez",
        "lisaient"
      ],
      "passeCompose": [
        "ai lu",
        "as lu",
        "a lu",
        "avons lu",
        "avez lu",
        "ont lu"
      ],
      "plusQueParfait": [
        "avais lu",
        "avais lu",
        "avait lu",
        "avions lu",
        "aviez lu",
        "avaient lu"
      ],
      "futurSimple": [
        "lirai",
        "liras",
        "lira",
        "lirons",
        "lirez",
        "liront"
      ],
      "condPresente": [
        "lirais",
        "lirais",
        "lirait",
        "lirions",
        "liriez",
        "liraient"
      ],
      "subjPresente": [
        "lise",
        "lises",
        "lise",
        "lisions",
        "lisiez",
        "lisent"
      ],
      "imperatif": [
        null,
        "lis",
        null,
        "lisons",
        "lisez",
        null
      ]
    }
  },
  "écrire": {
    "g": "g3re",
    "f": {
      "presente": [
        "écris",
        "écris",
        "écrit",
        "écrivons",
        "écrivez",
        "écrivent"
      ],
      "imparfait": [
        "écrivais",
        "écrivais",
        "écrivait",
        "écrivions",
        "écriviez",
        "écrivaient"
      ],
      "passeCompose": [
        "ai écrit",
        "as écrit",
        "a écrit",
        "avons écrit",
        "avez écrit",
        "ont écrit"
      ],
      "plusQueParfait": [
        "avais écrit",
        "avais écrit",
        "avait écrit",
        "avions écrit",
        "aviez écrit",
        "avaient écrit"
      ],
      "futurSimple": [
        "écrirai",
        "écriras",
        "écrira",
        "écrirons",
        "écrirez",
        "écriront"
      ],
      "condPresente": [
        "écrirais",
        "écrirais",
        "écrirait",
        "écririons",
        "écririez",
        "écriraient"
      ],
      "subjPresente": [
        "écrive",
        "écrives",
        "écrive",
        "écrivions",
        "écriviez",
        "écrivent"
      ],
      "imperatif": [
        null,
        "écris",
        null,
        "écrivons",
        "écrivez",
        null
      ]
    }
  },
  "décrire": {
    "g": "g3re",
    "f": {
      "presente": [
        "décris",
        "décris",
        "décrit",
        "décrivons",
        "décrivez",
        "décrivent"
      ],
      "imparfait": [
        "décrivais",
        "décrivais",
        "décrivait",
        "décrivions",
        "décriviez",
        "décrivaient"
      ],
      "passeCompose": [
        "ai décrit",
        "as décrit",
        "a décrit",
        "avons décrit",
        "avez décrit",
        "ont décrit"
      ],
      "plusQueParfait": [
        "avais décrit",
        "avais décrit",
        "avait décrit",
        "avions décrit",
        "aviez décrit",
        "avaient décrit"
      ],
      "futurSimple": [
        "décrirai",
        "décriras",
        "décrira",
        "décrirons",
        "décrirez",
        "décriront"
      ],
      "condPresente": [
        "décrirais",
        "décrirais",
        "décrirait",
        "décririons",
        "décririez",
        "décriraient"
      ],
      "subjPresente": [
        "décrive",
        "décrives",
        "décrive",
        "décrivions",
        "décriviez",
        "décrivent"
      ],
      "imperatif": [
        null,
        "décris",
        null,
        "décrivons",
        "décrivez",
        null
      ]
    }
  },
  "vivre": {
    "g": "g3re",
    "f": {
      "presente": [
        "vis",
        "vis",
        "vit",
        "vivons",
        "vivez",
        "vivent"
      ],
      "imparfait": [
        "vivais",
        "vivais",
        "vivait",
        "vivions",
        "viviez",
        "vivaient"
      ],
      "passeCompose": [
        "ai vécu",
        "as vécu",
        "a vécu",
        "avons vécu",
        "avez vécu",
        "ont vécu"
      ],
      "plusQueParfait": [
        "avais vécu",
        "avais vécu",
        "avait vécu",
        "avions vécu",
        "aviez vécu",
        "avaient vécu"
      ],
      "futurSimple": [
        "vivrai",
        "vivras",
        "vivra",
        "vivrons",
        "vivrez",
        "vivront"
      ],
      "condPresente": [
        "vivrais",
        "vivrais",
        "vivrait",
        "vivrions",
        "vivriez",
        "vivraient"
      ],
      "subjPresente": [
        "vive",
        "vives",
        "vive",
        "vivions",
        "viviez",
        "vivent"
      ],
      "imperatif": [
        null,
        "vis",
        null,
        "vivons",
        "vivez",
        null
      ]
    }
  },
  "conduire": {
    "g": "g3re",
    "f": {
      "presente": [
        "conduis",
        "conduis",
        "conduit",
        "conduisons",
        "conduisez",
        "conduisent"
      ],
      "imparfait": [
        "conduisais",
        "conduisais",
        "conduisait",
        "conduisions",
        "conduisiez",
        "conduisaient"
      ],
      "passeCompose": [
        "ai conduit",
        "as conduit",
        "a conduit",
        "avons conduit",
        "avez conduit",
        "ont conduit"
      ],
      "plusQueParfait": [
        "avais conduit",
        "avais conduit",
        "avait conduit",
        "avions conduit",
        "aviez conduit",
        "avaient conduit"
      ],
      "futurSimple": [
        "conduirai",
        "conduiras",
        "conduira",
        "conduirons",
        "conduirez",
        "conduiront"
      ],
      "condPresente": [
        "conduirais",
        "conduirais",
        "conduirait",
        "conduirions",
        "conduiriez",
        "conduiraient"
      ],
      "subjPresente": [
        "conduise",
        "conduises",
        "conduise",
        "conduisions",
        "conduisiez",
        "conduisent"
      ],
      "imperatif": [
        null,
        "conduis",
        null,
        "conduisons",
        "conduisez",
        null
      ]
    }
  },
  "traduire": {
    "g": "g3re",
    "f": {
      "presente": [
        "traduis",
        "traduis",
        "traduit",
        "traduisons",
        "traduisez",
        "traduisent"
      ],
      "imparfait": [
        "traduisais",
        "traduisais",
        "traduisait",
        "traduisions",
        "traduisiez",
        "traduisaient"
      ],
      "passeCompose": [
        "ai traduit",
        "as traduit",
        "a traduit",
        "avons traduit",
        "avez traduit",
        "ont traduit"
      ],
      "plusQueParfait": [
        "avais traduit",
        "avais traduit",
        "avait traduit",
        "avions traduit",
        "aviez traduit",
        "avaient traduit"
      ],
      "futurSimple": [
        "traduirai",
        "traduiras",
        "traduira",
        "traduirons",
        "traduirez",
        "traduiront"
      ],
      "condPresente": [
        "traduirais",
        "traduirais",
        "traduirait",
        "traduirions",
        "traduiriez",
        "traduiraient"
      ],
      "subjPresente": [
        "traduise",
        "traduises",
        "traduise",
        "traduisions",
        "traduisiez",
        "traduisent"
      ],
      "imperatif": [
        null,
        "traduis",
        null,
        "traduisons",
        "traduisez",
        null
      ]
    }
  },
  "connaître": {
    "g": "g3re",
    "f": {
      "presente": [
        "connais",
        "connais",
        "connaît",
        "connaissons",
        "connaissez",
        "connaissent"
      ],
      "imparfait": [
        "connaissais",
        "connaissais",
        "connaissait",
        "connaissions",
        "connaissiez",
        "connaissaient"
      ],
      "passeCompose": [
        "ai connu",
        "as connu",
        "a connu",
        "avons connu",
        "avez connu",
        "ont connu"
      ],
      "plusQueParfait": [
        "avais connu",
        "avais connu",
        "avait connu",
        "avions connu",
        "aviez connu",
        "avaient connu"
      ],
      "futurSimple": [
        "connaîtrai",
        "connaîtras",
        "connaîtra",
        "connaîtrons",
        "connaîtrez",
        "connaîtront"
      ],
      "condPresente": [
        "connaîtrais",
        "connaîtrais",
        "connaîtrait",
        "connaîtrions",
        "connaîtriez",
        "connaîtraient"
      ],
      "subjPresente": [
        "connaisse",
        "connaisses",
        "connaisse",
        "connaissions",
        "connaissiez",
        "connaissent"
      ],
      "imperatif": [
        null,
        "connais",
        null,
        "connaissons",
        "connaissez",
        null
      ]
    }
  },
  "reconnaître": {
    "g": "g3re",
    "f": {
      "presente": [
        "reconnais",
        "reconnais",
        "reconnaît",
        "reconnaissons",
        "reconnaissez",
        "reconnaissent"
      ],
      "imparfait": [
        "reconnaissais",
        "reconnaissais",
        "reconnaissait",
        "reconnaissions",
        "reconnaissiez",
        "reconnaissaient"
      ],
      "passeCompose": [
        "ai reconnu",
        "as reconnu",
        "a reconnu",
        "avons reconnu",
        "avez reconnu",
        "ont reconnu"
      ],
      "plusQueParfait": [
        "avais reconnu",
        "avais reconnu",
        "avait reconnu",
        "avions reconnu",
        "aviez reconnu",
        "avaient reconnu"
      ],
      "futurSimple": [
        "reconnaîtrai",
        "reconnaîtras",
        "reconnaîtra",
        "reconnaîtrons",
        "reconnaîtrez",
        "reconnaîtront"
      ],
      "condPresente": [
        "reconnaîtrais",
        "reconnaîtrais",
        "reconnaîtrait",
        "reconnaîtrions",
        "reconnaîtriez",
        "reconnaîtraient"
      ],
      "subjPresente": [
        "reconnaisse",
        "reconnaisses",
        "reconnaisse",
        "reconnaissions",
        "reconnaissiez",
        "reconnaissent"
      ],
      "imperatif": [
        null,
        "reconnais",
        null,
        "reconnaissons",
        "reconnaissez",
        null
      ]
    }
  },
  "naître": {
    "g": "g3re",
    "f": {
      "presente": [
        "nais",
        "nais",
        "naît",
        "naissons",
        "naissez",
        "naissent"
      ],
      "imparfait": [
        "naissais",
        "naissais",
        "naissait",
        "naissions",
        "naissiez",
        "naissaient"
      ],
      "passeCompose": [
        "suis né",
        "es né",
        "est né",
        "sommes nés",
        "êtes nés",
        "sont nés"
      ],
      "plusQueParfait": [
        "étais né",
        "étais né",
        "était né",
        "étions nés",
        "étiez nés",
        "étaient nés"
      ],
      "futurSimple": [
        "naîtrai",
        "naîtras",
        "naîtra",
        "naîtrons",
        "naîtrez",
        "naîtront"
      ],
      "condPresente": [
        "naîtrais",
        "naîtrais",
        "naîtrait",
        "naîtrions",
        "naîtriez",
        "naîtraient"
      ],
      "subjPresente": [
        "naisse",
        "naisses",
        "naisse",
        "naissions",
        "naissiez",
        "naissent"
      ],
      "imperatif": [
        null,
        "nais",
        null,
        "naissons",
        "naissez",
        null
      ]
    }
  },
  "plaire": {
    "g": "g3re",
    "f": {
      "presente": [
        "plais",
        "plais",
        "plaît",
        "plaisons",
        "plaisez",
        "plaisent"
      ],
      "imparfait": [
        "plaisais",
        "plaisais",
        "plaisait",
        "plaisions",
        "plaisiez",
        "plaisaient"
      ],
      "passeCompose": [
        "ai plu",
        "as plu",
        "a plu",
        "avons plu",
        "avez plu",
        "ont plu"
      ],
      "plusQueParfait": [
        "avais plu",
        "avais plu",
        "avait plu",
        "avions plu",
        "aviez plu",
        "avaient plu"
      ],
      "futurSimple": [
        "plairai",
        "plairas",
        "plaira",
        "plairons",
        "plairez",
        "plairont"
      ],
      "condPresente": [
        "plairais",
        "plairais",
        "plairait",
        "plairions",
        "plairiez",
        "plairaient"
      ],
      "subjPresente": [
        "plaise",
        "plaises",
        "plaise",
        "plaisions",
        "plaisiez",
        "plaisent"
      ],
      "imperatif": [
        null,
        "plais",
        null,
        "plaisons",
        "plaisez",
        null
      ]
    }
  },
  "battre": {
    "g": "g3re",
    "f": {
      "presente": [
        "bats",
        "bats",
        null,
        "battons",
        "battez",
        "battent"
      ],
      "imparfait": [
        "battais",
        "battais",
        "battait",
        "battions",
        "battiez",
        "battaient"
      ],
      "passeCompose": [
        "ai battu",
        "as battu",
        "a battu",
        "avons battu",
        "avez battu",
        "ont battu"
      ],
      "plusQueParfait": [
        "avais battu",
        "avais battu",
        "avait battu",
        "avions battu",
        "aviez battu",
        "avaient battu"
      ],
      "futurSimple": [
        "battrai",
        "battras",
        "battra",
        "battrons",
        "battrez",
        "battront"
      ],
      "condPresente": [
        "battrais",
        "battrais",
        "battrait",
        "battrions",
        "battriez",
        "battraient"
      ],
      "subjPresente": [
        "batte",
        "battes",
        "batte",
        "battions",
        "battiez",
        "battent"
      ],
      "imperatif": [
        null,
        "bats",
        null,
        "battons",
        "battez",
        null
      ]
    }
  },
  "rompre": {
    "g": "g3re",
    "f": {
      "presente": [
        "romps",
        "romps",
        "rompt",
        "rompons",
        "rompez",
        "rompent"
      ],
      "imparfait": [
        "rompais",
        "rompais",
        "rompait",
        "rompions",
        "rompiez",
        "rompaient"
      ],
      "passeCompose": [
        "ai rompu",
        "as rompu",
        "a rompu",
        "avons rompu",
        "avez rompu",
        "ont rompu"
      ],
      "plusQueParfait": [
        "avais rompu",
        "avais rompu",
        "avait rompu",
        "avions rompu",
        "aviez rompu",
        "avaient rompu"
      ],
      "futurSimple": [
        "romprai",
        "rompras",
        "rompra",
        "romprons",
        "romprez",
        "rompront"
      ],
      "condPresente": [
        "romprais",
        "romprais",
        "romprait",
        "romprions",
        "rompriez",
        "rompraient"
      ],
      "subjPresente": [
        "rompe",
        "rompes",
        "rompe",
        "rompions",
        "rompiez",
        "rompent"
      ],
      "imperatif": [
        null,
        "romps",
        null,
        "rompons",
        "rompez",
        null
      ]
    }
  },
  "interrompre": {
    "g": "g3re",
    "f": {
      "presente": [
        "interromps",
        "interromps",
        "interrompt",
        "interrompons",
        "interrompez",
        "interrompent"
      ],
      "imparfait": [
        "interrompais",
        "interrompais",
        "interrompait",
        "interrompions",
        "interrompiez",
        "interrompaient"
      ],
      "passeCompose": [
        "ai interrompu",
        "as interrompu",
        "a interrompu",
        "avons interrompu",
        "avez interrompu",
        "ont interrompu"
      ],
      "plusQueParfait": [
        "avais interrompu",
        "avais interrompu",
        "avait interrompu",
        "avions interrompu",
        "aviez interrompu",
        "avaient interrompu"
      ],
      "futurSimple": [
        "interromprai",
        "interrompras",
        "interrompra",
        "interromprons",
        "interromprez",
        "interrompront"
      ],
      "condPresente": [
        "interromprais",
        "interromprais",
        "interromprait",
        "interromprions",
        "interrompriez",
        "interrompraient"
      ],
      "subjPresente": [
        "interrompe",
        "interrompes",
        "interrompe",
        "interrompions",
        "interrompiez",
        "interrompent"
      ],
      "imperatif": [
        null,
        "interromps",
        null,
        "interrompons",
        "interrompez",
        null
      ]
    }
  },
  "attendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "attends",
        "attends",
        "attend",
        "attendons",
        "attendez",
        "attendent"
      ],
      "imparfait": [
        "attendais",
        "attendais",
        "attendait",
        "attendions",
        "attendiez",
        "attendaient"
      ],
      "passeCompose": [
        "ai attendu",
        "as attendu",
        "a attendu",
        "avons attendu",
        "avez attendu",
        "ont attendu"
      ],
      "plusQueParfait": [
        "avais attendu",
        "avais attendu",
        "avait attendu",
        "avions attendu",
        "aviez attendu",
        "avaient attendu"
      ],
      "futurSimple": [
        "attendrai",
        "attendras",
        "attendra",
        "attendrons",
        "attendrez",
        "attendront"
      ],
      "condPresente": [
        "attendrais",
        "attendrais",
        "attendrait",
        "attendrions",
        "attendriez",
        "attendraient"
      ],
      "subjPresente": [
        "attende",
        "attendes",
        "attende",
        "attendions",
        "attendiez",
        "attendent"
      ],
      "imperatif": [
        null,
        "attends",
        null,
        "attendons",
        "attendez",
        null
      ]
    }
  },
  "entendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "entends",
        "entends",
        "entend",
        "entendons",
        "entendez",
        "entendent"
      ],
      "imparfait": [
        "entendais",
        "entendais",
        "entendait",
        "entendions",
        "entendiez",
        "entendaient"
      ],
      "passeCompose": [
        "ai entendu",
        "as entendu",
        "a entendu",
        "avons entendu",
        "avez entendu",
        "ont entendu"
      ],
      "plusQueParfait": [
        "avais entendu",
        "avais entendu",
        "avait entendu",
        "avions entendu",
        "aviez entendu",
        "avaient entendu"
      ],
      "futurSimple": [
        "entendrai",
        "entendras",
        "entendra",
        "entendrons",
        "entendrez",
        "entendront"
      ],
      "condPresente": [
        "entendrais",
        "entendrais",
        "entendrait",
        "entendrions",
        "entendriez",
        "entendraient"
      ],
      "subjPresente": [
        "entende",
        "entendes",
        "entende",
        "entendions",
        "entendiez",
        "entendent"
      ],
      "imperatif": [
        null,
        "entends",
        null,
        "entendons",
        "entendez",
        null
      ]
    }
  },
  "vendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "vends",
        "vends",
        "vend",
        "vendons",
        "vendez",
        "vendent"
      ],
      "imparfait": [
        "vendais",
        "vendais",
        "vendait",
        "vendions",
        "vendiez",
        "vendaient"
      ],
      "passeCompose": [
        "ai vendu",
        "as vendu",
        "a vendu",
        "avons vendu",
        "avez vendu",
        "ont vendu"
      ],
      "plusQueParfait": [
        "avais vendu",
        "avais vendu",
        "avait vendu",
        "avions vendu",
        "aviez vendu",
        "avaient vendu"
      ],
      "futurSimple": [
        "vendrai",
        "vendras",
        "vendra",
        "vendrons",
        "vendrez",
        "vendront"
      ],
      "condPresente": [
        "vendrais",
        "vendrais",
        "vendrait",
        "vendrions",
        "vendriez",
        "vendraient"
      ],
      "subjPresente": [
        "vende",
        "vendes",
        "vende",
        "vendions",
        "vendiez",
        "vendent"
      ],
      "imperatif": [
        null,
        "vends",
        null,
        "vendons",
        "vendez",
        null
      ]
    }
  },
  "descendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "descends",
        "descends",
        "descend",
        "descendons",
        "descendez",
        "descendent"
      ],
      "imparfait": [
        "descendais",
        "descendais",
        "descendait",
        "descendions",
        "descendiez",
        "descendaient"
      ],
      "passeCompose": [
        "ai descendu",
        "as descendu",
        "a descendu",
        "avons descendu",
        "avez descendu",
        "ont descendu"
      ],
      "plusQueParfait": [
        "avais descendu",
        "avais descendu",
        "avait descendu",
        "avions descendu",
        "aviez descendu",
        "avaient descendu"
      ],
      "futurSimple": [
        "descendrai",
        "descendras",
        "descendra",
        "descendrons",
        "descendrez",
        "descendront"
      ],
      "condPresente": [
        "descendrais",
        "descendrais",
        "descendrait",
        "descendrions",
        "descendriez",
        "descendraient"
      ],
      "subjPresente": [
        "descende",
        "descendes",
        "descende",
        "descendions",
        "descendiez",
        "descendent"
      ],
      "imperatif": [
        null,
        "descends",
        null,
        "descendons",
        "descendez",
        null
      ]
    }
  },
  "répondre": {
    "g": "g3re",
    "f": {
      "presente": [
        "réponds",
        "réponds",
        "répond",
        "répondons",
        "répondez",
        "répondent"
      ],
      "imparfait": [
        "répondais",
        "répondais",
        "répondait",
        "répondions",
        "répondiez",
        "répondaient"
      ],
      "passeCompose": [
        "ai répondu",
        "as répondu",
        "a répondu",
        "avons répondu",
        "avez répondu",
        "ont répondu"
      ],
      "plusQueParfait": [
        "avais répondu",
        "avais répondu",
        "avait répondu",
        "avions répondu",
        "aviez répondu",
        "avaient répondu"
      ],
      "futurSimple": [
        "répondrai",
        "répondras",
        "répondra",
        "répondrons",
        "répondrez",
        "répondront"
      ],
      "condPresente": [
        "répondrais",
        "répondrais",
        "répondrait",
        "répondrions",
        "répondriez",
        "répondraient"
      ],
      "subjPresente": [
        "réponde",
        "répondes",
        "réponde",
        "répondions",
        "répondiez",
        "répondent"
      ],
      "imperatif": [
        null,
        "réponds",
        null,
        "répondons",
        "répondez",
        null
      ]
    }
  },
  "perdre": {
    "g": "g3re",
    "f": {
      "presente": [
        "perds",
        "perds",
        "perd",
        "perdons",
        "perdez",
        "perdent"
      ],
      "imparfait": [
        "perdais",
        "perdais",
        "perdait",
        "perdions",
        "perdiez",
        "perdaient"
      ],
      "passeCompose": [
        "ai perdu",
        "as perdu",
        "a perdu",
        "avons perdu",
        "avez perdu",
        "ont perdu"
      ],
      "plusQueParfait": [
        "avais perdu",
        "avais perdu",
        "avait perdu",
        "avions perdu",
        "aviez perdu",
        "avaient perdu"
      ],
      "futurSimple": [
        "perdrai",
        "perdras",
        "perdra",
        "perdrons",
        "perdrez",
        "perdront"
      ],
      "condPresente": [
        "perdrais",
        "perdrais",
        "perdrait",
        "perdrions",
        "perdriez",
        "perdraient"
      ],
      "subjPresente": [
        "perde",
        "perdes",
        "perde",
        "perdions",
        "perdiez",
        "perdent"
      ],
      "imperatif": [
        null,
        "perds",
        null,
        "perdons",
        "perdez",
        null
      ]
    }
  },
  "rendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "rends",
        "rends",
        "rend",
        "rendons",
        "rendez",
        "rendent"
      ],
      "imparfait": [
        "rendais",
        "rendais",
        "rendait",
        "rendions",
        "rendiez",
        "rendaient"
      ],
      "passeCompose": [
        "ai rendu",
        "as rendu",
        "a rendu",
        "avons rendu",
        "avez rendu",
        "ont rendu"
      ],
      "plusQueParfait": [
        "avais rendu",
        "avais rendu",
        "avait rendu",
        "avions rendu",
        "aviez rendu",
        "avaient rendu"
      ],
      "futurSimple": [
        "rendrai",
        "rendras",
        "rendra",
        "rendrons",
        "rendrez",
        "rendront"
      ],
      "condPresente": [
        "rendrais",
        "rendrais",
        "rendrait",
        "rendrions",
        "rendriez",
        "rendraient"
      ],
      "subjPresente": [
        "rende",
        "rendes",
        "rende",
        "rendions",
        "rendiez",
        "rendent"
      ],
      "imperatif": [
        null,
        "rends",
        null,
        "rendons",
        "rendez",
        null
      ]
    }
  },
  "défendre": {
    "g": "g3re",
    "f": {
      "presente": [
        "défends",
        "défends",
        "défend",
        "défendons",
        "défendez",
        "défendent"
      ],
      "imparfait": [
        "défendais",
        "défendais",
        "défendait",
        "défendions",
        "défendiez",
        "défendaient"
      ],
      "passeCompose": [
        "ai défendu",
        "as défendu",
        "a défendu",
        "avons défendu",
        "avez défendu",
        "ont défendu"
      ],
      "plusQueParfait": [
        "avais défendu",
        "avais défendu",
        "avait défendu",
        "avions défendu",
        "aviez défendu",
        "avaient défendu"
      ],
      "futurSimple": [
        "défendrai",
        "défendras",
        "défendra",
        "défendrons",
        "défendrez",
        "défendront"
      ],
      "condPresente": [
        "défendrais",
        "défendrais",
        "défendrait",
        "défendrions",
        "défendriez",
        "défendraient"
      ],
      "subjPresente": [
        "défende",
        "défendes",
        "défende",
        "défendions",
        "défendiez",
        "défendent"
      ],
      "imperatif": [
        null,
        "défends",
        null,
        "défendons",
        "défendez",
        null
      ]
    }
  },
  "boire": {
    "g": "g3re",
    "f": {
      "presente": [
        "bois",
        "bois",
        "boit",
        "buvons",
        "buvez",
        "boivent"
      ],
      "imparfait": [
        "buvais",
        "buvais",
        "buvait",
        "buvions",
        "buviez",
        "buvaient"
      ],
      "passeCompose": [
        "ai bu",
        "as bu",
        "a bu",
        "avons bu",
        "avez bu",
        "ont bu"
      ],
      "plusQueParfait": [
        "avais bu",
        "avais bu",
        "avait bu",
        "avions bu",
        "aviez bu",
        "avaient bu"
      ],
      "futurSimple": [
        "boirai",
        "boiras",
        "boira",
        "boirons",
        "boirez",
        "boiront"
      ],
      "condPresente": [
        "boirais",
        "boirais",
        "boirait",
        "boirions",
        "boiriez",
        "boiraient"
      ],
      "subjPresente": [
        "boive",
        "boives",
        "boive",
        "buvions",
        "buviez",
        "boivent"
      ],
      "imperatif": [
        null,
        "bois",
        null,
        "buvons",
        "buvez",
        null
      ]
    }
  },
  "croire": {
    "g": "g3re",
    "f": {
      "presente": [
        "crois",
        "crois",
        "croit",
        "croyons",
        "croyez",
        "croient"
      ],
      "imparfait": [
        "croyais",
        "croyais",
        "croyait",
        "croyions",
        "croyiez",
        "croyaient"
      ],
      "passeCompose": [
        "ai cru",
        "as cru",
        "a cru",
        "avons cru",
        "avez cru",
        "ont cru"
      ],
      "plusQueParfait": [
        "avais cru",
        "avais cru",
        "avait cru",
        "avions cru",
        "aviez cru",
        "avaient cru"
      ],
      "futurSimple": [
        "croirai",
        "croiras",
        "croira",
        "croirons",
        "croirez",
        "croiront"
      ],
      "condPresente": [
        "croirais",
        "croirais",
        "croirait",
        "croirions",
        "croiriez",
        "croiraient"
      ],
      "subjPresente": [
        "croie",
        "croies",
        "croie",
        "croyions",
        "croyiez",
        "croient"
      ],
      "imperatif": [
        null,
        "crois",
        null,
        "croyons",
        "croyez",
        null
      ]
    }
  },
  "rire": {
    "g": "g3re",
    "f": {
      "presente": [
        "ris",
        "ris",
        "rit",
        "rions",
        "riez",
        "rient"
      ],
      "imparfait": [
        "riais",
        "riais",
        "riait",
        "riions",
        "riiez",
        "riaient"
      ],
      "passeCompose": [
        "ai ri",
        "as ri",
        "a ri",
        "avons ri",
        "avez ri",
        "ont ri"
      ],
      "plusQueParfait": [
        "avais ri",
        "avais ri",
        "avait ri",
        "avions ri",
        "aviez ri",
        "avaient ri"
      ],
      "futurSimple": [
        "rirai",
        "riras",
        "rira",
        "rirons",
        "rirez",
        "riront"
      ],
      "condPresente": [
        "rirais",
        "rirais",
        "rirait",
        "ririons",
        "ririez",
        "riraient"
      ],
      "subjPresente": [
        "rie",
        "ries",
        "rie",
        "riions",
        "riiez",
        "rient"
      ],
      "imperatif": [
        null,
        "ris",
        null,
        "rions",
        "riez",
        null
      ]
    }
  },
  "sourire": {
    "g": "g3re",
    "f": {
      "presente": [
        "souris",
        "souris",
        "sourit",
        "sourions",
        "souriez",
        "sourient"
      ],
      "imparfait": [
        "souriais",
        "souriais",
        "souriait",
        "souriions",
        "souriiez",
        "souriaient"
      ],
      "passeCompose": [
        "ai souri",
        "as souri",
        "a souri",
        "avons souri",
        "avez souri",
        "ont souri"
      ],
      "plusQueParfait": [
        "avais souri",
        "avais souri",
        "avait souri",
        "avions souri",
        "aviez souri",
        "avaient souri"
      ],
      "futurSimple": [
        "sourirai",
        "souriras",
        "sourira",
        "sourirons",
        "sourirez",
        "souriront"
      ],
      "condPresente": [
        "sourirais",
        "sourirais",
        "sourirait",
        "souririons",
        "souririez",
        "souriraient"
      ],
      "subjPresente": [
        "sourie",
        "souries",
        "sourie",
        "souriions",
        "souriiez",
        "sourient"
      ],
      "imperatif": [
        null,
        "souris",
        null,
        "sourions",
        "souriez",
        null
      ]
    }
  },
  "craindre": {
    "g": "g3re",
    "f": {
      "presente": [
        "crains",
        "crains",
        "craint",
        "craignons",
        "craignez",
        "craignent"
      ],
      "imparfait": [
        "craignais",
        "craignais",
        "craignait",
        "craignions",
        "craigniez",
        "craignaient"
      ],
      "passeCompose": [
        "ai craint",
        "as craint",
        "a craint",
        "avons craint",
        "avez craint",
        "ont craint"
      ],
      "plusQueParfait": [
        "avais craint",
        "avais craint",
        "avait craint",
        "avions craint",
        "aviez craint",
        "avaient craint"
      ],
      "futurSimple": [
        "craindrai",
        "craindras",
        "craindra",
        "craindrons",
        "craindrez",
        "craindront"
      ],
      "condPresente": [
        "craindrais",
        "craindrais",
        "craindrait",
        "craindrions",
        "craindriez",
        "craindraient"
      ],
      "subjPresente": [
        "craigne",
        "craignes",
        "craigne",
        "craignions",
        "craigniez",
        "craignent"
      ],
      "imperatif": [
        null,
        "crains",
        null,
        "craignons",
        "craignez",
        null
      ]
    }
  },
  "joindre": {
    "g": "g3re",
    "f": {
      "presente": [
        "joins",
        "joins",
        "joint",
        "joignons",
        "joignez",
        "joignent"
      ],
      "imparfait": [
        "joignais",
        "joignais",
        "joignait",
        "joignions",
        "joigniez",
        "joignaient"
      ],
      "passeCompose": [
        "ai joint",
        "as joint",
        "a joint",
        "avons joint",
        "avez joint",
        "ont joint"
      ],
      "plusQueParfait": [
        "avais joint",
        "avais joint",
        "avait joint",
        "avions joint",
        "aviez joint",
        "avaient joint"
      ],
      "futurSimple": [
        "joindrai",
        "joindras",
        "joindra",
        "joindrons",
        "joindrez",
        "joindront"
      ],
      "condPresente": [
        "joindrais",
        "joindrais",
        "joindrait",
        "joindrions",
        "joindriez",
        "joindraient"
      ],
      "subjPresente": [
        "joigne",
        "joignes",
        "joigne",
        "joignions",
        "joigniez",
        "joignent"
      ],
      "imperatif": [
        null,
        "joins",
        null,
        "joignons",
        "joignez",
        null
      ]
    }
  },
  "atteindre": {
    "g": "g3re",
    "f": {
      "presente": [
        "atteins",
        "atteins",
        "atteint",
        "atteignons",
        "atteignez",
        "atteignent"
      ],
      "imparfait": [
        "atteignais",
        "atteignais",
        "atteignait",
        "atteignions",
        "atteigniez",
        "atteignaient"
      ],
      "passeCompose": [
        "ai atteint",
        "as atteint",
        "a atteint",
        "avons atteint",
        "avez atteint",
        "ont atteint"
      ],
      "plusQueParfait": [
        "avais atteint",
        "avais atteint",
        "avait atteint",
        "avions atteint",
        "aviez atteint",
        "avaient atteint"
      ],
      "futurSimple": [
        "atteindrai",
        "atteindras",
        "atteindra",
        "atteindrons",
        "atteindrez",
        "atteindront"
      ],
      "condPresente": [
        "atteindrais",
        "atteindrais",
        "atteindrait",
        "atteindrions",
        "atteindriez",
        "atteindraient"
      ],
      "subjPresente": [
        "atteigne",
        "atteignes",
        "atteigne",
        "atteignions",
        "atteigniez",
        "atteignent"
      ],
      "imperatif": [
        null,
        "atteins",
        null,
        "atteignons",
        "atteignez",
        null
      ]
    }
  },
  "résoudre": {
    "g": "g3re",
    "f": {
      "presente": [
        "résous",
        "résous",
        "résout",
        "résolvons",
        "résolvez",
        "résolvent"
      ],
      "imparfait": [
        "résolvais",
        "résolvais",
        "résolvait",
        "résolvions",
        "résolviez",
        "résolvaient"
      ],
      "passeCompose": [
        "ai résolu",
        "as résolu",
        "a résolu",
        "avons résolu",
        "avez résolu",
        "ont résolu"
      ],
      "plusQueParfait": [
        "avais résolu",
        "avais résolu",
        "avait résolu",
        "avions résolu",
        "aviez résolu",
        "avaient résolu"
      ],
      "futurSimple": [
        "résoudrai",
        "résoudras",
        "résoudra",
        "résoudrons",
        "résoudrez",
        "résoudront"
      ],
      "condPresente": [
        "résoudrais",
        "résoudrais",
        "résoudrait",
        "résoudrions",
        "résoudriez",
        "résoudraient"
      ],
      "subjPresente": [
        "résolve",
        "résolves",
        "résolve",
        "résolvions",
        "résolviez",
        "résolvent"
      ],
      "imperatif": [
        null,
        "résous",
        null,
        "résolvons",
        "résolvez",
        null
      ]
    }
  },
  "coudre": {
    "g": "g3re",
    "f": {
      "presente": [
        "couds",
        "couds",
        "coud",
        "cousons",
        "cousez",
        "cousent"
      ],
      "imparfait": [
        "cousais",
        "cousais",
        "cousait",
        "cousions",
        "cousiez",
        "cousaient"
      ],
      "passeCompose": [
        "ai cousu",
        "as cousu",
        "a cousu",
        "avons cousu",
        "avez cousu",
        "ont cousu"
      ],
      "plusQueParfait": [
        "avais cousu",
        "avais cousu",
        "avait cousu",
        "avions cousu",
        "aviez cousu",
        "avaient cousu"
      ],
      "futurSimple": [
        "coudrai",
        "coudras",
        "coudra",
        "coudrons",
        "coudrez",
        "coudront"
      ],
      "condPresente": [
        "coudrais",
        "coudrais",
        "coudrait",
        "coudrions",
        "coudriez",
        "coudraient"
      ],
      "subjPresente": [
        "couse",
        "couses",
        "couse",
        "cousions",
        "cousiez",
        "cousent"
      ],
      "imperatif": [
        null,
        "couds",
        null,
        "cousons",
        "cousez",
        null
      ]
    }
  },
  "moudre": {
    "g": "g3re",
    "f": {
      "presente": [
        "mouds",
        "mouds",
        "moud",
        "moulons",
        "moulez",
        "moulent"
      ],
      "imparfait": [
        "moulais",
        "moulais",
        "moulait",
        "moulions",
        "mouliez",
        "moulaient"
      ],
      "passeCompose": [
        "ai moulu",
        "as moulu",
        "a moulu",
        "avons moulu",
        "avez moulu",
        "ont moulu"
      ],
      "plusQueParfait": [
        "avais moulu",
        "avais moulu",
        "avait moulu",
        "avions moulu",
        "aviez moulu",
        "avaient moulu"
      ],
      "futurSimple": [
        "moudrai",
        "moudras",
        "moudra",
        "moudrons",
        "moudrez",
        "moudront"
      ],
      "condPresente": [
        "moudrais",
        "moudrais",
        "moudrait",
        "moudrions",
        "moudriez",
        "moudraient"
      ],
      "subjPresente": [
        "moule",
        "moules",
        "moule",
        "moulions",
        "mouliez",
        "moulent"
      ],
      "imperatif": [
        null,
        "mouds",
        null,
        "moulons",
        "moulez",
        null
      ]
    }
  },
  "disparaître": {
    "g": "g3re",
    "f": {
      "presente": [
        "disparais",
        "disparais",
        "disparaît",
        "disparaissons",
        "disparaissez",
        "disparaissent"
      ],
      "imparfait": [
        "disparaissais",
        "disparaissais",
        "disparaissait",
        "disparaissions",
        "disparaissiez",
        "disparaissaient"
      ],
      "passeCompose": [
        "ai disparu",
        "as disparu",
        "a disparu",
        "avons disparu",
        "avez disparu",
        "ont disparu"
      ],
      "plusQueParfait": [
        "avais disparu",
        "avais disparu",
        "avait disparu",
        "avions disparu",
        "aviez disparu",
        "avaient disparu"
      ],
      "futurSimple": [
        "disparaîtrai",
        "disparaîtras",
        "disparaîtra",
        "disparaîtrons",
        "disparaîtrez",
        "disparaîtront"
      ],
      "condPresente": [
        "disparaîtrais",
        "disparaîtrais",
        "disparaîtrait",
        "disparaîtrions",
        "disparaîtriez",
        "disparaîtraient"
      ],
      "subjPresente": [
        "disparaisse",
        "disparaisses",
        "disparaisse",
        "disparaissions",
        "disparaissiez",
        "disparaissent"
      ],
      "imperatif": [
        null,
        "disparais",
        null,
        "disparaissons",
        "disparaissez",
        null
      ]
    }
  },
  "paraître": {
    "g": "g3re",
    "f": {
      "presente": [
        "parais",
        "parais",
        "paraît",
        "paraissons",
        "paraissez",
        "paraissent"
      ],
      "imparfait": [
        "paraissais",
        "paraissais",
        "paraissait",
        "paraissions",
        "paraissiez",
        "paraissaient"
      ],
      "passeCompose": [
        "ai paru",
        "as paru",
        "a paru",
        "avons paru",
        "avez paru",
        "ont paru"
      ],
      "plusQueParfait": [
        "avais paru",
        "avais paru",
        "avait paru",
        "avions paru",
        "aviez paru",
        "avaient paru"
      ],
      "futurSimple": [
        "paraîtrai",
        "paraîtras",
        "paraîtra",
        "paraîtrons",
        "paraîtrez",
        "paraîtront"
      ],
      "condPresente": [
        "paraîtrais",
        "paraîtrais",
        "paraîtrait",
        "paraîtrions",
        "paraîtriez",
        "paraîtraient"
      ],
      "subjPresente": [
        "paraisse",
        "paraisses",
        "paraisse",
        "paraissions",
        "paraissiez",
        "paraissent"
      ],
      "imperatif": [
        null,
        "parais",
        null,
        "paraissons",
        "paraissez",
        null
      ]
    }
  },
  "apparaître": {
    "g": "g3re",
    "f": {
      "presente": [
        "apparais",
        "apparais",
        "apparaît",
        "apparaissons",
        "apparaissez",
        "apparaissent"
      ],
      "imparfait": [
        "apparaissais",
        "apparaissais",
        "apparaissait",
        "apparaissions",
        "apparaissiez",
        "apparaissaient"
      ],
      "passeCompose": [
        "ai apparu",
        "as apparu",
        "a apparu",
        "avons apparu",
        "avez apparu",
        "ont apparu"
      ],
      "plusQueParfait": [
        "avais apparu",
        "avais apparu",
        "avait apparu",
        "avions apparu",
        "aviez apparu",
        "avaient apparu"
      ],
      "futurSimple": [
        "apparaîtrai",
        "apparaîtras",
        "apparaîtra",
        "apparaîtrons",
        "apparaîtrez",
        "apparaîtront"
      ],
      "condPresente": [
        "apparaîtrais",
        "apparaîtrais",
        "apparaîtrait",
        "apparaîtrions",
        "apparaîtriez",
        "apparaîtraient"
      ],
      "subjPresente": [
        "apparaisse",
        "apparaisses",
        "apparaisse",
        "apparaissions",
        "apparaissiez",
        "apparaissent"
      ],
      "imperatif": [
        null,
        "apparais",
        null,
        "apparaissons",
        "apparaissez",
        null
      ]
    }
  },
  "pouvoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "peux/puis",
        "peux",
        "peut",
        "pouvons",
        "pouvez",
        "peuvent"
      ],
      "imparfait": [
        "pouvais",
        "pouvais",
        "pouvait",
        "pouvions",
        "pouviez",
        "pouvaient"
      ],
      "passeCompose": [
        "ai pu",
        "as pu",
        "a pu",
        "avons pu",
        "avez pu",
        "ont pu"
      ],
      "plusQueParfait": [
        "avais pu",
        "avais pu",
        "avait pu",
        "avions pu",
        "aviez pu",
        "avaient pu"
      ],
      "futurSimple": [
        "pourrai",
        "pourras",
        "pourra",
        "pourrons",
        "pourrez",
        "pourront"
      ],
      "condPresente": [
        "pourrais",
        "pourrais",
        "pourrait",
        "pourrions",
        "pourriez",
        "pourraient"
      ],
      "subjPresente": [
        "puisse",
        "puisses",
        "puisse",
        "puissions",
        "puissiez",
        "puissent"
      ],
      "imperatif": [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    }
  },
  "vouloir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "veux",
        "veux",
        "veut",
        "voulons",
        "voulez",
        "veulent"
      ],
      "imparfait": [
        "voulais",
        "voulais",
        "voulait",
        "voulions",
        "vouliez",
        "voulaient"
      ],
      "passeCompose": [
        "ai voulu",
        "as voulu",
        "a voulu",
        "avons voulu",
        "avez voulu",
        "ont voulu"
      ],
      "plusQueParfait": [
        "avais voulu",
        "avais voulu",
        "avait voulu",
        "avions voulu",
        "aviez voulu",
        "avaient voulu"
      ],
      "futurSimple": [
        "voudrai",
        "voudras",
        "voudra",
        "voudrons",
        "voudrez",
        "voudront"
      ],
      "condPresente": [
        "voudrais",
        "voudrais",
        "voudrait",
        "voudrions",
        "voudriez",
        "voudraient"
      ],
      "subjPresente": [
        "veuille",
        "veuilles",
        "veuille",
        "voulions",
        "vouliez",
        "veuillent"
      ],
      "imperatif": [
        null,
        "veuille",
        null,
        "veuillons",
        "veuillez",
        null
      ]
    }
  },
  "devoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "dois",
        "dois",
        "doit",
        "devons",
        "devez",
        "doivent"
      ],
      "imparfait": [
        "devais",
        "devais",
        "devait",
        "devions",
        "deviez",
        "devaient"
      ],
      "passeCompose": [
        "ai dû",
        "as dû",
        "a dû",
        "avons dû",
        "avez dû",
        "ont dû"
      ],
      "plusQueParfait": [
        "avais dû",
        "avais dû",
        "avait dû",
        "avions dû",
        "aviez dû",
        "avaient dû"
      ],
      "futurSimple": [
        "devrai",
        "devras",
        "devra",
        "devrons",
        "devrez",
        "devront"
      ],
      "condPresente": [
        "devrais",
        "devrais",
        "devrait",
        "devrions",
        "devriez",
        "devraient"
      ],
      "subjPresente": [
        "doive",
        "doives",
        "doive",
        "devions",
        "deviez",
        "doivent"
      ],
      "imperatif": [
        null,
        "dois",
        null,
        "devons",
        "devez",
        null
      ]
    }
  },
  "savoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "sais",
        "sais",
        "sait",
        "savons",
        "savez",
        "savent"
      ],
      "imparfait": [
        "savais",
        "savais",
        "savait",
        "savions",
        "saviez",
        "savaient"
      ],
      "passeCompose": [
        "ai su",
        "as su",
        "a su",
        "avons su",
        "avez su",
        "ont su"
      ],
      "plusQueParfait": [
        "avais su",
        "avais su",
        "avait su",
        "avions su",
        "aviez su",
        "avaient su"
      ],
      "futurSimple": [
        "saurai",
        "sauras",
        "saura",
        "saurons",
        "saurez",
        "sauront"
      ],
      "condPresente": [
        "saurais",
        "saurais",
        "saurait",
        "saurions",
        "sauriez",
        "sauraient"
      ],
      "subjPresente": [
        "sache",
        "saches",
        "sache",
        "sachions",
        "sachiez",
        "sachent"
      ],
      "imperatif": [
        null,
        "sache",
        null,
        "sachons",
        "sachez",
        null
      ]
    }
  },
  "voir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "vois",
        "vois",
        "voit",
        "voyons",
        "voyez",
        "voient"
      ],
      "imparfait": [
        "voyais",
        "voyais",
        "voyait",
        "voyions",
        "voyiez",
        "voyaient"
      ],
      "passeCompose": [
        "ai vu",
        "as vu",
        "a vu",
        "avons vu",
        "avez vu",
        "ont vu"
      ],
      "plusQueParfait": [
        "avais vu",
        "avais vu",
        "avait vu",
        "avions vu",
        "aviez vu",
        "avaient vu"
      ],
      "futurSimple": [
        "verrai",
        "verras",
        "verra",
        "verrons",
        "verrez",
        "verront"
      ],
      "condPresente": [
        "verrais",
        "verrais",
        "verrait",
        "verrions",
        "verriez",
        "verraient"
      ],
      "subjPresente": [
        "voie",
        "voies",
        "voie",
        "voyions",
        "voyiez",
        "voient"
      ],
      "imperatif": [
        null,
        "vois",
        null,
        "voyons",
        "voyez",
        null
      ]
    }
  },
  "revoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "revois",
        "revois",
        "revoit",
        "revoyons",
        "revoyez",
        "revoient"
      ],
      "imparfait": [
        "revoyais",
        "revoyais",
        "revoyait",
        "revoyions",
        "revoyiez",
        "revoyaient"
      ],
      "passeCompose": [
        "ai revu",
        "as revu",
        "a revu",
        "avons revu",
        "avez revu",
        "ont revu"
      ],
      "plusQueParfait": [
        "avais revu",
        "avais revu",
        "avait revu",
        "avions revu",
        "aviez revu",
        "avaient revu"
      ],
      "futurSimple": [
        "reverrai",
        "reverras",
        "reverra",
        "reverrons",
        "reverrez",
        "reverront"
      ],
      "condPresente": [
        "reverrais",
        "reverrais",
        "reverrait",
        "reverrions",
        "reverriez",
        "reverraient"
      ],
      "subjPresente": [
        "revoie",
        "revoies",
        "revoie",
        "revoyions",
        "revoyiez",
        "revoient"
      ],
      "imperatif": [
        null,
        "revois",
        null,
        "revoyons",
        "revoyez",
        null
      ]
    }
  },
  "recevoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "reçois",
        "reçois",
        "reçoit",
        "recevons",
        "recevez",
        "reçoivent"
      ],
      "imparfait": [
        "recevais",
        "recevais",
        "recevait",
        "recevions",
        "receviez",
        "recevaient"
      ],
      "passeCompose": [
        "ai reçu",
        "as reçu",
        "a reçu",
        "avons reçu",
        "avez reçu",
        "ont reçu"
      ],
      "plusQueParfait": [
        "avais reçu",
        "avais reçu",
        "avait reçu",
        "avions reçu",
        "aviez reçu",
        "avaient reçu"
      ],
      "futurSimple": [
        "recevrai",
        "recevras",
        "recevra",
        "recevrons",
        "recevrez",
        "recevront"
      ],
      "condPresente": [
        "recevrais",
        "recevrais",
        "recevrait",
        "recevrions",
        "recevriez",
        "recevraient"
      ],
      "subjPresente": [
        "reçoive",
        "reçoives",
        "reçoive",
        "recevions",
        "receviez",
        "reçoivent"
      ],
      "imperatif": [
        null,
        "reçois",
        null,
        "recevons",
        "recevez",
        null
      ]
    }
  },
  "apercevoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "aperçois",
        "aperçois",
        "aperçoit",
        "apercevons",
        "apercevez",
        "aperçoivent"
      ],
      "imparfait": [
        "apercevais",
        "apercevais",
        "apercevait",
        "apercevions",
        "aperceviez",
        "apercevaient"
      ],
      "passeCompose": [
        "ai aperçu",
        "as aperçu",
        "a aperçu",
        "avons aperçu",
        "avez aperçu",
        "ont aperçu"
      ],
      "plusQueParfait": [
        "avais aperçu",
        "avais aperçu",
        "avait aperçu",
        "avions aperçu",
        "aviez aperçu",
        "avaient aperçu"
      ],
      "futurSimple": [
        "apercevrai",
        "apercevras",
        "apercevra",
        "apercevrons",
        "apercevrez",
        "apercevront"
      ],
      "condPresente": [
        "apercevrais",
        "apercevrais",
        "apercevrait",
        "apercevrions",
        "apercevriez",
        "apercevraient"
      ],
      "subjPresente": [
        "aperçoive",
        "aperçoives",
        "aperçoive",
        "apercevions",
        "aperceviez",
        "aperçoivent"
      ],
      "imperatif": [
        null,
        "aperçois",
        null,
        "apercevons",
        "apercevez",
        null
      ]
    }
  },
  "décevoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "déçois",
        "déçois",
        "déçoit",
        "décevons",
        "décevez",
        "déçoivent"
      ],
      "imparfait": [
        "décevais",
        "décevais",
        "décevait",
        "décevions",
        "déceviez",
        "décevaient"
      ],
      "passeCompose": [
        "ai déçu",
        "as déçu",
        "a déçu",
        "avons déçu",
        "avez déçu",
        "ont déçu"
      ],
      "plusQueParfait": [
        "avais déçu",
        "avais déçu",
        "avait déçu",
        "avions déçu",
        "aviez déçu",
        "avaient déçu"
      ],
      "futurSimple": [
        "décevrai",
        "décevras",
        "décevra",
        "décevrons",
        "décevrez",
        "décevront"
      ],
      "condPresente": [
        "décevrais",
        "décevrais",
        "décevrait",
        "décevrions",
        "décevriez",
        "décevraient"
      ],
      "subjPresente": [
        "déçoive",
        "déçoives",
        "déçoive",
        "décevions",
        "déceviez",
        "déçoivent"
      ],
      "imperatif": [
        null,
        "déçois",
        null,
        "décevons",
        "décevez",
        null
      ]
    }
  },
  "falloir": {
    "g": "g3oir",
    "f": {
      "presente": [
        null,
        null,
        "faut",
        null,
        null,
        null
      ],
      "imparfait": [
        null,
        null,
        "fallait",
        null,
        null,
        null
      ],
      "passeCompose": [
        "ai faundefined",
        "as faundefined",
        "a faundefined",
        "avons faundefined",
        "avez faundefined",
        "ont faundefined"
      ],
      "plusQueParfait": [
        "avais faundefined",
        "avais faundefined",
        "avait faundefined",
        "avions faundefined",
        "aviez faundefined",
        "avaient faundefined"
      ],
      "futurSimple": [
        null,
        null,
        "faudra",
        null,
        null,
        null
      ],
      "condPresente": [
        null,
        null,
        "faudrait",
        null,
        null,
        null
      ],
      "subjPresente": [
        null,
        null,
        "faille",
        null,
        null,
        null
      ],
      "imperatif": [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    }
  },
  "pleuvoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "pleut",
        "pleuvent",
        null,
        null,
        null,
        null
      ],
      "imparfait": [
        "pleuvait",
        "pleuvaient",
        null,
        null,
        null,
        null
      ],
      "passeCompose": [
        "ai plundefined",
        "as plundefined",
        "a plundefined",
        "avons plundefined",
        "avez plundefined",
        "ont plundefined"
      ],
      "plusQueParfait": [
        "avais plundefined",
        "avais plundefined",
        "avait plundefined",
        "avions plundefined",
        "aviez plundefined",
        "avaient plundefined"
      ],
      "futurSimple": [
        "pleuvra",
        "pleuvront",
        null,
        null,
        null,
        null
      ],
      "condPresente": [
        "pleuvrait",
        "pleuvraient",
        null,
        null,
        null,
        null
      ],
      "subjPresente": [
        "pleuve",
        "pleuvent",
        null,
        null,
        null,
        null
      ],
      "imperatif": [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    }
  },
  "valoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "vaux",
        "vaux",
        "vaut",
        "valons",
        "valez",
        "valent"
      ],
      "imparfait": [
        "valais",
        "valais",
        "valait",
        "valions",
        "valiez",
        "valaient"
      ],
      "passeCompose": [
        "ai valu",
        "as valu",
        "a valu",
        "avons valu",
        "avez valu",
        "ont valu"
      ],
      "plusQueParfait": [
        "avais valu",
        "avais valu",
        "avait valu",
        "avions valu",
        "aviez valu",
        "avaient valu"
      ],
      "futurSimple": [
        "vaudrai",
        "vaudras",
        "vaudra",
        "vaudrons",
        "vaudrez",
        "vaudront"
      ],
      "condPresente": [
        "vaudrais",
        "vaudrais",
        "vaudrait",
        "vaudrions",
        "vaudriez",
        "vaudraient"
      ],
      "subjPresente": [
        "vaille",
        "vailles",
        "vaille",
        "valions",
        "valiez",
        "vaillent"
      ],
      "imperatif": [
        null,
        "vaux",
        null,
        "valons",
        "valez",
        null
      ]
    }
  },
  "s'asseoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "m'assieds/assois",
        "t'assieds/assois",
        "s'assied/assoit",
        "nous asseyons/assoyons",
        "vous asseyez/assoyez",
        "s'asseyent/assoient"
      ],
      "imparfait": [
        "m'asseyais/assoyais",
        "t'asseyais/assoyais",
        "s'asseyait/assoyait",
        "nous asseyions/assoyions",
        "vous asseyiez/assoyiez",
        "s'asseyaient/assoyaient"
      ],
      "passeCompose": [
        "me suis assis",
        "t'es assis",
        "s'est assis",
        "nous sommes assiss",
        "vous êtes assiss",
        "se sont assiss"
      ],
      "plusQueParfait": [
        "m'étais assis",
        "t'étais assis",
        "s'était assis",
        "nous étions assiss",
        "vous étiez assiss",
        "s'étaient assiss"
      ],
      "futurSimple": [
        "m'assiérai/asseyerai/assoirai",
        "t'assiéras/asseyeras/assoiras",
        "s'assiéra/asseyera/assoira",
        "nous assiérons/asseyerons/assoirons",
        "vous assiérez/asseyerez/assoirez",
        "s'assiéront/asseyeront/assoiront"
      ],
      "condPresente": [
        "m'assiérais/asseyerais/assoirais",
        "t'assiérais/asseyerais/assoirais",
        "s'assiérait/asseyerait/assoirait",
        "nous assiérions/asseyerions/assoirions",
        "vous assiériez/asseyeriez/assoiriez",
        "s'assiéraient/asseyeraient/assoiraient"
      ],
      "subjPresente": [
        "m'asseye/assoie",
        "t'asseyes/assoies",
        "s'asseye/assoie",
        "nous asseyions/assoyions",
        "vous asseyiez/assoyiez",
        "s'asseyent/assoient"
      ],
      "imperatif": [
        null,
        "t'assieds/assois",
        null,
        "nous asseyons/assoyons",
        "vous asseyez/assoyez",
        null
      ]
    }
  },
  "prévoir": {
    "g": "g3oir",
    "f": {
      "presente": [
        "prévois",
        "prévois",
        "prévoit",
        "prévoyons",
        "prévoyez",
        "prévoient"
      ],
      "imparfait": [
        "prévoyais",
        "prévoyais",
        "prévoyait",
        "prévoyions",
        "prévoyiez",
        "prévoyaient"
      ],
      "passeCompose": [
        "ai prévu",
        "as prévu",
        "a prévu",
        "avons prévu",
        "avez prévu",
        "ont prévu"
      ],
      "plusQueParfait": [
        "avais prévu",
        "avais prévu",
        "avait prévu",
        "avions prévu",
        "aviez prévu",
        "avaient prévu"
      ],
      "futurSimple": [
        "prévoirai",
        "prévoiras",
        "prévoira",
        "prévoirons",
        "prévoirez",
        "prévoiront"
      ],
      "condPresente": [
        "prévoirais",
        "prévoirais",
        "prévoirait",
        "prévoirions",
        "prévoiriez",
        "prévoiraient"
      ],
      "subjPresente": [
        "prévoie",
        "prévoies",
        "prévoie",
        "prévoyions",
        "prévoyiez",
        "prévoient"
      ],
      "imperatif": [
        null,
        "prévois",
        null,
        "prévoyons",
        "prévoyez",
        null
      ]
    }
  }
};
