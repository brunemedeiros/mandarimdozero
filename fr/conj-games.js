// Jogos da Conjugação (fr). O motor é shared/conj-games.js (vale para qualquer idioma estudado);
// aqui ficam só os dados do francês. Cada jogo escolhe entre duas formas (a / b).
// Frases aprovadas pela autora em 2026-10-14 (revisão em docs/historico/13-...md).
//
// Formato do item:
//   before / after: o texto antes e depois da lacuna (francês)
//   a / b: as duas opções, já como entram na lacuna. Com "je", o pronome vai na opção,
//          porque a elisão muda com a forma (j'ai croisé / je croisais).
//   ans: 'a' | 'b'; verb: infinitivo; clue: trecho da frase que decide (destacado na explicação)
//   text: tradução (tr) e explicação (why) por idioma do site. O curso em inglês não mostra
//         português: sem a chave do idioma, cai no pt-BR só como último recurso.
const CONJ_GAMES = [
  {
    id: 'pc-imparfait',
    title: { 'pt-BR': 'Passé composé ou Imparfait?', en: 'Passé composé or Imparfait?' },
    lede: {
      'pt-BR': 'Complete cada frase com o passé composé ou o imparfait. Depois de responder, veja por que a frase pede aquele tempo.',
      en: 'Complete each sentence with the passé composé or the imparfait. After you answer, see why the sentence calls for that tense.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Passé composé', sketch: 'point', tl: { 'pt-BR': 'um ponto: começou e terminou', en: 'a point: it started and ended' } },
      b: { label: 'Imparfait', sketch: 'line', tl: { 'pt-BR': 'uma linha: em curso, hábito ou descrição', en: 'a line: ongoing, habit or description' } }
    },
    items: [
      { id: 1, before: 'Hier, ', after: ' ma prof au supermarché.', verb: 'croiser', a: "j'ai croisé", b: 'je croisais', ans: 'a', clue: 'Hier',
        text: {
          'pt-BR': { tr: 'Ontem, eu encontrei minha professora no supermercado.', why: 'Cruzar com alguém é um encontro rápido, que aconteceu uma vez só, ontem. Fato único e concluído: passé composé.' },
          en: { tr: 'Yesterday, I ran into my teacher at the supermarket.', why: 'Running into someone is a quick encounter that happened once, yesterday. A single, finished event: passé composé.' } } },
      { id: 2, before: "Quand j'étais petit, ", after: ' dans la rue tous les jours.', verb: 'jouer', a: "j'ai joué", b: 'je jouais', ans: 'b', clue: 'tous les jours',
        text: {
          'pt-BR': { tr: 'Quando eu era pequeno, eu brincava na rua todos os dias.', why: '"Tous les jours" é hábito. O que se repetia no passado, sem começo nem fim marcados, vai para o imparfait.' },
          en: { tr: 'When I was little, I used to play in the street every day.', why: '"Tous les jours" signals a habit. Something that kept happening in the past, with no clear start or end, goes in the imparfait (in English, often "used to").' } } },
      { id: 3, before: '', after: ' la télé quand le téléphone a sonné.', verb: 'regarder', a: "J'ai regardé", b: 'Je regardais', ans: 'b', clue: 'quand le téléphone a sonné',
        text: {
          'pt-BR': { tr: 'Eu estava vendo TV quando o telefone tocou.', why: 'A TV era a ação de fundo, em andamento, quando o telefone tocou. O fundo fica no imparfait; o que interrompe (a sonné) fica no passé composé.' },
          en: { tr: 'I was watching TV when the phone rang.', why: 'Watching TV was the background action, in progress when the phone rang. The background goes in the imparfait ("was watching"); the interruption (a sonné) goes in the passé composé.' } } },
      { id: 4, before: 'Hier soir, ', after: ' un film, puis je suis allé me coucher.', verb: 'regarder', a: "j'ai regardé", b: 'je regardais', ans: 'a', clue: 'puis je suis allé me coucher',
        text: {
          'pt-BR': { tr: 'Ontem à noite, eu vi um filme e depois fui dormir.', why: 'Ações em sequência: uma termina e vem a outra ("puis"). Fatos encadeados vão para o passé composé.' },
          en: { tr: 'Last night, I watched a movie, then I went to bed.', why: 'Actions in a sequence: one ends and the next one starts ("puis"). A chain of events goes in the passé composé.' } } },
      { id: 5, before: "L'année dernière, nous ", after: ' en Italie.', verb: 'aller', a: 'sommes allés', b: 'allions', ans: 'a', clue: "L'année dernière",
        text: {
          'pt-BR': { tr: 'Ano passado, nós fomos para a Itália.', why: 'A ida para a Itália é um fato que aconteceu e terminou, num período já fechado (o ano passado). Passé composé.' },
          en: { tr: 'Last year, we went to Italy.', why: 'The trip to Italy is an event that happened and ended, within a period that is already closed (last year). Passé composé.' } } },
      { id: 6, before: 'À cette époque, nous ', after: ' en Bretagne chaque été.', verb: 'aller', a: 'sommes allés', b: 'allions', ans: 'b', clue: 'chaque été',
        text: {
          'pt-BR': { tr: 'Naquela época, nós íamos para a Bretanha todo verão.', why: '"À cette époque" e "chaque été": algo que se repetia durante um período. Hábito no passado: imparfait.' },
          en: { tr: 'Back then, we used to go to Brittany every summer.', why: '"À cette époque" and "chaque été": something that kept happening over a period. A past habit: imparfait.' } } },
      { id: 7, before: 'Quand je suis rentré, mon frère ', after: '.', verb: 'dormir', a: 'a dormi', b: 'dormait', ans: 'b', clue: 'Quand je suis rentré',
        text: {
          'pt-BR': { tr: 'Quando eu cheguei em casa, meu irmão estava dormindo.', why: 'O irmão já estava dormindo quando eu cheguei. Ação em andamento naquele momento: imparfait.' },
          en: { tr: 'When I got home, my brother was sleeping.', why: 'My brother was already asleep when I got home. An action in progress at that moment: imparfait.' } } },
      { id: 8, before: 'Cette nuit, mon frère ', after: ' pendant huit heures.', verb: 'dormir', a: 'a dormi', b: 'dormait', ans: 'a', clue: 'pendant huit heures',
        text: {
          'pt-BR': { tr: 'Esta noite, meu irmão dormiu oito horas.', why: 'O sono tem duração contada e terminou. Ação vista como um bloco fechado: passé composé.' },
          en: { tr: 'Last night, my brother slept for eight hours.', why: 'The sleep has a counted length and it ended. An action seen as a closed block: passé composé.' } } },
      { id: 9, before: 'Pendant les vacances, il ', after: ' trois jours de suite.', verb: 'pleuvoir', a: 'a plu', b: 'pleuvait', ans: 'a', clue: 'trois jours de suite',
        text: {
          'pt-BR': { tr: 'Nas férias, choveu três dias seguidos.', why: 'A chuva é contada (três dias) e acabou. Um bloco fechado: passé composé.' },
          en: { tr: 'During the vacation, it rained three days in a row.', why: 'The rain is counted (three days) and it ended. A closed block: passé composé.' } } },
      { id: 10, before: 'Quand on habitait à Brest, il ', after: ' presque tous les jours.', verb: 'pleuvoir', a: 'a plu', b: 'pleuvait', ans: 'b', clue: 'presque tous les jours',
        text: {
          'pt-BR': { tr: 'Quando a gente morava em Brest, chovia quase todo dia.', why: 'A frase descreve como era o clima numa fase da vida. Descrição e repetição: imparfait.' },
          en: { tr: 'When we lived in Brest, it rained almost every day.', why: 'The sentence describes what the weather was like during a period of life. Description and repetition: imparfait.' } } },
      { id: 11, before: 'Pierre ', after: ' très fatigué quand il est arrivé au travail.', verb: 'être', a: 'a été', b: 'était', ans: 'b', clue: 'quand il est arrivé au travail',
        text: {
          'pt-BR': { tr: 'O Pierre estava muito cansado quando chegou no trabalho.', why: 'O cansaço já existia quando ele chegou. Estados físicos e emocionais de fundo ficam no imparfait.' },
          en: { tr: 'Pierre was very tired when he got to work.', why: 'He was already tired when he arrived. Physical and emotional states in the background go in the imparfait.' } } },
      { id: 12, before: 'Pierre ', after: ' malade après le voyage.', verb: 'tomber', a: 'est tombé', b: 'tombait', ans: 'a', clue: 'après le voyage',
        text: {
          'pt-BR': { tr: 'O Pierre ficou doente depois da viagem.', why: '"Tomber malade" é uma mudança: ele não estava doente e passou a estar, depois daquela viagem. Mudança num momento definido: passé composé.' },
          en: { tr: 'Pierre got sick after the trip.', why: '"Tomber malade" is a change: he wasn\'t sick and then he was, after that trip. A change at a specific moment: passé composé.' } } },
      { id: 13, before: '', after: " Marie en 2018, à l'anniversaire d'un ami.", verb: 'connaître', a: "J'ai connu", b: 'Je connaissais', ans: 'a', clue: "à l'anniversaire d'un ami",
        text: {
          'pt-BR': { tr: 'Eu conheci a Marie em 2018, no aniversário de um amigo.', why: 'Aqui "connaître" é o primeiro encontro, numa cena precisa (o aniversário). Evento pontual: passé composé.' },
          en: { tr: 'I met Marie in 2018, at a friend\'s birthday party.', why: 'Here "connaître" means meeting someone for the first time, in a specific scene (the birthday party). A one-off event: passé composé.' } } },
      { id: 14, before: '', after: " Marie quand j'ai commencé à travailler dans cette entreprise.", verb: 'connaître', a: "J'ai déjà connu", b: 'Je connaissais déjà', ans: 'b', clue: 'déjà',
        text: {
          'pt-BR': { tr: 'Eu já conhecia a Marie quando comecei a trabalhar nessa empresa.', why: '"Déjà": a pessoa já era conhecida antes, um estado que continuava. Estado de fundo: imparfait.' },
          en: { tr: 'I already knew Marie when I started working at that company.', why: '"Déjà": I knew her from before, a state that was still going on. A background state: imparfait.' } } },
      { id: 15, before: 'Quand elle travaillait au centre-ville, elle ', after: ' un café après le déjeuner.', verb: 'prendre', a: 'a toujours pris', b: 'prenait toujours', ans: 'b', clue: 'toujours',
        text: {
          'pt-BR': { tr: 'Quando ela trabalhava no centro, ela sempre tomava um café depois do almoço.', why: '"Toujours", dentro de uma fase que já passou, é hábito. Imparfait.' },
          en: { tr: 'When she worked downtown, she always had a coffee after lunch.', why: '"Toujours", within a period that is over, signals a habit. Imparfait.' } } },
      { id: 16, before: 'Hier, elle ', after: ' un café après le déjeuner.', verb: 'prendre', a: 'a pris', b: 'prenait', ans: 'a', clue: 'Hier',
        text: {
          'pt-BR': { tr: 'Ontem, ela tomou um café depois do almoço.', why: 'Um café, uma vez, ontem. Fato único e concluído: passé composé.' },
          en: { tr: 'Yesterday, she had a coffee after lunch.', why: 'One coffee, once, yesterday. A single, finished event: passé composé.' } } },
      { id: 17, before: '', after: " un livre quand mon amie m'a appelé.", verb: 'lire', a: "J'ai lu", b: 'Je lisais', ans: 'b', clue: "quand mon amie m'a appelé",
        text: {
          'pt-BR': { tr: 'Eu estava lendo um livro quando minha amiga me ligou.', why: 'A leitura estava em andamento quando a amiga ligou. O fundo fica no imparfait; o que interrompe (m\'a appelé) fica no passé composé.' },
          en: { tr: 'I was reading a book when my friend called me.', why: 'The reading was in progress when my friend called. The background goes in the imparfait ("was reading"); the interruption (m\'a appelé) goes in the passé composé.' } } },
      { id: 18, before: 'Pendant les vacances, ', after: ' tout le livre.', verb: 'lire', a: "j'ai lu", b: 'je lisais', ans: 'a', clue: 'tout le livre',
        text: {
          'pt-BR': { tr: 'Nas férias, eu li o livro inteiro.', why: '"Tout le livre": leitura completa, do começo ao fim. Ação concluída: passé composé.' },
          en: { tr: 'During the vacation, I read the whole book.', why: '"Tout le livre": the whole reading, from start to finish. A finished action: passé composé.' } } },
      { id: 19, before: 'Il ', after: ' minuit et tout le monde dormait.', verb: 'être', a: 'a été', b: 'était', ans: 'b', clue: 'et tout le monde dormait',
        text: {
          'pt-BR': { tr: 'Era meia-noite e todo mundo estava dormindo.', why: 'A hora e a cena (todo mundo dormindo) montam o cenário da história. Cenário e descrição: imparfait.' },
          en: { tr: 'It was midnight and everyone was asleep.', why: 'The time and the scene (everyone asleep) set the stage for the story. Setting and description: imparfait.' } } },
      { id: 20, before: 'Soudain, quelqu\'un ', after: ' à la porte.', verb: 'frapper', a: 'a frappé', b: 'frappait', ans: 'a', clue: 'Soudain',
        text: {
          'pt-BR': { tr: 'De repente, alguém bateu na porta.', why: '"Soudain" marca um acontecimento que corta o cenário. Fato pontual: passé composé.' },
          en: { tr: 'Suddenly, someone knocked on the door.', why: '"Soudain" marks an event that breaks into the scene. A one-off event: passé composé.' } } },
      { id: 21, before: '', after: ' à Lyon pendant deux ans, puis je suis parti à Paris.', verb: 'habiter', a: "J'ai habité", b: "J'habitais", ans: 'a', clue: 'pendant deux ans, puis',
        text: {
          'pt-BR': { tr: 'Eu morei em Lyon por dois anos e depois fui morar em Paris.', why: 'O tempo em Lyon tem começo e fim (dois anos, depois Paris). Período fechado: passé composé.' },
          en: { tr: 'I lived in Lyon for two years, then I moved to Paris.', why: 'The time in Lyon has a start and an end (two years, then Paris). A closed period: passé composé.' } } },
      { id: 22, before: 'Quand ', after: ' à Lyon, je prenais le métro tous les jours.', verb: 'habiter', a: "j'ai habité", b: "j'habitais", ans: 'b', clue: 'je prenais le métro tous les jours',
        text: {
          'pt-BR': { tr: 'Quando eu morava em Lyon, eu pegava o metrô todo dia.', why: '"Quand j\'habitais" abre uma fase da vida, e o hábito dessa fase (je prenais) pede um pano de fundo também no imparfait.' },
          en: { tr: 'When I lived in Lyon, I took the metro every day.', why: '"Quand j\'habitais" opens a period of life, and the habit in that period (je prenais) calls for a background in the imparfait too.' } } }
    ]
  }
];
