// ---------- Ditados ----------
// Um ditado por módulo (não por unidade), amarrado à tarefa comunicativa
// geral do módulo — a "prova social" do que o aluno deveria ser capaz de
// fazer depois de completar as unidades daquele módulo. Cada ditado tem
// áudio pré-gerado em duas velocidades: audio/dictation-<id>-normal.mp3 e
// audio/dictation-<id>-slow.mp3 (ver gen_dictation_audio.py).
//
// `free` marca se o ditado está disponível no plano gratuito. Hoje todos
// são `true` — o campo só existe pra não precisar reestruturar os dados
// quando (e se) os ditados virarem uma funcionalidade paga no futuro.
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
  }
];
