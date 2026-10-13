// DITADOS do curso de francês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/fr-pt-BR/layer.js (português) e fr/content.en.js (inglês).
// `task` (descrição da tarefa em português) saiu daqui; `opening` e `text` são francês.
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/fr-<arquivo>.js.txt.

// Vira true depois de rodar a Action "Áudio TTS" no modo ditados-en (gera os dictation-<id>-guided.en.mp3).
const DICTATION_AUDIO_EN_READY = false;

const DICTATIONS = [
  {
    "id": "d1",
    "moduleId": "A1-m1",
    "level": "A1",
    "text": "Bonjour ! Je m'appelle Sophie. J'ai vingt-cinq ans et je suis française. Et toi, comment tu t'appelles ?",
    "free": true
  },
  {
    "id": "d2",
    "moduleId": "A1-m2",
    "level": "A1",
    "text": "Il est huit heures du matin. Bonjour, je voudrais du pain, s'il vous plaît, et un croissant. C'est combien ? Merci, au revoir !",
    "free": true
  },
  {
    "id": "d3",
    "moduleId": "A1-m3",
    "level": "A1",
    "text": "Le musée est loin d'ici. Tournez à droite, puis allez tout droit. Le musée est à gauche, c'est très près.",
    "free": true
  },
  {
    "id": "d4",
    "moduleId": "A1-m4",
    "level": "A1",
    "text": "Aujourd'hui, il pleut et il fait froid. J'ai mal au ventre, alors je vais à la pharmacie. Je prends le bus, puis le métro.",
    "free": true
  },
  {
    "id": "d5",
    "moduleId": "A1-m5",
    "level": "A1",
    "text": "Ma sœur s'appelle Clara. Elle est grande et gentille. Son appartement est petit. Dans sa chambre, il y a un lit, une table et une lampe.",
    "free": true
  },
  {
    "id": "d6",
    "moduleId": "A1-m6",
    "level": "A1",
    "text": "Le week-end, j'aime lire. Samedi matin, je vais au marché. Samedi soir, on va au cinéma. Dimanche, je mange au restaurant avec ma sœur.",
    "free": true
  },
  {
    "id": "d1-p1",
    "moduleId": "A1-m1",
    "level": "A1",
    "text": "Bonsoir ! Je m'appelle Marc. Je suis français et j'ai vingt-deux ans. Mon amie s'appelle Julie. Elle est brésilienne. Au revoir, à bientôt !",
    "free": false
  },
  {
    "id": "d1-p2",
    "moduleId": "A1-m1",
    "level": "A1",
    "text": "Ana est brésilienne. Elle a vingt ans. Elle s'appelle Ana Silva. Paul est français. Il a vingt et un ans. Bonsoir, Paul !",
    "free": false
  },
  {
    "id": "d2-p1",
    "moduleId": "A1-m2",
    "level": "A1",
    "text": "Aujourd'hui, nous sommes mardi. Je me lève à six heures. Je bois du lait et je mange du pain. Je travaille à huit heures. Le soir, je mange du fromage.",
    "free": false
  },
  {
    "id": "d2-p2",
    "moduleId": "A1-m2",
    "level": "A1",
    "text": "Le matin, je me lève à sept heures. Je bois du café et je mange du pain. À midi, je mange du fromage. Il est sept heures du soir, c'est l'heure du dîner.",
    "free": false
  },
  {
    "id": "d3-p1",
    "moduleId": "A1-m3",
    "level": "A1",
    "text": "Je m'appelle Sofia et je viens du Brésil. Tom est américain. Il habite à Paris. Je cherche un pantalon. Il coûte cinquante euros.",
    "free": false
  },
  {
    "id": "d3-p2",
    "moduleId": "A1-m3",
    "level": "A1",
    "text": "Je cherche une robe, s'il vous plaît. La robe rouge coûte quarante euros. Le pantalon coûte cinquante euros. Je prends la robe, merci !",
    "free": false
  },
  {
    "id": "d4-p1",
    "moduleId": "A1-m4",
    "level": "A1",
    "text": "Aujourd'hui, Léa ne va pas bien. Elle a mal au ventre. Elle va à la pharmacie. La pharmacie n'est pas loin de la station de métro.",
    "free": false
  },
  {
    "id": "d4-p2",
    "moduleId": "A1-m4",
    "level": "A1",
    "text": "En hiver, il fait froid. Tous les jours, je prends le bus. Aujourd'hui, il pleut, alors je prends le métro. La station est près de la maison.",
    "free": false
  },
  {
    "id": "d5-p1",
    "moduleId": "A1-m5",
    "level": "A1",
    "text": "Voici ma maison. Il y a une cuisine et un salon. La cuisine est à côté du salon. Ma chambre est grande, il y a une fenêtre.",
    "free": false
  },
  {
    "id": "d5-p2",
    "moduleId": "A1-m5",
    "level": "A1",
    "text": "Dans ma chambre, il y a un lit et une table. La lampe est sur la table. Mon sac est sous la chaise. Mon pull est rouge.",
    "free": false
  },
  {
    "id": "d6-p1",
    "moduleId": "A1-m6",
    "level": "A1",
    "text": "Hier, j'ai travaillé le matin. Le soir, j'ai mangé au restaurant avec ma sœur. Ce matin, j'ai pris le bus.",
    "free": false
  },
  {
    "id": "d6-p2",
    "moduleId": "A1-m6",
    "level": "A1",
    "text": "Samedi soir, on va au cinéma avec Paul. Le week-end, j'aime le cinéma et j'aime lire. Dimanche, je mange au restaurant. J'adore le week-end !",
    "free": false
  },
  {
    "id": "r1",
    "moduleId": "A1-revisao",
    "level": "A1",
    "text": "Bonjour, je m'appelle Julie. Je suis brésilienne et j'ai vingt-cinq ans. Je me lève à sept heures. Le matin, je bois du café et je mange du pain. Je travaille à neuf heures. Le soir, je mange du fromage.",
    "free": true,
    "opening": "Français avec Prof. Brune, révision du niveau A1, dictée 1."
  },
  {
    "id": "r2",
    "moduleId": "A1-revisao",
    "level": "A1",
    "text": "Je viens du Brésil, mais j'habite à Paris. Aujourd'hui, il pleut et je cherche une robe. Le magasin est loin, alors je prends le métro. La station est près de la maison. La robe coûte quarante euros. Je prends la robe, merci !",
    "free": false,
    "opening": "Français avec Prof. Brune, révision du niveau A1, dictée 2."
  },
  {
    "id": "r3",
    "moduleId": "A1-revisao",
    "level": "A1",
    "text": "Ma sœur et moi, nous avons un appartement. Il y a une cuisine, un salon et deux chambres. Ma chambre est grande, la lampe est sur la table. Hier, j'ai mangé au restaurant avec ma sœur. Ce week-end, on va au cinéma.",
    "free": false,
    "opening": "Français avec Prof. Brune, révision du niveau A1, dictée 3."
  }
];
