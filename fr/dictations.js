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
const DICTATIONS = [
  {
    id: "d1",
    moduleId: "A1-m1",
    level: "A1",
    task: "Se apresentando em sala de aula",
    text: "Bonjour à tous ! Je m'appelle Sophie. J'ai vingt-cinq ans et je suis française. J'habite à Lyon. Et vous, comment vous appelez-vous ?",
    free: true
  },
  {
    id: "d2",
    moduleId: "A1-m2",
    level: "A1",
    task: "Fazendo um pedido completo em um bistrô",
    text: "Bonjour, je voudrais un café, s'il vous plaît. Je voudrais aussi un croissant. C'est combien ? Merci beaucoup, au revoir !",
    free: true
  },
  {
    id: "d3",
    moduleId: "A1-m3",
    level: "A1",
    task: "Perguntando o caminho",
    text: "Pardon, où est le musée ? Il est loin d'ici. Tournez à droite, puis tout droit.",
    free: true
  },
  {
    id: "d4",
    moduleId: "A1-m4",
    level: "A1",
    task: "No ponto de ônibus",
    text: "Aujourd'hui, il pleut. Je prends le bus tous les jours. Où est la station de métro, s'il vous plaît ?",
    free: true
  },
  {
    id: "d5",
    moduleId: "A1-m5",
    level: "A1",
    task: "Descrevendo sua irmã",
    text: "Ma sœur est grande et gentille. Son pull est rouge, et son sac est sur la chaise.",
    free: true
  },
  {
    id: "d6",
    moduleId: "A1-m6",
    level: "A1",
    task: "Planejando o fim de semana",
    text: "Le week-end, j'aime lire. Samedi soir, on va au cinéma. Et toi, tu aimes le cinéma ?",
    free: true
  },
  {
    id: "d1-p1",
    moduleId: "A1-m1",
    level: "A1",
    task: "Encontrando um colega",
    text: "Bonsoir, Marc ! Ça va ? Moi, ça va bien, merci. Je m'appelle Julie, et toi, comment tu t'appelles ?",
    free: false
  },
  {
    id: "d1-p2",
    moduleId: "A1-m1",
    level: "A1",
    task: "Dizendo idade e nacionalidade",
    text: "Bonjour, je m'appelle Ana. Je suis brésilienne et j'ai vingt ans. Et toi, quel âge as-tu ?",
    free: false
  },
  {
    id: "d2-p1",
    moduleId: "A1-m2",
    level: "A1",
    task: "Descrevendo a manhã",
    text: "Aujourd'hui, nous sommes mardi. Je me lève à six heures, je bois du lait. Je travaille à huit heures.",
    free: false
  },
  {
    id: "d2-p2",
    moduleId: "A1-m2",
    level: "A1",
    task: "Comprando comida à noite",
    text: "Il est sept heures du soir. Je voudrais du fromage et du pain, s'il vous plaît. C'est combien ?",
    free: false
  },
  {
    id: "d3-p1",
    moduleId: "A1-m3",
    level: "A1",
    task: "Falando de origem",
    text: "Je viens du Brésil, et toi ? Elle est américaine, elle habite à Paris. Nous parlons français.",
    free: false
  },
  {
    id: "d3-p2",
    moduleId: "A1-m3",
    level: "A1",
    task: "Comprando roupa",
    text: "Je cherche une robe, s'il vous plaît. Le pantalon coûte cinquante euros. C'est combien, la robe ?",
    free: false
  },
  {
    id: "d4-p1",
    moduleId: "A1-m4",
    level: "A1",
    task: "Na farmácia",
    text: "Je ne vais pas bien, j'ai mal au ventre. Je vais à la pharmacie, s'il vous plaît. Merci, au revoir !",
    free: false
  },
  {
    id: "d4-p2",
    moduleId: "A1-m4",
    level: "A1",
    task: "Falando do tempo",
    text: "En hiver, il fait froid. Aujourd'hui, il pleut. Je prends le bus, et je vais au travail.",
    free: false
  },
  {
    id: "d5-p1",
    moduleId: "A1-m5",
    level: "A1",
    task: "Descrevendo a casa",
    text: "Il y a une fenêtre dans la chambre. La lampe est sur la table. La cuisine est à côté du salon.",
    free: false
  },
  {
    id: "d5-p2",
    moduleId: "A1-m5",
    level: "A1",
    task: "Descrevendo um quarto",
    text: "Dans ma chambre, il y a un lit et une table. Le sac est sous la chaise, et la lampe est sur la table.",
    free: false
  },
  {
    id: "d6-p1",
    moduleId: "A1-m6",
    level: "A1",
    task: "Contando o dia de ontem",
    text: "Hier, j'ai mangé au restaurant. Ce matin, j'ai pris le bus. Et toi, tu as travaillé hier ?",
    free: false
  },
  {
    id: "d6-p2",
    moduleId: "A1-m6",
    level: "A1",
    task: "Convidando para o cinema",
    text: "On va au cinéma samedi soir ? Oui, bonne idée ! Le week-end, j'aime le cinéma, et toi ?",
    free: false
  }
];
