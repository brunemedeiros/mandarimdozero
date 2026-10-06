// ---------- Ditados ----------
// Um ditado por módulo (não por unidade), amarrado à tarefa comunicativa
// geral do módulo — a "prova social" do que o aluno deveria ser capaz de
// fazer depois de completar as unidades daquele módulo.
//
// Cada ditado tem UM áudio guiado pré-gerado (audio/dictation-<id>-guided.mp3),
// reproduzindo a estrutura real de um ditado DELF A1 (ver
// gen_guided_dictation_audio.py, gerado via SSML com pausas controladas):
//   1. Locução de abertura ("Français avec Prof. Brune, dictée N.")
//   2. Leitura de reconhecimento (texto inteiro, ritmo um pouco mais lento,
//      sem pontuação falada)
//   3. Transição ("Nous allons commencer la dictée. Écrivez.")
//   4. Ditado por cláusula: cada cláusula (delimitada por vírgula/ponto no
//      texto original) é lida, a pontuação é falada em voz alta
//      ("virgule"/"point"/"point d'interrogation"/"point d'exclamation"),
//      pausa longa pra escrita, depois a MESMA cláusula é repetida antes de
//      avançar pra próxima
//   5. Transição ("Je vais relire la dictée. Vérifiez.") + releitura final
//      inteira, dessa vez com a pontuação falada, ritmo normal, pra revisão
//
// `free` marca a que plano o ditado pertence (ainda SEM bloqueio no app: a
// interface, o paywall e o Stripe entram depois; hoje só rotula Free x Premium):
//   free:true  -> o ditado Free do módulo (1 por módulo). Aparece em
//                 Desafios > Ditados E na unidade "Desafios do Módulo N".
//   free:false -> ditados Premium. Aparecem SÓ na unidade "Desafios do
//                 Módulo N" -- nunca em Desafios > Ditados e nunca na trilha.
// O id define o nome do áudio (audio/dictation-<id>-guided.mp3), gerado pela
// Action "Áudio TTS" (modo ditados). A ordem do array define o "dictée N" falado.

// ---------- Revisão do nível ----------
// Ditados que juntam o conteúdo de 2 módulos, no estilo dos ditados do DELF
// A1 (alguém fala de si, de onde mora, do dia, do passado). Ficam numa unidade
// "Revisão do A1" no fim do nível (moduleId "A1-revisao"), não em um módulo.
// `opening` troca o anúncio falado em francês antes das instruções.
// Vira true depois de rodar a Action "Áudio TTS" no modo ditados-en (gera os
// dictation-<id>-guided.en.mp3 com as instruções em inglês).
const DICTATION_AUDIO_EN_READY = false;

const DICTATIONS = [
  {
    id: "d1",
    moduleId: "A1-m1",
    level: "A1",
    task: "Se apresentando em sala de aula",
    text: "Bonjour ! Je m'appelle Sophie. J'ai vingt-cinq ans et je suis française. Et toi, comment tu t'appelles ?",
    free: true
  },
  {
    id: "d2",
    moduleId: "A1-m2",
    level: "A1",
    task: "Pedindo pão",
    text: "Il est huit heures du matin. Bonjour, je voudrais du pain, s'il vous plaît, et un croissant. C'est combien ? Merci, au revoir !",
    free: true
  },
  {
    id: "d3",
    moduleId: "A1-m3",
    level: "A1",
    task: "Explicando o caminho até o museu",
    text: "Le musée est loin d'ici. Tournez à droite, puis allez tout droit. Le musée est à gauche, c'est très près.",
    free: true
  },
  {
    id: "d4",
    moduleId: "A1-m4",
    level: "A1",
    task: "Um dia de chuva e dor de barriga",
    text: "Aujourd'hui, il pleut et il fait froid. J'ai mal au ventre, alors je vais à la pharmacie. Je prends le bus, puis le métro.",
    free: true
  },
  {
    id: "d5",
    moduleId: "A1-m5",
    level: "A1",
    task: "Apresentando a irmã e a casa dela",
    text: "Ma sœur s'appelle Clara. Elle est grande et gentille. Son appartement est petit. Dans sa chambre, il y a un lit, une table et une lampe.",
    free: true
  },
  {
    id: "d6",
    moduleId: "A1-m6",
    level: "A1",
    task: "Planejando o fim de semana",
    text: "Le week-end, j'aime lire. Samedi matin, je vais au marché. Samedi soir, on va au cinéma. Dimanche, je mange au restaurant avec ma sœur.",
    free: true
  },
  {
    id: "d1-p1",
    moduleId: "A1-m1",
    level: "A1",
    task: "Apresentando um colega e uma amiga",
    text: "Bonsoir ! Je m'appelle Marc. Je suis français et j'ai vingt-deux ans. Mon amie s'appelle Julie. Elle est brésilienne. Au revoir, à bientôt !",
    free: false
  },
  {
    id: "d1-p2",
    moduleId: "A1-m1",
    level: "A1",
    task: "Apresentando dois amigos",
    text: "Ana est brésilienne. Elle a vingt ans. Elle s'appelle Ana Silva. Paul est français. Il a vingt et un ans. Bonsoir, Paul !",
    free: false
  },
  {
    id: "d2-p1",
    moduleId: "A1-m2",
    level: "A1",
    task: "A manhã de uma terça-feira",
    text: "Aujourd'hui, nous sommes mardi. Je me lève à six heures. Je bois du lait et je mange du pain. Je travaille à huit heures. Le soir, je mange du fromage.",
    free: false
  },
  {
    id: "d2-p2",
    moduleId: "A1-m2",
    level: "A1",
    task: "Um dia de descanso",
    text: "Le matin, je me lève à sept heures. Je bois du café et je mange du pain. À midi, je mange du fromage. Il est sept heures du soir, c'est l'heure du dîner.",
    free: false
  },
  {
    id: "d3-p1",
    moduleId: "A1-m3",
    level: "A1",
    task: "Uma brasileira em Paris",
    text: "Je m'appelle Sofia et je viens du Brésil. Tom est américain. Il habite à Paris. Je cherche un pantalon. Il coûte cinquante euros.",
    free: false
  },
  {
    id: "d3-p2",
    moduleId: "A1-m3",
    level: "A1",
    task: "Comprando uma roupa",
    text: "Je cherche une robe, s'il vous plaît. La robe rouge coûte quarante euros. Le pantalon coûte cinquante euros. Je prends la robe, merci !",
    free: false
  },
  {
    id: "d4-p1",
    moduleId: "A1-m4",
    level: "A1",
    task: "Léa na farmácia",
    text: "Aujourd'hui, Léa ne va pas bien. Elle a mal au ventre. Elle va à la pharmacie. La pharmacie n'est pas loin de la station de métro.",
    free: false
  },
  {
    id: "d4-p2",
    moduleId: "A1-m4",
    level: "A1",
    task: "Um dia de inverno",
    text: "En hiver, il fait froid. Tous les jours, je prends le bus. Aujourd'hui, il pleut, alors je prends le métro. La station est près de la maison.",
    free: false
  },
  {
    id: "d5-p1",
    moduleId: "A1-m5",
    level: "A1",
    task: "Passeando pela casa",
    text: "Voici ma maison. Il y a une cuisine et un salon. La cuisine est à côté du salon. Ma chambre est grande, il y a une fenêtre.",
    free: false
  },
  {
    id: "d5-p2",
    moduleId: "A1-m5",
    level: "A1",
    task: "O quarto e as coisas dele",
    text: "Dans ma chambre, il y a un lit et une table. La lampe est sur la table. Mon sac est sous la chaise. Mon pull est rouge.",
    free: false
  },
  {
    id: "d6-p1",
    moduleId: "A1-m6",
    level: "A1",
    task: "O que fiz ontem e hoje",
    text: "Hier, j'ai travaillé le matin. Le soir, j'ai mangé au restaurant avec ma sœur. Ce matin, j'ai pris le bus.",
    free: false
  },
  {
    id: "d6-p2",
    moduleId: "A1-m6",
    level: "A1",
    task: "Convidando um amigo para o fim de semana",
    text: "Samedi soir, on va au cinéma avec Paul. Le week-end, j'aime le cinéma et j'aime lire. Dimanche, je mange au restaurant. J'adore le week-end !",
    free: false
  },
  {
    id: "r1",
    moduleId: "A1-revisao",
    level: "A1",
    task: "Revisão do A1 · Eu e minha rotina",
    text: "Bonjour, je m'appelle Julie. Je suis brésilienne et j'ai vingt-cinq ans. Je me lève à sept heures. Le matin, je bois du café et je mange du pain. Je travaille à neuf heures. Le soir, je mange du fromage.",
    free: true,
    opening: "Français avec Prof. Brune, révision du niveau A1, dictée 1."
  },
  {
    id: "r2",
    moduleId: "A1-revisao",
    level: "A1",
    task: "Revisão do A1 · Cidade, compras e deslocamento",
    text: "Je viens du Brésil, mais j'habite à Paris. Aujourd'hui, il pleut et je cherche une robe. Le magasin est loin, alors je prends le métro. La station est près de la maison. La robe coûte quarante euros. Je prends la robe, merci !",
    free: false,
    opening: "Français avec Prof. Brune, révision du niveau A1, dictée 2."
  },
  {
    id: "r3",
    moduleId: "A1-revisao",
    level: "A1",
    task: "Revisão do A1 · Casa, família e fim de semana",
    text: "Ma sœur et moi, nous avons un appartement. Il y a une cuisine, un salon et deux chambres. Ma chambre est grande, la lampe est sur la table. Hier, j'ai mangé au restaurant avec ma sœur. Ce week-end, on va au cinéma.",
    free: false,
    opening: "Français avec Prof. Brune, révision du niveau A1, dictée 3."
  }
];
