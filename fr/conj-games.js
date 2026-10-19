// Jogos da Conjugação (fr). O motor é shared/conj-games.js (vale para qualquer idioma estudado);
// aqui ficam só os dados do francês. Cada jogo escolhe entre duas formas (a / b).
// Frases do pc-imparfait aprovadas pela autora em 2026-10-14 (revisão em docs/historico/13-...md).
// Jogos A1 (être x avoir, auxiliar do passé composé, tu x vous): 2026-10-19, escolhidos pelos erros
// mais comuns de quem fala português e inglês; level vira etiqueta no cartão.
//
// Formato do item:
//   before / after: o texto antes e depois da lacuna (francês)
//   a / b: as duas opções, já como entram na lacuna. Com "je", o pronome vai na opção,
//          porque a elisão muda com a forma (j'ai croisé / je croisais).
//   ans: 'a' | 'b'; verb: infinitivo (opcional, aparece entre parênteses); clue: trecho da frase que decide (destacado na explicação)
//   Francês dentro do texto em português/inglês (title, lede, tl, why) vai entre {chaves}: sai em azul (.cg-fr).
//   Vale para toda frase nova; o teste da Conjugação barra explicação sem nenhum trecho marcado.
//   text: tradução (tr) e explicação (why) por idioma do site. O curso em inglês não mostra
//         português: sem a chave do idioma, cai no pt-BR só como último recurso.
const CONJ_GAMES = [
  // A1 (A1-g1). Expressões em que o português ("estou com fome") e o inglês ("I am hungry") levam ao auxiliar errado.
  {
    id: 'etre-avoir',
    level: 'A1',
    title: { 'pt-BR': '{Être} ou {avoir}?', en: '{Être} or {avoir}?' },
    lede: {
      'pt-BR': 'Fome, frio, sede, medo: em francês muita coisa se "tem" ({avoir}) em vez de se "estar". Complete com {être} ou {avoir} e veja onde o português engana.',
      en: 'Hungry, cold, 25 years old, right: in French you "have" lots of things ({avoir}) instead of "being" them. Fill in {être} or {avoir} and see where English leads you astray.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Avoir', tl: { 'pt-BR': '{avoir}: o que você tem (idade, fome, frio, medo, razão...)', en: '{avoir}: what you have (age, hunger, cold, fear, being right...)' } },
      b: { label: 'Être', tl: { 'pt-BR': '{être}: o que você é ou como está (cansado, doente, atrasado, casado...)', en: '{être}: what you are or how you are (tired, sick, late, married...)' } }
    },
    items: [
      { id: 1, before: '', after: ' vingt-cinq ans.', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'vingt-cinq ans',
        text: {
          'pt-BR': { tr: 'Eu tenho vinte e cinco anos.', why: 'Idade em francês se "tem", igual ao português: {avoir} + {ans}. Nunca "{je suis vingt-cinq ans}".' },
          en: { tr: 'I\'m twenty-five.', why: 'In French you "have" your age: {avoir} + {ans}. "I am 25" becomes {j\'ai vingt-cinq ans}, never "{je suis vingt-cinq}".' } } },
      { id: 2, before: 'Il ', after: ' quel âge, ton frère ?', a: 'a', b: 'est', ans: 'a', clue: 'quel âge',
        text: {
          'pt-BR': { tr: 'Quantos anos tem o seu irmão?', why: 'Perguntar a idade também usa {avoir}: "{il a quel âge ?}" é, ao pé da letra, "ele tem qual idade?".' },
          en: { tr: 'How old is your brother?', why: '"How old is he?" uses "is", but French asks what age he "has": {il a quel âge ?} Age always goes with {avoir}.' } } },
      { id: 3, before: '', after: ' faim ! On mange ?', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'faim',
        text: {
          'pt-BR': { tr: 'Estou com fome! Vamos comer?', why: 'Fome é coisa que se tem: {j\'ai faim}. O "estou com fome" engana, mas em francês a fome nunca vem com {être}.' },
          en: { tr: 'I\'m hungry! Shall we eat?', why: '"I\'m hungry" uses "be", but in French hunger is something you have: {j\'ai faim}.' } } },
      { id: 4, before: 'Il fait 35 degrés, ', after: ' chaud.', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'chaud',
        text: {
          'pt-BR': { tr: 'Está fazendo 35 graus, estou com calor.', why: 'Sentir calor é {avoir chaud}. Cuidado: na linguagem informal, "{je suis chaud}" quer dizer "estou animado, topo", e dependendo do contexto soa com segundas intenções. É um erro que costuma arrancar risadas.' },
          en: { tr: 'It\'s 35 degrees, I\'m hot.', why: 'Feeling hot is {avoir chaud}. Careful: in casual French, "{je suis chaud}" means "I\'m up for it", and depending on context it can sound suggestive. It\'s a mistake that often gets a laugh.' } } },
      { id: 5, before: 'Tu peux fermer la fenêtre ? ', after: ' froid.', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'froid',
        text: {
          'pt-BR': { tr: 'Você pode fechar a janela? Estou com frio.', why: 'Sentir frio é {avoir froid}. "{Je suis froid}" descreveria você como uma pessoa fria, distante.' },
          en: { tr: 'Can you close the window? I\'m cold.', why: 'Feeling cold is {avoir froid}. "{Je suis froid}" would describe you as a cold, distant person.' } } },
      { id: 6, before: 'Tu ', after: ' raison, c\'est trop cher.', a: 'as', b: 'es', ans: 'a', clue: 'raison',
        text: {
          'pt-BR': { tr: 'Você tem razão, está caro demais.', why: '"Ter razão" é {avoir raison}, como em português. A armadilha é pensar "você está certo" e trocar por {être}.' },
          en: { tr: 'You\'re right, it\'s too expensive.', why: '"You\'re right" uses "be", but French says you "have reason": {tu as raison}. "{Tu es raison}" doesn\'t exist.' } } },
      { id: 7, before: 'Les enfants ', after: ' peur du chien.', a: 'ont', b: 'sont', ans: 'a', clue: 'peur',
        text: {
          'pt-BR': { tr: 'As crianças estão com medo do cachorro.', why: 'Medo também se tem: {avoir peur de}. "Estar com medo" e "ter medo" viram a mesma coisa em francês: {avoir peur}.' },
          en: { tr: 'The kids are scared of the dog.', why: '"Be scared" or "be afraid" uses "be", but French uses {avoir}: {avoir peur de} (literally "to have fear of").' } } },
      { id: 8, before: 'Il est tard, ', after: ' sommeil.', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'sommeil',
        text: {
          'pt-BR': { tr: 'Está tarde, estou com sono.', why: '"Estar com sono" é {avoir sommeil}: sono é substantivo, e aqui o substantivo vem com {avoir}.' },
          en: { tr: 'It\'s late, I\'m sleepy.', why: '"Sleepy" is an adjective in English, but French uses a noun, {sommeil}, with {avoir}: {j\'ai sommeil}.' } } },
      { id: 9, before: '', after: ' fatigué après le travail.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'fatigué',
        text: {
          'pt-BR': { tr: 'Estou cansado depois do trabalho.', why: 'Cansado é adjetivo, descreve como você está: {être} + adjetivo, {je suis fatigué}. Compare com o sono: {j\'ai sommeil} (substantivo, com {avoir}).' },
          en: { tr: 'I\'m tired after work.', why: '"Tired" is an adjective, and adjectives go with {être}, just like in English: {je suis fatigué}. Compare {j\'ai sommeil} (a noun, with {avoir}).' } } },
      { id: 10, before: 'Elle ', after: ' mal à la tête.', a: 'a', b: 'est', ans: 'a', clue: 'mal à la tête',
        text: {
          'pt-BR': { tr: 'Ela está com dor de cabeça.', why: '"Estar com dor" é {avoir mal à}: {elle a mal à la tête}. Dor se tem, não se é.' },
          en: { tr: 'She has a headache.', why: 'Pain goes with {avoir}: {avoir mal à} + body part, {elle a mal à la tête}. Here the English "has" points the right way.' } } },
      { id: 11, before: '', after: ' sûr que c\'est ici.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'sûr',
        text: {
          'pt-BR': { tr: 'Tenho certeza que é aqui.', why: 'Pegadinha de quem fala português: "tenho certeza" puxa para "{j\'ai certitude}", mas o normal é {je suis sûr} (ou {sûre}). Em francês a certeza vira adjetivo, e adjetivo vem com {être}.' },
          en: { tr: 'I\'m sure it\'s here.', why: '"Sure" is an adjective, so it goes with {être}, just like in English: {je suis sûr} (or {sûre}).' } } },
      { id: 12, before: '', after: ' pressé, je te rappelle plus tard.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'pressé',
        text: {
          'pt-BR': { tr: 'Estou com pressa, te ligo mais tarde.', why: 'Outra armadilha: "estou com pressa" parece pedir {avoir}, mas em francês é um adjetivo: {je suis pressé}. E cuidado com "{j\'ai hâte}": não é "estou com pressa", é "estou ansioso, não vejo a hora".' },
          en: { tr: 'I\'m in a hurry, I\'ll call you back later.', why: '"In a hurry" is a single adjective in French, {pressé}, so it goes with {être}: {je suis pressé}. "{J\'ai pressé}" would mean "I squeezed".' } } },
      { id: 13, before: 'Nous ', after: ' en retard, le film commence !', a: 'avons', b: 'sommes', ans: 'b', clue: 'en retard',
        text: {
          'pt-BR': { tr: 'Estamos atrasados, o filme está começando!', why: '"Estar atrasado" é {être en retard}. Como o português usa "estar", aqui a intuição acerta.' },
          en: { tr: 'We\'re late, the movie is starting!', why: '"Be late" is {être en retard}, so English points the right way here.' } } },
      { id: 14, before: 'Mon frère ', after: ' marié.', a: 'a', b: 'est', ans: 'b', clue: 'marié',
        text: {
          'pt-BR': { tr: 'Meu irmão é casado.', why: 'Estado civil vem com {être}: {il est marié}, como "ele é casado".' },
          en: { tr: 'My brother is married.', why: '"Be married" is {être marié}, just like in English.' } } },
      { id: 15, before: '', after: ' d\'accord avec toi.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'd\'accord',
        text: {
          'pt-BR': { tr: 'Eu concordo com você.', why: 'O jeito comum de dizer "concordo" é {je suis d\'accord} ("estou de acordo"), sempre com {être}.' },
          en: { tr: 'I agree with you.', why: 'Everyday French has no single verb for "agree": you say {je suis d\'accord} ("I am in agreement"), always with {être}.' } } },
      { id: 16, before: 'Vous ', after: ' soif ? Il y a de l\'eau.', a: 'avez', b: 'êtes', ans: 'a', clue: 'soif',
        text: {
          'pt-BR': { tr: 'Vocês estão com sede? Tem água.', why: 'Sede, como fome, se tem: {avoir soif}. "Estar com sede" vira {avoir}.' },
          en: { tr: 'Are you thirsty? There\'s water.', why: '"Be thirsty" uses "be" in English, but in French thirst is something you have: {avoir soif}.' } } },
      { id: 17, before: 'Tu ', after: ' de la chance !', a: 'as', b: 'es', ans: 'a', clue: 'de la chance',
        text: {
          'pt-BR': { tr: 'Você tem sorte!', why: '"Ter sorte" é {avoir de la chance}. Mesmo quando a gente diz "você está com sorte", em francês é {avoir}.' },
          en: { tr: 'You\'re lucky!', why: '"Be lucky" becomes {avoir de la chance} (literally "to have some luck").' } } },
      { id: 18, before: '', after: ' envie d\'un café.', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'envie',
        text: {
          'pt-BR': { tr: 'Estou com vontade de tomar um café.', why: '"Estar com vontade" é {avoir envie de}: vontade se tem. "{Je suis envie}" não existe.' },
          en: { tr: 'I feel like having a coffee.', why: '"Feel like" becomes {avoir envie de} (literally "to have desire for"): {j\'ai envie d\'un café}.' } } },
      { id: 19, before: 'Elle ', after: ' malade, elle reste à la maison.', a: 'a', b: 'est', ans: 'b', clue: 'malade',
        text: {
          'pt-BR': { tr: 'Ela está doente, vai ficar em casa.', why: 'Doente é adjetivo: {être malade}. Mas a doença em si se tem: {elle a la grippe} (ela está com gripe).' },
          en: { tr: 'She\'s sick, she\'s staying home.', why: '"Sick" is an adjective: {être malade}. But the illness itself is something you have: {elle a la grippe} (she has the flu).' } } }
    ]
  },
  // A1 (A1-g9). Só o auxiliar: com être, os sujeitos são masculinos e no singular, para a concordância do particípio (A2) não aparecer.
  {
    id: 'pc-auxiliaire',
    level: 'A1',
    title: { 'pt-BR': '{Passé composé}: {avoir} ou {être}?', en: '{Passé composé}: {avoir} or {être}?' },
    lede: {
      'pt-BR': 'A maioria dos verbos usa {avoir}, mas alguns pedem {être}. Escolha o auxiliar certo e veja os verbos que mais enganam, de um lado e do outro.',
      en: 'Most verbs take {avoir}, but some take {être}. Pick the right auxiliary and see which verbs trip people up most, on both sides.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Avoir', tl: { 'pt-BR': '{avoir}: a grande maioria dos verbos', en: '{avoir}: the vast majority of verbs' } },
      b: { label: 'Être', tl: { 'pt-BR': '{être}: ir e vir, entrar e sair, chegar e ir embora, nascer, ficar, cair... e todo verbo com {me}/{se}', en: '{être}: come and go, in and out, arrive and leave, be born, stay, fall... and every verb with {me}/{se}' } }
    },
    items: [
      { id: 1, before: 'Hier, ', after: ' allé au cinéma.', verb: 'aller', a: 'j\'ai', b: 'je suis', ans: 'b', clue: 'allé',
        text: {
          'pt-BR': { tr: 'Ontem eu fui ao cinema.', why: '{Aller} é o verbo de movimento mais comum e usa {être}: {je suis allé}. "{J\'ai allé}" é um dos erros mais frequentes de quem aprendeu que o {passé composé} é "{avoir} + particípio".' },
          en: { tr: 'Yesterday I went to the movies.', why: '"I have gone" makes {avoir} feel natural, but {aller} takes {être}: {je suis allé}. "{J\'ai allé}" is one of the most common learner mistakes.' } } },
      { id: 2, before: 'Mon cousin ', after: ' venu dîner samedi.', verb: 'venir', a: 'a', b: 'est', ans: 'b', clue: 'venu',
        text: {
          'pt-BR': { tr: 'Meu primo veio jantar no sábado.', why: '{Venir} (vir) é o par de {aller} e também usa {être}: {il est venu}.' },
          en: { tr: 'My cousin came over for dinner on Saturday.', why: '{Venir} (to come) is {aller}\'s partner and also takes {être}: {il est venu}.' } } },
      { id: 3, before: 'Le train ', after: ' arrivé en retard.', verb: 'arriver', a: 'a', b: 'est', ans: 'b', clue: 'arrivé',
        text: {
          'pt-BR': { tr: 'O trem chegou atrasado.', why: '{Arriver} (chegar) usa {être}: {il est arrivé}. Chegar e partir ({arriver}, {partir}) são outro par do {être}.' },
          en: { tr: 'The train arrived late.', why: '{Arriver} (to arrive) takes {être}: {il est arrivé}. Arriving and leaving ({arriver}, {partir}) are another {être} pair.' } } },
      { id: 4, before: 'Thomas ', after: ' parti sans dire au revoir.', verb: 'partir', a: 'a', b: 'est', ans: 'b', clue: 'parti',
        text: {
          'pt-BR': { tr: 'O Thomas foi embora sem se despedir.', why: '{Partir} (ir embora) usa {être}: {il est parti}.' },
          en: { tr: 'Thomas left without saying goodbye.', why: '{Partir} (to leave) takes {être}: {il est parti}.' } } },
      { id: 5, before: '', after: ' resté à la maison tout le week-end.', verb: 'rester', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'resté',
        text: {
          'pt-BR': { tr: 'Eu fiquei em casa o fim de semana todo.', why: '{Rester} (ficar) não tem movimento nenhum, mas está na lista do {être}: {je suis resté}. Por isso tanta gente erra: a lista não é só de movimento.' },
          en: { tr: 'I stayed home all weekend.', why: '{Rester} (to stay) involves no movement at all, yet it\'s on the {être} list: {je suis resté}. That\'s why so many learners say "{j\'ai resté}".' } } },
      { id: 6, before: 'Mon fils ', after: ' tombé dans l\'escalier.', verb: 'tomber', a: 'a', b: 'est', ans: 'b', clue: 'tombé',
        text: {
          'pt-BR': { tr: 'Meu filho caiu na escada.', why: '{Tomber} (cair) usa {être}: {il est tombé}.' },
          en: { tr: 'My son fell on the stairs.', why: '{Tomber} (to fall) takes {être}: {il est tombé}.' } } },
      { id: 7, before: '', after: ' né à Rio.', verb: 'naître', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'né',
        text: {
          'pt-BR': { tr: 'Eu nasci no Rio.', why: '{Naître} (nascer) usa {être}: {je suis né}. Em português "nasci" não tem auxiliar nenhum, então a tentação é pôr {avoir}.' },
          en: { tr: 'I was born in Rio.', why: '"I was born" tempts you toward {j\'étais né}, but French uses the {passé composé} with {être}: {je suis né}.' } } },
      { id: 8, before: 'Hier soir, mon père ', after: ' rentré tard.', verb: 'rentrer', a: 'a', b: 'est', ans: 'b', clue: 'rentré',
        text: {
          'pt-BR': { tr: 'Ontem à noite, meu pai chegou tarde em casa.', why: '{Rentrer} (voltar para casa) usa {être}: {il est rentré}.' },
          en: { tr: 'Last night, my dad got home late.', why: '{Rentrer} (to come back home) takes {être}: {il est rentré}.' } } },
      { id: 9, before: 'Samedi, ', after: ' sorti avec des amis.', verb: 'sortir', a: 'j\'ai', b: 'je suis', ans: 'b', clue: 'sorti',
        text: {
          'pt-BR': { tr: 'No sábado, eu saí com uns amigos.', why: '{Sortir} (sair) usa {être}: {je suis sorti}. {Entrer} e {sortir} são mais um par do {être}.' },
          en: { tr: 'On Saturday, I went out with friends.', why: '{Sortir} (to go out) takes {être}: {je suis sorti}. {Entrer} and {sortir} are another {être} pair.' } } },
      { id: 10, before: 'Le professeur ', after: ' entré dans la salle.', verb: 'entrer', a: 'a', b: 'est', ans: 'b', clue: 'entré',
        text: {
          'pt-BR': { tr: 'O professor entrou na sala.', why: '{Entrer} (entrar) usa {être}: {il est entré}.' },
          en: { tr: 'The teacher came into the classroom.', why: '{Entrer} (to enter) takes {être}: {il est entré}.' } } },
      { id: 11, before: 'Le chat ', after: ' monté sur la table.', verb: 'monter', a: 'a', b: 'est', ans: 'b', clue: 'monté',
        text: {
          'pt-BR': { tr: 'O gato subiu na mesa.', why: '{Monter} (subir) usa {être}: {il est monté}. Subir e descer ({monter}, {descendre}) também são um par do {être}.' },
          en: { tr: 'The cat climbed onto the table.', why: '{Monter} (to go up) takes {être}: {il est monté}. Going up and down ({monter}, {descendre}) are another {être} pair.' } } },
      { id: 12, before: 'Il ', after: ' descendu du bus.', verb: 'descendre', a: 'a', b: 'est', ans: 'b', clue: 'descendu',
        text: {
          'pt-BR': { tr: 'Ele desceu do ônibus.', why: '{Descendre} (descer) usa {être}: {il est descendu}.' },
          en: { tr: 'He got off the bus.', why: '{Descendre} (to go down, to get off) takes {être}: {il est descendu}.' } } },
      { id: 13, before: 'Ce matin, ', after: ' levé à six heures.', verb: 'se lever', a: 'je m\'ai', b: 'je me suis', ans: 'b', clue: 'levé',
        text: {
          'pt-BR': { tr: 'Hoje de manhã, eu me levantei às seis.', why: 'Todo verbo pronominal (com {me}, {te}, {se}) usa {être} no {passé composé}: {je me suis levé}. "{Je m\'ai levé}" não existe.' },
          en: { tr: 'This morning, I got up at six.', why: 'Every reflexive verb (with {me}, {te}, {se}) takes {être} in the {passé composé}: {je me suis levé}. "{Je m\'ai levé}" doesn\'t exist.' } } },
      { id: 14, before: 'Hier soir, ', after: ' couché à minuit.', verb: 'se coucher', a: 'je m\'ai', b: 'je me suis', ans: 'b', clue: 'couché',
        text: {
          'pt-BR': { tr: 'Ontem à noite, eu fui dormir à meia-noite.', why: '{Se coucher} (ir deitar) é pronominal, então usa {être}: {je me suis couché}. Repare que em português "fui dormir" nem tem o "{me}".' },
          en: { tr: 'Last night, I went to bed at midnight.', why: '{Se coucher} (to go to bed) is reflexive, so it takes {être}: {je me suis couché}. The English "went to bed" hides the reflexive "{me}".' } } },
      { id: 15, before: 'L\'année dernière, ', after: ' voyagé au Japon.', verb: 'voyager', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'voyagé',
        text: {
          'pt-BR': { tr: 'Ano passado, eu viajei para o Japão.', why: 'Viajar parece movimento, mas {voyager} usa {avoir}: {j\'ai voyagé}. A lista do {être} é curta e fechada, e {voyager} não está nela.' },
          en: { tr: 'Last year, I traveled to Japan.', why: 'Traveling sounds like movement, but {voyager} takes {avoir}: {j\'ai voyagé}. The {être} list is short and closed, and {voyager} isn\'t on it.' } } },
      { id: 16, before: 'Nous ', after: ' marché deux heures.', verb: 'marcher', a: 'avons', b: 'sommes', ans: 'a', clue: 'marché',
        text: {
          'pt-BR': { tr: 'Nós caminhamos duas horas.', why: '{Marcher} (andar, caminhar) usa {avoir}: {nous avons marché}. O {être} fica com quem vai de um lugar para outro ({aller}, {venir}...), não com o jeito de se mover.' },
          en: { tr: 'We walked for two hours.', why: '{Marcher} (to walk) takes {avoir}: {nous avons marché}. {Être} goes with getting from one place to another ({aller}, {venir}...), not with the way you move.' } } },
      { id: 17, before: 'Paul ', after: ' couru dans le parc.', verb: 'courir', a: 'a', b: 'est', ans: 'a', clue: 'couru',
        text: {
          'pt-BR': { tr: 'O Paul correu no parque.', why: '{Courir} (correr) é como {marcher}: jeito de se mover, então {avoir}: {il a couru}.' },
          en: { tr: 'Paul ran in the park.', why: '{Courir} (to run) is like {marcher}, a way of moving, so it takes {avoir}: {il a couru}.' } } },
      { id: 18, before: 'Hier, ', after: ' nagé à la piscine.', verb: 'nager', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'nagé',
        text: {
          'pt-BR': { tr: 'Ontem eu nadei na piscina.', why: '{Nager} (nadar), como {marcher} e {courir}, é jeito de se mover: {avoir}, {j\'ai nagé}.' },
          en: { tr: 'Yesterday I swam at the pool.', why: '{Nager} (to swim), like {marcher} and {courir}, is a way of moving: {avoir}, {j\'ai nagé}.' } } },
      { id: 19, before: 'Il ', after: ' devenu professeur.', verb: 'devenir', a: 'a', b: 'est', ans: 'b', clue: 'devenu',
        text: {
          'pt-BR': { tr: 'Ele virou professor.', why: '{Devenir} (virar, tornar-se) é da família de {venir} e usa {être}: {il est devenu}. "{Il a devenu}" é um erro bem comum.' },
          en: { tr: 'He became a teacher.', why: '{Devenir} (to become) belongs to {venir}\'s family and takes {être}: {il est devenu}. "{Il a devenu}" is a very common mistake.' } } },
      { id: 20, before: 'Ils ', after: ' visité le Louvre.', verb: 'visiter', a: 'ont', b: 'sont', ans: 'a', clue: 'visité',
        text: {
          'pt-BR': { tr: 'Eles visitaram o Louvre.', why: 'Visitar faz pensar em ir a algum lugar, mas {visiter} não está na lista do {être}: {ils ont visité}.' },
          en: { tr: 'They visited the Louvre.', why: 'Visiting feels like going somewhere, but {visiter} isn\'t on the {être} list: {ils ont visité}.' } } },
      { id: 21, before: 'Marc ', after: ' quitté Paris en 2020.', verb: 'quitter', a: 'a', b: 'est', ans: 'a', clue: 'quitté',
        text: {
          'pt-BR': { tr: 'O Marc saiu de Paris em 2020.', why: '{Quitter} (deixar um lugar ou alguém) usa {avoir}: {il a quitté Paris}. Com {partir} seria {être}: {il est parti de Paris}. Sentido parecido, auxiliar diferente.' },
          en: { tr: 'Marc left Paris in 2020.', why: '{Quitter} (to leave a place or someone) takes {avoir}: {il a quitté Paris}. With {partir} it would be {être}: {il est parti de Paris}. Similar meaning, different auxiliary.' } } },
      { id: 22, before: 'Il ', after: ' été malade toute la semaine.', verb: 'être', a: 'a', b: 'est', ans: 'a', clue: 'été',
        text: {
          'pt-BR': { tr: 'Ele passou a semana toda doente.', why: 'O próprio {être} usa {avoir} no {passé composé}: {il a été}. Como o verbo já é {être}, muita gente se confunde e diz "{il est été}", que não existe.' },
          en: { tr: 'He was sick all week.', why: '{Être} itself takes {avoir} in the {passé composé}: {il a été} (like the English "has been").' } } },
      { id: 23, before: 'Il ', after: ' pris le bus pour aller au travail.', verb: 'prendre', a: 'a', b: 'est', ans: 'a', clue: 'pris',
        text: {
          'pt-BR': { tr: 'Ele pegou o ônibus para ir ao trabalho.', why: 'O verbo no {passé composé} é {prendre} (pegar), que usa {avoir}: {il a pris}. O "{aller}" da frase está no infinitivo e não muda nada.' },
          en: { tr: 'He took the bus to go to work.', why: 'The verb in the {passé composé} is {prendre} (to take), which takes {avoir}: {il a pris}. The {aller} in the sentence is just an infinitive and changes nothing.' } } },
      { id: 24, before: 'À midi, ', after: ' mangé une salade.', verb: 'manger', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'mangé',
        text: {
          'pt-BR': { tr: 'No almoço, eu comi uma salada.', why: '{Manger}, como a grande maioria dos verbos, usa {avoir}: {j\'ai mangé}. Na dúvida, {avoir} é a aposta mais segura.' },
          en: { tr: 'At lunch, I had a salad.', why: 'Like the vast majority of verbs, {manger} takes {avoir}: {j\'ai mangé}. When in doubt, {avoir} is the safest bet.' } } }
    ]
  },
  // A1 (A1-1, "tu ou vous"). A pista é quem fala com quem, ou uma palavra que já está no tu ou no vous.
  {
    id: 'tu-vous',
    level: 'A1',
    title: { 'pt-BR': '{Tu} ou {vous}?', en: '{Tu} or {vous}?' },
    lede: {
      'pt-BR': 'Em português a gente diz "você" para quase todo mundo; em francês é preciso escolher. Leia a pista da frase e escolha a forma certa do verbo.',
      en: 'English has just "you"; French makes you choose. Read the clue in the sentence and pick the right verb form.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Tu', tl: { 'pt-BR': '{tu}: uma pessoa só, próxima (amigo, família, criança)', en: '{tu}: one person you\'re close to (friend, family, child)' } },
      b: { label: 'Vous', tl: { 'pt-BR': '{vous}: formal (desconhecido, cliente, chefe) ou mais de uma pessoa', en: '{vous}: formal (stranger, customer, boss) or more than one person' } }
    },
    items: [
      { id: 1, before: 'Salut Léa ! ', after: ' bien ?', verb: 'aller', a: 'Tu vas', b: 'Vous allez', ans: 'a', clue: 'Salut Léa',
        text: {
          'pt-BR': { tr: 'Oi, Léa! Tudo bem?', why: '"{Salut}" e o primeiro nome mostram intimidade: com amigo é {tu}.' },
          en: { tr: 'Hi Léa! How are you?', why: '"{Salut}" and a first name show you\'re close: with a friend, use {tu}.' } } },
      { id: 2, before: 'Pardon, madame, ', after: ' l\'heure, s\'il vous plaît ?', verb: 'avoir', a: 'tu as', b: 'vous avez', ans: 'b', clue: 'Pardon, madame',
        text: {
          'pt-BR': { tr: 'Com licença, a senhora tem horas, por favor?', why: 'Desconhecida na rua, chamada de "{madame}": {vous}. Com um adulto que você não conhece, comece sempre com {vous}.' },
          en: { tr: 'Excuse me, ma\'am, do you have the time, please?', why: 'A stranger in the street, addressed as "{madame}": {vous}. With an adult you don\'t know, always start with {vous}.' } } },
      { id: 3, before: 'Bonjour monsieur, ', after: ' un café ?', verb: 'vouloir', a: 'tu veux', b: 'vous voulez', ans: 'b', clue: 'Bonjour monsieur',
        text: {
          'pt-BR': { tr: 'Bom dia, o senhor quer um café?', why: 'Garçom falando com cliente: {vous}, sempre. "{Monsieur}" e "{madame}" quase sempre vêm com {vous}.' },
          en: { tr: 'Good morning, sir, would you like a coffee?', why: 'A waiter talking to a customer: always {vous}. "{Monsieur}" and "{madame}" almost always go with {vous}.' } } },
      { id: 4, before: 'Les enfants, ', after: ' prêts ? On y va !', verb: 'être', a: 'tu es', b: 'vous êtes', ans: 'b', clue: 'Les enfants',
        text: {
          'pt-BR': { tr: 'Crianças, vocês estão prontos? Vamos!', why: 'Com criança se usa {tu}, mas aqui são várias: mais de uma pessoa é sempre {vous}, mesmo com intimidade. "Vocês" é {vous}.' },
          en: { tr: 'Kids, are you ready? Let\'s go!', why: 'Kids get {tu}, but here there are several of them: more than one person is always {vous}, however close you are.' } } },
      { id: 5, before: 'Maman, ', after: ' faim ?', verb: 'avoir', a: 'tu as', b: 'vous avez', ans: 'a', clue: 'Maman',
        text: {
          'pt-BR': { tr: 'Mãe, você está com fome?', why: 'Família é {tu}, inclusive pai e mãe.' },
          en: { tr: 'Mom, are you hungry?', why: 'Family gets {tu}, including your parents.' } } },
      { id: 6, before: 'Mamie, ', after: ' dîner dimanche ?', verb: 'venir', a: 'tu viens', b: 'vous venez', ans: 'a', clue: 'Mamie',
        text: {
          'pt-BR': { tr: 'Vó, você vem jantar no domingo?', why: 'Mesmo sendo mais velha, a avó é família: {tu}. Muita gente no Brasil diz "a senhora" para a avó, mas na França a família quase sempre usa {tu}.' },
          en: { tr: 'Grandma, are you coming for dinner on Sunday?', why: 'She\'s older, but grandma is family: {tu}. In France, family almost always uses {tu}.' } } },
      { id: 7, before: 'Excusez-moi, monsieur, ', after: ' anglais ?', verb: 'parler', a: 'tu parles', b: 'vous parlez', ans: 'b', clue: 'Excusez-moi, monsieur',
        text: {
          'pt-BR': { tr: 'Com licença, o senhor fala inglês?', why: '"{Excusez-moi}" já está na forma do {vous} (a do {tu} seria "{excuse-moi}"). O verbo tem que combinar: {vous parlez}.' },
          en: { tr: 'Excuse me, sir, do you speak English?', why: '"{Excusez-moi}" is already the {vous} form (the {tu} form is "{excuse-moi}"). The verb has to match: {vous parlez}.' } } },
      { id: 8, before: 'Madame, ', after: ' répéter, s\'il vous plaît ?', verb: 'pouvoir', a: 'tu peux', b: 'vous pouvez', ans: 'b', clue: 's\'il vous plaît',
        text: {
          'pt-BR': { tr: 'Professora, pode repetir, por favor?', why: '"{S\'il vous plaît}" é do {vous}, e o normal é não misturar com {tu} na mesma frase. Com professor, o aluno usa {vous}.' },
          en: { tr: 'Ma\'am, could you repeat that, please?', why: '"{S\'il vous plaît}" belongs to {vous}, and you normally don\'t mix {tu} and {vous} in the same sentence. Students use {vous} with their teacher.' } } },
      { id: 9, before: '', after: ' me passer le sel, s\'il te plaît ?', verb: 'pouvoir', a: 'Tu peux', b: 'Vous pouvez', ans: 'a', clue: 's\'il te plaît',
        text: {
          'pt-BR': { tr: 'Você pode me passar o sal, por favor?', why: '"{S\'il te plaît}" é do {tu}, então o verbo também: {tu peux}. Misturar {tu} e {vous} na mesma frase é um erro comum.' },
          en: { tr: 'Can you pass me the salt, please?', why: '"{S\'il te plaît}" is the {tu} form, so the verb is too: {tu peux}. Mixing {tu} and {vous} in one sentence is a common mistake.' } } },
      { id: 10, before: 'Paul et Marie, ', after: ' au cinéma avec nous ?', verb: 'venir', a: 'tu viens', b: 'vous venez', ans: 'b', clue: 'Paul et Marie',
        text: {
          'pt-BR': { tr: 'Paul e Marie, vocês vêm ao cinema com a gente?', why: 'São amigos, mas são dois: mais de uma pessoa é {vous}. Quem pensa "{tu} = informal, {vous} = formal" costuma errar esta.' },
          en: { tr: 'Paul and Marie, are you coming to the movies with us?', why: 'They\'re friends, but there are two of them: more than one person is {vous}. Thinking "{tu} = informal, {vous} = formal" makes people miss this one.' } } },
      { id: 11, before: 'Excusez-moi, ', after: ' où est la gare ?', verb: 'savoir', a: 'tu sais', b: 'vous savez', ans: 'b', clue: 'Excusez-moi',
        text: {
          'pt-BR': { tr: 'Com licença, você sabe onde fica a estação?', why: 'Pedir informação a um desconhecido na rua: {vous}. Só entre gente jovem, num clima descontraído, o {tu} aparece; na dúvida, {vous}.' },
          en: { tr: 'Excuse me, do you know where the station is?', why: 'Asking a stranger for directions: {vous}. Young people sometimes use {tu} with each other, but when in doubt, use {vous}.' } } },
      { id: 12, before: 'Coucou Julie ! ', after: ' faire quoi ce soir ?', verb: 'vouloir', a: 'Tu veux', b: 'Vous voulez', ans: 'a', clue: 'Coucou Julie',
        text: {
          'pt-BR': { tr: 'Oi, Julie! O que você quer fazer hoje à noite?', why: '"{Coucou}" é um oi bem íntimo, de amigo ou família: {tu}.' },
          en: { tr: 'Hey Julie! What do you want to do tonight?', why: '"{Coucou}" is a very friendly hi, for friends and family: {tu}.' } } },
      { id: 13, before: 'Moi, c\'est Hugo. Et toi, ', after: ' comment ?', verb: 's\'appeler', a: 'tu t\'appelles', b: 'vous vous appelez', ans: 'a', clue: 'Et toi',
        text: {
          'pt-BR': { tr: 'Eu sou o Hugo. E você, como se chama?', why: '"{Et toi}" é a forma do {tu}, então o verbo tem que combinar: {tu t\'appelles}.' },
          en: { tr: 'I\'m Hugo. And you, what\'s your name?', why: '"{Et toi}" is the {tu} form, so the verb has to match: {tu t\'appelles}.' } } },
      { id: 14, before: 'Enchanté, madame. Et vous, ', after: ' d\'où ?', verb: 'être', a: 'tu es', b: 'vous êtes', ans: 'b', clue: 'Et vous',
        text: {
          'pt-BR': { tr: 'Muito prazer, senhora. E a senhora, é de onde?', why: '"{Et vous}" mostra que a conversa é no {vous}: {vous êtes}.' },
          en: { tr: 'Nice to meet you, ma\'am. And you, where are you from?', why: '"{Et vous}" shows the conversation uses {vous}: {vous êtes}.' } } },
      { id: 15, before: 'Bonjour, mon petit ! ', after: ' quel âge ?', verb: 'avoir', a: 'Tu as', b: 'Vous avez', ans: 'a', clue: 'mon petit',
        text: {
          'pt-BR': { tr: 'Oi, querido! Quantos anos você tem?', why: 'Adulto fala {tu} com criança, mesmo sem conhecer.' },
          en: { tr: 'Hi, sweetie! How old are you?', why: 'Adults use {tu} with children, even ones they don\'t know.' } } },
      { id: 16, before: 'Salut, je suis nouveau dans la classe. Et toi, ', after: ' ici depuis longtemps ?', verb: 'être', a: 'tu es', b: 'vous êtes', ans: 'a', clue: 'Et toi',
        text: {
          'pt-BR': { tr: 'Oi, sou novo na turma. E você, está aqui faz tempo?', why: 'Entre colegas de turma, mesmo que acabaram de se conhecer, o normal é {tu}.' },
          en: { tr: 'Hi, I\'m new in the class. And you, have you been here long?', why: 'Classmates use {tu} with each other, even when they\'ve just met.' } } },
      { id: 17, before: 'Monsieur Durand, ', after: ' une réunion à quinze heures.', verb: 'avoir', a: 'tu as', b: 'vous avez', ans: 'b', clue: 'Monsieur Durand',
        text: {
          'pt-BR': { tr: 'Senhor Durand, o senhor tem uma reunião às três da tarde.', why: '"{Monsieur}" com o sobrenome é sinal de distância e respeito: {vous}. Com o chefe, em geral, é {vous}.' },
          en: { tr: 'Mr. Durand, you have a meeting at three p.m.', why: '"{Monsieur}" plus a last name signals distance and respect: {vous}. With your boss it\'s usually {vous}.' } } }
    ]
  },
  // A2: o imparfait ainda não entra na trilha A1.
  {
    id: 'pc-imparfait',
    level: 'A2',
    title: { 'pt-BR': '{Passé composé} ou {Imparfait}?', en: '{Passé composé} or {Imparfait}?' },
    lede: {
      'pt-BR': 'Complete cada frase com o {passé composé} ou o {imparfait}. Depois de responder, veja por que a frase pede aquele tempo.',
      en: 'Complete each sentence with the {passé composé} or the {imparfait}. After you answer, see why the sentence calls for that tense.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Passé composé', sketch: 'point', tl: { 'pt-BR': 'um ponto: começou e terminou', en: 'a point: it started and ended' } },
      b: { label: 'Imparfait', sketch: 'line', tl: { 'pt-BR': 'uma linha: em curso, hábito ou descrição', en: 'a line: ongoing, habit or description' } }
    },
    items: [
      { id: 1, before: 'Hier, ', after: ' ma prof au supermarché.', verb: 'croiser', a: "j'ai croisé", b: 'je croisais', ans: 'a', clue: 'Hier',
        text: {
          'pt-BR': { tr: 'Ontem, eu encontrei minha professora no supermercado.', why: 'Cruzar com alguém é um encontro rápido, que aconteceu uma vez só, ontem. Fato único e concluído: {passé composé}.' },
          en: { tr: 'Yesterday, I ran into my teacher at the supermarket.', why: 'Running into someone is a quick encounter that happened once, yesterday. A single, finished event: {passé composé}.' } } },
      { id: 2, before: "Quand j'étais petit, ", after: ' dans la rue tous les jours.', verb: 'jouer', a: "j'ai joué", b: 'je jouais', ans: 'b', clue: 'tous les jours',
        text: {
          'pt-BR': { tr: 'Quando eu era pequeno, eu brincava na rua todos os dias.', why: '"{Tous les jours}" é hábito. O que se repetia no passado, sem começo nem fim marcados, vai para o {imparfait}.' },
          en: { tr: 'When I was little, I used to play in the street every day.', why: '"{Tous les jours}" signals a habit. Something that kept happening in the past, with no clear start or end, goes in the {imparfait} (in English, often "used to").' } } },
      { id: 3, before: '', after: ' la télé quand le téléphone a sonné.', verb: 'regarder', a: "J'ai regardé", b: 'Je regardais', ans: 'b', clue: 'quand le téléphone a sonné',
        text: {
          'pt-BR': { tr: 'Eu estava vendo TV quando o telefone tocou.', why: 'A TV era a ação de fundo, em andamento, quando o telefone tocou. O fundo fica no {imparfait}; o que interrompe ({a sonné}) fica no {passé composé}.' },
          en: { tr: 'I was watching TV when the phone rang.', why: 'Watching TV was the background action, in progress when the phone rang. The background goes in the {imparfait} ("was watching"); the interruption ({a sonné}) goes in the {passé composé}.' } } },
      { id: 4, before: 'Hier soir, ', after: ' un film, puis je suis allé me coucher.', verb: 'regarder', a: "j'ai regardé", b: 'je regardais', ans: 'a', clue: 'puis je suis allé me coucher',
        text: {
          'pt-BR': { tr: 'Ontem à noite, eu vi um filme e depois fui dormir.', why: 'Ações em sequência: uma termina e vem a outra ("{puis}"). Fatos encadeados vão para o {passé composé}.' },
          en: { tr: 'Last night, I watched a movie, then I went to bed.', why: 'Actions in a sequence: one ends and the next one starts ("{puis}"). A chain of events goes in the {passé composé}.' } } },
      { id: 5, before: "L'année dernière, nous ", after: ' en Italie.', verb: 'aller', a: 'sommes allés', b: 'allions', ans: 'a', clue: "L'année dernière",
        text: {
          'pt-BR': { tr: 'Ano passado, nós fomos para a Itália.', why: 'A ida para a Itália é um fato que aconteceu e terminou, num período já fechado (o ano passado). {Passé composé}.' },
          en: { tr: 'Last year, we went to Italy.', why: 'The trip to Italy is an event that happened and ended, within a period that is already closed (last year). {Passé composé}.' } } },
      { id: 6, before: 'À cette époque, nous ', after: ' en Bretagne chaque été.', verb: 'aller', a: 'sommes allés', b: 'allions', ans: 'b', clue: 'chaque été',
        text: {
          'pt-BR': { tr: 'Naquela época, nós íamos para a Bretanha todo verão.', why: '"{À cette époque}" e "{chaque été}": algo que se repetia durante um período. Hábito no passado: {imparfait}.' },
          en: { tr: 'Back then, we used to go to Brittany every summer.', why: '"{À cette époque}" and "{chaque été}": something that kept happening over a period. A past habit: {imparfait}.' } } },
      { id: 7, before: 'Quand je suis rentré, mon frère ', after: '.', verb: 'dormir', a: 'a dormi', b: 'dormait', ans: 'b', clue: 'Quand je suis rentré',
        text: {
          'pt-BR': { tr: 'Quando eu cheguei em casa, meu irmão estava dormindo.', why: 'O irmão já estava dormindo quando eu cheguei. Ação em andamento naquele momento: {imparfait}.' },
          en: { tr: 'When I got home, my brother was sleeping.', why: 'My brother was already asleep when I got home. An action in progress at that moment: {imparfait}.' } } },
      { id: 8, before: 'Cette nuit, mon frère ', after: ' pendant huit heures.', verb: 'dormir', a: 'a dormi', b: 'dormait', ans: 'a', clue: 'pendant huit heures',
        text: {
          'pt-BR': { tr: 'Esta noite, meu irmão dormiu oito horas.', why: 'O sono tem duração contada e terminou. Ação vista como um bloco fechado: {passé composé}.' },
          en: { tr: 'Last night, my brother slept for eight hours.', why: 'The sleep has a counted length and it ended. An action seen as a closed block: {passé composé}.' } } },
      { id: 9, before: 'Pendant les vacances, il ', after: ' trois jours de suite.', verb: 'pleuvoir', a: 'a plu', b: 'pleuvait', ans: 'a', clue: 'trois jours de suite',
        text: {
          'pt-BR': { tr: 'Nas férias, choveu três dias seguidos.', why: 'A chuva é contada (três dias) e acabou. Um bloco fechado: {passé composé}.' },
          en: { tr: 'During the vacation, it rained three days in a row.', why: 'The rain is counted (three days) and it ended. A closed block: {passé composé}.' } } },
      { id: 10, before: 'Quand on habitait à Brest, il ', after: ' presque tous les jours.', verb: 'pleuvoir', a: 'a plu', b: 'pleuvait', ans: 'b', clue: 'presque tous les jours',
        text: {
          'pt-BR': { tr: 'Quando a gente morava em Brest, chovia quase todo dia.', why: 'A frase descreve como era o clima numa fase da vida. Descrição e repetição: {imparfait}.' },
          en: { tr: 'When we lived in Brest, it rained almost every day.', why: 'The sentence describes what the weather was like during a period of life. Description and repetition: {imparfait}.' } } },
      { id: 11, before: 'Pierre ', after: ' très fatigué quand il est arrivé au travail.', verb: 'être', a: 'a été', b: 'était', ans: 'b', clue: 'quand il est arrivé au travail',
        text: {
          'pt-BR': { tr: 'O Pierre estava muito cansado quando chegou no trabalho.', why: 'O cansaço já existia quando ele chegou. Estados físicos e emocionais de fundo ficam no {imparfait}.' },
          en: { tr: 'Pierre was very tired when he got to work.', why: 'He was already tired when he arrived. Physical and emotional states in the background go in the {imparfait}.' } } },
      { id: 12, before: 'Pierre ', after: ' malade après le voyage.', verb: 'tomber', a: 'est tombé', b: 'tombait', ans: 'a', clue: 'après le voyage',
        text: {
          'pt-BR': { tr: 'O Pierre ficou doente depois da viagem.', why: '"{Tomber malade}" é uma mudança: ele não estava doente e passou a estar, depois daquela viagem. Mudança num momento definido: {passé composé}.' },
          en: { tr: 'Pierre got sick after the trip.', why: '"{Tomber malade}" is a change: he wasn\'t sick and then he was, after that trip. A change at a specific moment: {passé composé}.' } } },
      { id: 13, before: '', after: " Marie en 2018, à l'anniversaire d'un ami.", verb: 'connaître', a: "J'ai connu", b: 'Je connaissais', ans: 'a', clue: "à l'anniversaire d'un ami",
        text: {
          'pt-BR': { tr: 'Eu conheci a Marie em 2018, no aniversário de um amigo.', why: 'Aqui "{connaître}" é o primeiro encontro, numa cena precisa (o aniversário). Evento pontual: {passé composé}.' },
          en: { tr: 'I met Marie in 2018, at a friend\'s birthday party.', why: 'Here "{connaître}" means meeting someone for the first time, in a specific scene (the birthday party). A one-off event: {passé composé}.' } } },
      { id: 14, before: '', after: " Marie quand j'ai commencé à travailler dans cette entreprise.", verb: 'connaître', a: "J'ai déjà connu", b: 'Je connaissais déjà', ans: 'b', clue: 'déjà',
        text: {
          'pt-BR': { tr: 'Eu já conhecia a Marie quando comecei a trabalhar nessa empresa.', why: '"{Déjà}": a pessoa já era conhecida antes, um estado que continuava. Estado de fundo: {imparfait}.' },
          en: { tr: 'I already knew Marie when I started working at that company.', why: '"{Déjà}": I knew her from before, a state that was still going on. A background state: {imparfait}.' } } },
      { id: 15, before: 'Quand elle travaillait au centre-ville, elle ', after: ' un café après le déjeuner.', verb: 'prendre', a: 'a toujours pris', b: 'prenait toujours', ans: 'b', clue: 'toujours',
        text: {
          'pt-BR': { tr: 'Quando ela trabalhava no centro, ela sempre tomava um café depois do almoço.', why: '"{Toujours}", dentro de uma fase que já passou, é hábito. {Imparfait}.' },
          en: { tr: 'When she worked downtown, she always had a coffee after lunch.', why: '"{Toujours}", within a period that is over, signals a habit. {Imparfait}.' } } },
      { id: 16, before: 'Hier, elle ', after: ' un café après le déjeuner.', verb: 'prendre', a: 'a pris', b: 'prenait', ans: 'a', clue: 'Hier',
        text: {
          'pt-BR': { tr: 'Ontem, ela tomou um café depois do almoço.', why: 'Um café, uma vez, ontem. Fato único e concluído: {passé composé}.' },
          en: { tr: 'Yesterday, she had a coffee after lunch.', why: 'One coffee, once, yesterday. A single, finished event: {passé composé}.' } } },
      { id: 17, before: '', after: " un livre quand mon amie m'a appelé.", verb: 'lire', a: "J'ai lu", b: 'Je lisais', ans: 'b', clue: "quand mon amie m'a appelé",
        text: {
          'pt-BR': { tr: 'Eu estava lendo um livro quando minha amiga me ligou.', why: 'A leitura estava em andamento quando a amiga ligou. O fundo fica no {imparfait}; o que interrompe ({m\'a appelé}) fica no {passé composé}.' },
          en: { tr: 'I was reading a book when my friend called me.', why: 'The reading was in progress when my friend called. The background goes in the {imparfait} ("was reading"); the interruption ({m\'a appelé}) goes in the {passé composé}.' } } },
      { id: 18, before: 'Pendant les vacances, ', after: ' tout le livre.', verb: 'lire', a: "j'ai lu", b: 'je lisais', ans: 'a', clue: 'tout le livre',
        text: {
          'pt-BR': { tr: 'Nas férias, eu li o livro inteiro.', why: '"{Tout le livre}": leitura completa, do começo ao fim. Ação concluída: {passé composé}.' },
          en: { tr: 'During the vacation, I read the whole book.', why: '"{Tout le livre}": the whole reading, from start to finish. A finished action: {passé composé}.' } } },
      { id: 19, before: 'Il ', after: ' minuit et tout le monde dormait.', verb: 'être', a: 'a été', b: 'était', ans: 'b', clue: 'et tout le monde dormait',
        text: {
          'pt-BR': { tr: 'Era meia-noite e todo mundo estava dormindo.', why: 'A hora e a cena (todo mundo dormindo) montam o cenário da história. Cenário e descrição: {imparfait}.' },
          en: { tr: 'It was midnight and everyone was asleep.', why: 'The time and the scene (everyone asleep) set the stage for the story. Setting and description: {imparfait}.' } } },
      { id: 20, before: 'Soudain, quelqu\'un ', after: ' à la porte.', verb: 'frapper', a: 'a frappé', b: 'frappait', ans: 'a', clue: 'Soudain',
        text: {
          'pt-BR': { tr: 'De repente, alguém bateu na porta.', why: '"{Soudain}" marca um acontecimento que corta o cenário. Fato pontual: {passé composé}.' },
          en: { tr: 'Suddenly, someone knocked on the door.', why: '"{Soudain}" marks an event that breaks into the scene. A one-off event: {passé composé}.' } } },
      { id: 21, before: '', after: ' à Lyon pendant deux ans, puis je suis parti à Paris.', verb: 'habiter', a: "J'ai habité", b: "J'habitais", ans: 'a', clue: 'pendant deux ans, puis',
        text: {
          'pt-BR': { tr: 'Eu morei em Lyon por dois anos e depois fui morar em Paris.', why: 'O tempo em Lyon tem começo e fim (dois anos, depois Paris). Período fechado: {passé composé}.' },
          en: { tr: 'I lived in Lyon for two years, then I moved to Paris.', why: 'The time in Lyon has a start and an end (two years, then Paris). A closed period: {passé composé}.' } } },
      { id: 22, before: 'Quand ', after: ' à Lyon, je prenais le métro tous les jours.', verb: 'habiter', a: "j'ai habité", b: "j'habitais", ans: 'b', clue: 'je prenais le métro tous les jours',
        text: {
          'pt-BR': { tr: 'Quando eu morava em Lyon, eu pegava o metrô todo dia.', why: '"{Quand j\'habitais}" abre uma fase da vida, e o hábito dessa fase ({je prenais}) pede um pano de fundo também no {imparfait}.' },
          en: { tr: 'When I lived in Lyon, I took the metro every day.', why: '"{Quand j\'habitais}" opens a period of life, and the habit in that period ({je prenais}) calls for a background in the {imparfait} too.' } } }
    ]
  }
];
