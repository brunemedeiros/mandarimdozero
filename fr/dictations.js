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
