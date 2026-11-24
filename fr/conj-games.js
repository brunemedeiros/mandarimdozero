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
// Jogo (lista, 2026-11-06): free (true = grátis; sem o campo = Premium), sample (id da frase mostrada no cartão),
//   theme (etiqueta de tema por idioma do site); sampleHint: 'verb' = no cartão, o infinitivo entre parênteses em vez
//   das duas opções.
//   text: tradução (tr) e explicação (why) por idioma do site. O curso em inglês não mostra
//         português: sem a chave do idioma, cai no pt-BR só como último recurso.
const CONJ_GAMES = [
  // A1 (A1-g1). Expressões em que o português ("estou com fome") e o inglês ("I am hungry") levam ao auxiliar errado.
  {
    id: 'etre-avoir',
    level: 'A1',
    free: true, // grátis do A1 (decisão da autora, 2026-11-06)
    sample: 3,
    theme: { 'pt-BR': 'Être e avoir', en: 'Être and avoir' },
    title: { 'pt-BR': '{Être} ou {avoir}?', en: '{Être} or {avoir}?' },
    lede: {
      'pt-BR': 'Fome, frio, sede, medo: em francês muita coisa se "tem" ({avoir}) em vez de se "estar". Complete com {être} ou {avoir} e veja onde o português engana.',
      en: 'Hungry, cold, 25 years old, right: in French you "have" lots of things ({avoir}) instead of "being" them. Fill in {être} or {avoir} and see where English leads you astray.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Avoir', tl: { 'pt-BR': "{avoir}: o que você tem (idade, fome, frio, medo, razão...)", en: "{avoir}: what you have (age, hunger, cold, fear, being right...)" } },
      b: { label: 'Être', tl: { 'pt-BR': "{être}: o que você é ou como você está ({fatigué}, {malade}, {en retard}, {marié}...)", en: "{être}: what you are or how you are (tired, sick, late, married...)" } }
    },
    // "Corrija o erro" (etapa 7, aprovado pela autora em 2026-11-11; rascunho e revisão em docs/jogos-corrija-o-erro-rascunho.md):
    // a frase vem com UMA forma errada (wrong); a aluna escreve a certa (fix). kind: 'a'|'b' = a opção do jogo que está certa.
    fix: [
      { id: 'f1', before: "Elle ", wrong: "est", fix: "a", after: " trente ans.", kind: 'a', clue: "trente ans",
        text: { 'pt-BR': { tr: "Ela tem trinta anos.", why: "Idade se tem, como em português: {elle a trente ans}. {Elle est trente ans} não existe." }, en: { tr: "She's thirty.", why: "Age goes with {avoir}: {elle a trente ans}, literally \"she has thirty years\"." } } },
      { id: 'f2', before: "Vous ", wrong: "êtes", fix: "avez", after: " raison, c'est fermé le lundi.", kind: 'a', clue: "raison",
        text: { 'pt-BR': { tr: "Você tem razão, fecha às segundas.", why: "\"Ter razão\" é {avoir raison}, como em português: {vous avez raison}, nunca {vous êtes raison}." }, en: { tr: "You're right, it's closed on Mondays.", why: "English says \"you're right\", but French says you \"have reason\": {vous avez raison}." } } },
      { id: 'f3', before: "Mon fils ", wrong: "a", fix: "est", after: " jaloux de sa petite sœur.", kind: 'b', clue: "jaloux",
        text: { 'pt-BR': { tr: "Meu filho tem ciúmes da irmãzinha.", why: "Em português se tem ciúmes, mas em francês ciumento é adjetivo, então vem com {être}: {il est jaloux}." }, en: { tr: "My son is jealous of his little sister.", why: "{Jaloux} is an adjective, so it takes {être}, just like \"is jealous\": {il est jaloux}." } } },
      { id: 'f4', before: "Tu ", wrong: "as", fix: "es", after: " malade ? Tu as l'air pâle.", kind: 'b', clue: "malade",
        text: { 'pt-BR': { tr: "Você está doente? Está com uma cara pálida.", why: "Doente é adjetivo: {tu es malade}. Já a doença em si se tem: {tu as la grippe}." }, en: { tr: "Are you sick? You look pale.", why: "\"Sick\" is an adjective: {tu es malade}. The illness itself takes {avoir}: {tu as la grippe}." } } },
    ],
    items: [
      { id: 1, before: '', after: ' vingt-cinq ans.', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'vingt-cinq ans',
        text: {
          'pt-BR': { tr: 'Eu tenho vinte e cinco anos.', why: "Idade em francês se tem, como em português: {j'ai vingt-cinq ans}. Nunca {je suis vingt-cinq ans}." },
          en: { tr: 'I\'m twenty-five.', why: "In French you have your age: {j'ai vingt-cinq ans}. Never {je suis vingt-cinq ans}." } } },
      { id: 2, before: 'Il ', after: ' quel âge, ton frère ?', a: 'a', b: 'est', ans: 'a', clue: 'quel âge',
        text: {
          'pt-BR': { tr: 'Quantos anos tem o seu irmão?', why: "Para perguntar a idade, também vai {avoir}: {il a quel âge ?} é \"ele tem qual idade?\"." },
          en: { tr: 'How old is your brother?', why: "English asks how old he is, but French asks what age he has: {il a quel âge ?}" } } },
      { id: 3, before: '', after: ' faim ! On mange ?', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'faim',
        text: {
          'pt-BR': { tr: 'Estou com fome! Vamos comer?', why: "O \"estou com fome\" engana: em francês a fome se tem, {j'ai faim}. Nunca com {être}." },
          en: { tr: 'I\'m hungry! Shall we eat?', why: "English says \"I'm hungry\", but in French hunger is something you have: {j'ai faim}." } } },
      { id: 4, before: 'Il fait 35 degrés, ', after: ' chaud.', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'chaud',
        text: {
          'pt-BR': { tr: 'Está fazendo 35 graus, estou com calor.', why: "Calor se tem: {j'ai chaud}. Cuidado: {je suis chaud} é gíria para \"topo, estou dentro\" e pode soar malicioso." },
          en: { tr: 'It\'s 35 degrees, I\'m hot.', why: "Feeling hot is {j'ai chaud}. Careful: {je suis chaud} is slang for \"I'm up for it\" and can sound suggestive." } } },
      { id: 5, before: 'Tu peux fermer la fenêtre ? ', after: ' froid.', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'froid',
        text: {
          'pt-BR': { tr: 'Você pode fechar a janela? Estou com frio.', why: "Frio se tem: {j'ai froid}. Repare que {je suis froid} descreve uma pessoa fria, distante." },
          en: { tr: 'Can you close the window? I\'m cold.', why: "Feeling cold is {j'ai froid}. Watch out: {je suis froid} describes a cold, distant person." } } },
      { id: 6, before: 'Tu ', after: ' raison, c\'est trop cher.', a: 'as', b: 'es', ans: 'a', clue: 'raison',
        text: {
          'pt-BR': { tr: 'Você tem razão, está caro demais.', why: "\"Ter razão\" é {avoir raison}, igual ao português: {tu as raison}, nunca {tu es raison}." },
          en: { tr: 'You\'re right, it\'s too expensive.', why: "English says \"you're right\", but French says you \"have reason\": {tu as raison}." } } },
      { id: 7, before: 'Les enfants ', after: ' peur du chien.', a: 'ont', b: 'sont', ans: 'a', clue: 'peur',
        text: {
          'pt-BR': { tr: 'As crianças estão com medo do cachorro.', why: "Medo se tem: {avoir peur de}. \"Estar com medo\" e \"ter medo\" viram a mesma coisa: {ils ont peur}." },
          en: { tr: 'The kids are scared of the dog.', why: "\"Scared\" uses \"be\" in English, but French uses {avoir}: {avoir peur de}, \"to have fear of\"." } } },
      { id: 8, before: 'Il est tard, ', after: ' sommeil.', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'sommeil',
        text: {
          'pt-BR': { tr: 'Está tarde, estou com sono.', why: "Sono é substantivo e vem com {avoir}: {j'ai sommeil}. Não confunda com {fatigué}, que é adjetivo." },
          en: { tr: 'It\'s late, I\'m sleepy.', why: "\"Sleepy\" is an adjective, but French uses a noun, {sommeil}, with {avoir}: {j'ai sommeil}." } } },
      { id: 9, before: '', after: ' fatigué après le travail.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'fatigué',
        text: {
          'pt-BR': { tr: 'Estou cansado depois do trabalho.', why: "Cansado é adjetivo, então vem com {être}: {je suis fatigué}. Já o sono se tem: {j'ai sommeil}." },
          en: { tr: 'I\'m tired after work.', why: "\"Tired\" is an adjective, so it takes {être}: {je suis fatigué}. \"Sleepy\" is {j'ai sommeil}." } } },
      { id: 10, before: 'Elle ', after: ' mal à la tête.', a: 'a', b: 'est', ans: 'a', clue: 'mal à la tête',
        text: {
          'pt-BR': { tr: 'Ela está com dor de cabeça.', why: "Dor se tem, não se é: {avoir mal à} + parte do corpo, {elle a mal à la tête}." },
          en: { tr: 'She has a headache.', why: "Pain goes with {avoir}: {avoir mal à} + body part. Here the English \"has\" points the right way." } } },
      { id: 11, before: '', after: ' sûr que c\'est ici.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'sûr',
        text: {
          'pt-BR': { tr: 'Tenho certeza que é aqui.', why: "Repare: \"tenho certeza\" puxa para {avoir}, mas em francês é adjetivo, com {être}: {je suis sûr} (ou {sûre})." },
          en: { tr: 'I\'m sure it\'s here.', why: "\"Sure\" is an adjective, so it takes {être}, just like in English: {je suis sûr} (or {sûre})." } } },
      { id: 12, before: '', after: ' pressé, je te rappelle plus tard.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'pressé',
        text: {
          'pt-BR': { tr: 'Estou com pressa, te ligo mais tarde.', why: "\"Com pressa\" é adjetivo em francês: {je suis pressé}. E {j'ai hâte} é \"não vejo a hora\", não pressa." },
          en: { tr: 'I\'m in a hurry, I\'ll call you back later.', why: "\"In a hurry\" is one adjective in French, so it takes {être}: {je suis pressé}. {J'ai pressé} means \"I squeezed\"." } } },
      { id: 13, before: 'Nous ', after: ' en retard, le film commence !', a: 'avons', b: 'sommes', ans: 'b', clue: 'en retard',
        text: {
          'pt-BR': { tr: 'Estamos atrasados, o filme está começando!', why: "\"Estar atrasado\" é {être en retard}. Aqui o \"estar\" do português acerta." },
          en: { tr: 'We\'re late, the movie is starting!', why: "\"Be late\" is {être en retard}, so here English points the right way." } } },
      { id: 14, before: 'Mon frère ', after: ' marié.', a: 'a', b: 'est', ans: 'b', clue: 'marié',
        text: {
          'pt-BR': { tr: 'Meu irmão é casado.', why: "Estado civil vem com {être}: {il est marié}, como \"ele é casado\"." },
          en: { tr: 'My brother is married.', why: "\"Be married\" is {être marié}, just like in English: {il est marié}." } } },
      { id: 15, before: '', after: ' d\'accord avec toi.', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'd\'accord',
        text: {
          'pt-BR': { tr: 'Eu concordo com você.', why: "Para dizer \"concordo\", o mais comum em francês é {je suis d'accord}, sempre com {être}." },
          en: { tr: 'I agree with you.', why: "To say \"I agree\", French usually says {je suis d'accord}, always with {être}." } } },
      { id: 16, before: 'Vous ', after: ' soif ? Il y a de l\'eau.', a: 'avez', b: 'êtes', ans: 'a', clue: 'soif',
        text: {
          'pt-BR': { tr: 'Vocês estão com sede? Tem água.', why: "Sede, assim como fome, se tem: {avoir soif}. O \"estar com sede\" vira {vous avez soif ?}" },
          en: { tr: 'Are you thirsty? There\'s water.', why: "Like hunger, thirst is something you have in French: {avoir soif}, never {être}." } } },
      { id: 17, before: 'Tu ', after: ' de la chance !', a: 'as', b: 'es', ans: 'a', clue: 'de la chance',
        text: {
          'pt-BR': { tr: 'Você tem sorte!', why: "Sorte se tem: {avoir de la chance}. Mesmo no \"você está com sorte\", em francês é {avoir}." },
          en: { tr: 'You\'re lucky!', why: "\"Be lucky\" becomes {avoir de la chance}, literally \"to have some luck\"." } } },
      { id: 18, before: '', after: ' envie d\'un café.', a: 'J\'ai', b: 'Je suis', ans: 'a', clue: 'envie',
        text: {
          'pt-BR': { tr: 'Estou com vontade de tomar um café.', why: "Vontade se tem: {avoir envie de}, {j'ai envie d'un café}. {Je suis envie} não existe." },
          en: { tr: 'I feel like having a coffee.', why: "\"Feel like\" becomes {avoir envie de}, literally \"to have desire for\": {j'ai envie d'un café}." } } },
      { id: 19, before: 'Elle ', after: ' malade, elle reste à la maison.', a: 'a', b: 'est', ans: 'b', clue: 'malade',
        text: {
          'pt-BR': { tr: 'Ela está doente, vai ficar em casa.', why: "Doente é adjetivo: {elle est malade}. Já a doença em si se tem: {elle a la grippe}." },
          en: { tr: 'She\'s sick, she\'s staying home.', why: "\"Sick\" is an adjective: {elle est malade}. But the illness itself you have: {elle a la grippe}." } } }
    ]
  },
  // A1 (A1-g9). Só o auxiliar: com être, os sujeitos são masculinos e no singular, para a concordância do particípio (A2) não aparecer.
  {
    id: 'pc-auxiliaire',
    level: 'A1',
    sample: 1,
    theme: { 'pt-BR': 'Passé composé', en: 'Passé composé' },
    title: { 'pt-BR': '{Passé composé}: {avoir} ou {être}?', en: '{Passé composé}: {avoir} or {être}?' },
    lede: {
      'pt-BR': 'A maioria dos verbos usa {avoir}, mas alguns pedem {être}. Escolha o auxiliar certo e veja os verbos que mais enganam, de um lado e do outro.',
      en: 'Most verbs take {avoir}, but some take {être}. Pick the right auxiliary and see which verbs trip people up most, on both sides.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Avoir', tl: { 'pt-BR': "{avoir}: a grande maioria dos verbos", en: "{avoir}: the vast majority of verbs" } },
      b: { label: 'Être', tl: { 'pt-BR': "{être}: ir e vir, entrar e sair, chegar e ir embora, nascer, ficar, cair... e todo verbo com {me}/{se}", en: "{être}: come and go, in and out, arrive and leave, be born, stay, fall... and every verb with {me}/{se}" } }
    },
    // "Corrija o erro" (etapa 7, aprovado pela autora em 2026-11-11; rascunho e revisão em docs/jogos-corrija-o-erro-rascunho.md):
    // a frase vem com UMA forma errada (wrong); a aluna escreve a certa (fix). kind: 'a'|'b' = a opção do jogo que está certa.
    fix: [
      { id: 'f1', before: "Hier, il ", wrong: "a", fix: "est", after: " tombé dans la rue.", kind: 'b', clue: "tombé",
        text: { 'pt-BR': { tr: "Ontem ele caiu na rua.", why: "{Tomber} está na lista curta dos verbos com {être}: {il est tombé}." }, en: { tr: "Yesterday he fell in the street.", why: "{Tomber} is on the short list of verbs that take {être}: {il est tombé}." } } },
      { id: 'f2', before: "", wrong: "J'ai", fix: "Je suis", after: " venu en bus.", kind: 'b', clue: "venu",
        text: { 'pt-BR': { tr: "Eu vim de ônibus.", why: "{Venir} pede {être}: {je suis venu}. Cuidado, {j'ai venu} é um erro muito comum." }, en: { tr: "I came by bus.", why: "{Venir} takes {être}: {je suis venu}. Watch out, {j'ai venu} is a very common mistake." } } },
      { id: 'f3', before: "Il ", wrong: "est", fix: "a", after: " mangé une pizza.", kind: 'a', clue: "mangé",
        text: { 'pt-BR': { tr: "Ele comeu uma pizza.", why: "{Manger} não está na lista do {être} nem tem {se}, então vai com {avoir}: {il a mangé}." }, en: { tr: "He ate a pizza.", why: "{Manger} isn't on the {être} list and has no {se}, so it takes {avoir}: {il a mangé}." } } },
      { id: 'f4', before: "Mon grand-père ", wrong: "a", fix: "est", after: " né en 1950.", kind: 'b', clue: "né",
        text: { 'pt-BR': { tr: "Meu avô nasceu em 1950.", why: "Nascer e morrer ({naître}, {mourir}) vão com {être}: {il est né}." }, en: { tr: "My grandfather was born in 1950.", why: "Being born and dying ({naître}, {mourir}) take {être}: {il est né}." } } },
    ],
    items: [
      { id: 1, before: 'Hier, ', after: ' allé au cinéma.', verb: 'aller', a: 'j\'ai', b: 'je suis', ans: 'b', clue: 'allé',
        text: {
          'pt-BR': { tr: 'Ontem eu fui ao cinema.', why: "{Aller} pede {être}: {je suis allé}. O {j'ai allé} é um dos erros mais comuns no começo." },
          en: { tr: 'Yesterday I went to the movies.', why: "\"I have gone\" makes {avoir} tempting, but {aller} takes {être}: {je suis allé}, never {j'ai allé}." } } },
      { id: 2, before: 'Mon cousin ', after: ' venu dîner samedi.', verb: 'venir', a: 'a', b: 'est', ans: 'b', clue: 'venu',
        text: {
          'pt-BR': { tr: 'Meu primo veio jantar no sábado.', why: "{Venir} é o par de {aller} e também vai com {être}: {il est venu}." },
          en: { tr: 'My cousin came over for dinner on Saturday.', why: "{Venir} is {aller}'s partner and also takes {être}: {il est venu}." } } },
      { id: 3, before: 'Le train ', after: ' arrivé en retard.', verb: 'arriver', a: 'a', b: 'est', ans: 'b', clue: 'arrivé',
        text: {
          'pt-BR': { tr: 'O trem chegou atrasado.', why: "Chegar e partir ({arriver}, {partir}) formam um par do {être}: {il est arrivé}." },
          en: { tr: 'The train arrived late.', why: "Arriving and leaving ({arriver}, {partir}) are a pair that takes {être}: {il est arrivé}." } } },
      { id: 4, before: 'Thomas ', after: ' parti sans dire au revoir.', verb: 'partir', a: 'a', b: 'est', ans: 'b', clue: 'parti',
        text: {
          'pt-BR': { tr: 'O Thomas foi embora sem se despedir.', why: "Ir embora é {partir}, um verbo da lista do {être}: {il est parti}." },
          en: { tr: 'Thomas left without saying goodbye.', why: "{Partir} (to leave) is on the {être} list: {il est parti}." } } },
      { id: 5, before: '', after: ' resté à la maison tout le week-end.', verb: 'rester', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'resté',
        text: {
          'pt-BR': { tr: 'Eu fiquei em casa o fim de semana todo.', why: "Repare: {rester} não tem movimento nenhum, mas está na lista do {être}: {je suis resté}." },
          en: { tr: 'I stayed home all weekend.', why: "Notice: {rester} involves no movement, yet it's on the {être} list: {je suis resté}, not {j'ai resté}." } } },
      { id: 6, before: 'Mon fils ', after: ' tombé dans l\'escalier.', verb: 'tomber', a: 'a', b: 'est', ans: 'b', clue: 'tombé',
        text: {
          'pt-BR': { tr: 'Meu filho caiu na escada.', why: "{Tomber} é um dos verbos que pedem {être}: {il est tombé}." },
          en: { tr: 'My son fell on the stairs.', why: "{Tomber} (to fall) is one of the verbs that take {être}: {il est tombé}." } } },
      { id: 7, before: '', after: ' né à Rio.', verb: 'naître', a: 'J\'ai', b: 'Je suis', ans: 'b', clue: 'né',
        text: {
          'pt-BR': { tr: 'Eu nasci no Rio.', why: "Em português \"nasci\" não tem auxiliar, aí dá vontade de pôr {avoir}. Mas {naître} vai com {être}: {je suis né}." },
          en: { tr: 'I was born in Rio.', why: "Like the English \"was born\", French uses {être} here: {je suis né}, never {j'ai né}." } } },
      { id: 8, before: 'Hier soir, mon père ', after: ' rentré tard.', verb: 'rentrer', a: 'a', b: 'est', ans: 'b', clue: 'rentré',
        text: {
          'pt-BR': { tr: 'Ontem à noite, meu pai chegou tarde em casa.', why: "Voltar para casa é {rentrer}, e ele pede {être}: {il est rentré}." },
          en: { tr: 'Last night, my dad got home late.', why: "{Rentrer} (to get back home) takes {être}: {il est rentré}." } } },
      { id: 9, before: 'Samedi, ', after: ' sorti avec des amis.', verb: 'sortir', a: 'j\'ai', b: 'je suis', ans: 'b', clue: 'sorti',
        text: {
          'pt-BR': { tr: 'No sábado, eu saí com uns amigos.', why: "Entrar e sair ({entrer}, {sortir}) formam um par do {être}: {je suis sorti}." },
          en: { tr: 'On Saturday, I went out with friends.', why: "Going in and going out ({entrer}, {sortir}) are a pair that takes {être}: {je suis sorti}." } } },
      { id: 10, before: 'Le professeur ', after: ' entré dans la salle.', verb: 'entrer', a: 'a', b: 'est', ans: 'b', clue: 'entré',
        text: {
          'pt-BR': { tr: 'O professor entrou na sala.', why: "{Entrer} está na lista do {être}: {il est entré}." },
          en: { tr: 'The teacher came into the classroom.', why: "{Entrer} (to go in) is on the {être} list: {il est entré}." } } },
      { id: 11, before: 'Le chat ', after: ' monté sur la table.', verb: 'monter', a: 'a', b: 'est', ans: 'b', clue: 'monté',
        text: {
          'pt-BR': { tr: 'O gato subiu na mesa.', why: "Subir e descer ({monter}, {descendre}) formam um par do {être}: {il est monté}." },
          en: { tr: 'The cat climbed onto the table.', why: "Going up and down ({monter}, {descendre}) are a pair that takes {être}: {il est monté}." } } },
      { id: 12, before: 'Il ', after: ' descendu du bus.', verb: 'descendre', a: 'a', b: 'est', ans: 'b', clue: 'descendu',
        text: {
          'pt-BR': { tr: 'Ele desceu do ônibus.', why: "{Descendre} é o par de {monter} e vai com {être}: {il est descendu}." },
          en: { tr: 'He got off the bus.', why: "{Descendre} (to go down, get off) is {monter}'s partner and takes {être}: {il est descendu}." } } },
      { id: 13, before: 'Ce matin, ', after: ' levé à six heures.', verb: 'se lever', a: 'je m\'ai', b: 'je me suis', ans: 'b', clue: 'levé',
        text: {
          'pt-BR': { tr: 'Hoje de manhã, eu me levantei às seis.', why: "Todo verbo com {me}, {te}, {se} vai com {être}: {je me suis levé}. {Je m'ai levé} não existe." },
          en: { tr: 'This morning, I got up at six.', why: "Every reflexive verb (with {me}, {te}, {se}) takes {être}: {je me suis levé}. {Je m'ai levé} doesn't exist." } } },
      { id: 14, before: 'Hier soir, ', after: ' couché à minuit.', verb: 'se coucher', a: 'je m\'ai', b: 'je me suis', ans: 'b', clue: 'couché',
        text: {
          'pt-BR': { tr: 'Ontem à noite, eu fui dormir à meia-noite.', why: "{Se coucher} tem {se}, então vai com {être}: {je me suis couché}. O \"fui dormir\" esconde esse {me}." },
          en: { tr: 'Last night, I went to bed at midnight.', why: "{Se coucher} has a {se}, so it takes {être}: {je me suis couché}. \"Went to bed\" hides that {me}." } } },
      { id: 15, before: 'L\'année dernière, ', after: ' voyagé au Japon.', verb: 'voyager', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'voyagé',
        text: {
          'pt-BR': { tr: 'Ano passado, eu viajei para o Japão.', why: "Viajar parece movimento, mas {voyager} não está na lista do {être}: {j'ai voyagé}." },
          en: { tr: 'Last year, I traveled to Japan.', why: "Traveling sounds like movement, but {voyager} isn't on the {être} list: {j'ai voyagé}." } } },
      { id: 16, before: 'Nous ', after: ' marché deux heures.', verb: 'marcher', a: 'avons', b: 'sommes', ans: 'a', clue: 'marché',
        text: {
          'pt-BR': { tr: 'Nós caminhamos duas horas.', why: "O {être} é para ir de um lugar a outro, não para o jeito de se mover: {nous avons marché}." },
          en: { tr: 'We walked for two hours.', why: "{Être} goes with getting from one place to another, not the way you move: {nous avons marché}." } } },
      { id: 17, before: 'Paul ', after: ' couru dans le parc.', verb: 'courir', a: 'a', b: 'est', ans: 'a', clue: 'couru',
        text: {
          'pt-BR': { tr: 'O Paul correu no parque.', why: "Correr é jeito de se mover, não ir de um lugar a outro: por isso {avoir}, {il a couru}." },
          en: { tr: 'Paul ran in the park.', why: "Running is a way of moving, not getting somewhere, so it takes {avoir}: {il a couru}." } } },
      { id: 18, before: 'Hier, ', after: ' nagé à la piscine.', verb: 'nager', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'nagé',
        text: {
          'pt-BR': { tr: 'Ontem eu nadei na piscina.', why: "Nadar é jeito de se mover, e jeito de se mover vai com {avoir}: {j'ai nagé}." },
          en: { tr: 'Yesterday I swam at the pool.', why: "Swimming is a way of moving, and that takes {avoir}: {j'ai nagé}." } } },
      { id: 19, before: 'Il ', after: ' devenu professeur.', verb: 'devenir', a: 'a', b: 'est', ans: 'b', clue: 'devenu',
        text: {
          'pt-BR': { tr: 'Ele virou professor.', why: "{Devenir} é da família de {venir} e vai com {être}: {il est devenu}. Nunca {il a devenu}." },
          en: { tr: 'He became a teacher.', why: "{Devenir} is part of {venir}'s family and takes {être}: {il est devenu}. Never {il a devenu}." } } },
      { id: 20, before: 'Ils ', after: ' visité le Louvre.', verb: 'visiter', a: 'ont', b: 'sont', ans: 'a', clue: 'visité',
        text: {
          'pt-BR': { tr: 'Eles visitaram o Louvre.', why: "Visitar lembra ir a algum lugar, mas {visiter} não está na lista do {être}: {ils ont visité}." },
          en: { tr: 'They visited the Louvre.', why: "Visiting feels like going somewhere, but {visiter} isn't on the {être} list: {ils ont visité}." } } },
      { id: 21, before: 'Marc ', after: ' quitté Paris en 2020.', verb: 'quitter', a: 'a', b: 'est', ans: 'a', clue: 'quitté',
        text: {
          'pt-BR': { tr: 'O Marc saiu de Paris em 2020.', why: "{Quitter} vai com {avoir}: {il a quitté Paris}. Com {partir} seria {il est parti}. Mesmo sentido, outro auxiliar." },
          en: { tr: 'Marc left Paris in 2020.', why: "{Quitter} takes {avoir}: {il a quitté Paris}. With {partir} it's {il est parti}. Same idea, different auxiliary." } } },
      { id: 22, before: 'Il ', after: ' été malade toute la semaine.', verb: 'être', a: 'a', b: 'est', ans: 'a', clue: 'été',
        text: {
          'pt-BR': { tr: 'Ele passou a semana toda doente.', why: "O próprio {être} vai com {avoir}: {il a été}. Cuidado, {il est été} não existe." },
          en: { tr: 'He was sick all week.', why: "{Être} itself takes {avoir} in the {passé composé}: {il a été}, like the English \"has been\"." } } },
      { id: 23, before: 'Il ', after: ' pris le bus pour aller au travail.', verb: 'prendre', a: 'a', b: 'est', ans: 'a', clue: 'pris',
        text: {
          'pt-BR': { tr: 'Ele pegou o ônibus para ir ao trabalho.', why: "O verbo no {passé composé} é {prendre}, que vai com {avoir}: {il a pris}. O {aller} está no infinitivo." },
          en: { tr: 'He took the bus to go to work.', why: "The verb in the {passé composé} is {prendre}, which takes {avoir}: {il a pris}. {Aller} is just an infinitive." } } },
      { id: 24, before: 'À midi, ', after: ' mangé une salade.', verb: 'manger', a: 'j\'ai', b: 'je suis', ans: 'a', clue: 'mangé',
        text: {
          'pt-BR': { tr: 'No almoço, eu comi uma salada.', why: "{Manger} vai com {avoir}, como a maioria dos verbos: {j'ai mangé}. Na dúvida, aposte no {avoir}." },
          en: { tr: 'At lunch, I had a salad.', why: "Like most verbs, {manger} takes {avoir}: {j'ai mangé}. When in doubt, {avoir} is the safest bet." } } }
    ]
  },
  // A1 (A1-1, "tu ou vous"). A pista é quem fala com quem, ou uma palavra que já está no tu ou no vous.
  {
    id: 'tu-vous',
    level: 'A1',
    sample: 3,
    theme: { 'pt-BR': 'Formal ou informal', en: 'Formal or informal' },
    title: { 'pt-BR': '{Tu} ou {vous}?', en: '{Tu} or {vous}?' },
    lede: {
      'pt-BR': 'Em português a gente diz "você" para quase todo mundo; em francês é preciso escolher. Leia a pista da frase e escolha a forma certa do verbo.',
      en: 'English has just "you"; French makes you choose. Read the clue in the sentence and pick the right verb form.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Tu', tl: { 'pt-BR': "{tu}: uma pessoa só, próxima (amigo, família, criança)", en: "{tu}: one person you're close to (friend, family, child)" } },
      b: { label: 'Vous', tl: { 'pt-BR': "{vous}: formal (desconhecido, cliente, chefe) ou mais de uma pessoa", en: "{vous}: formal (stranger, customer, boss) or more than one person" } }
    },
    // "Corrija o erro" (etapa 7, aprovado pela autora em 2026-11-11; rascunho e revisão em docs/jogos-corrija-o-erro-rascunho.md):
    // a frase vem com UMA forma errada (wrong); a aluna escreve a certa (fix). kind: 'a'|'b' = a opção do jogo que está certa.
    fix: [
      { id: 'f1', before: "Bonjour madame, ", wrong: "tu peux", fix: "vous pouvez", after: " m'aider, s'il vous plaît ?", kind: 'b', clue: "madame",
        text: { 'pt-BR': { tr: "Bom dia, senhora, pode me ajudar, por favor?", why: "Com uma desconhecida, ainda mais com {madame} e {s'il vous plaît}, vai {vous}: {vous pouvez}." }, en: { tr: "Hello, madam, could you help me, please?", why: "With a stranger you call {madame}, it's {vous}, and {s'il vous plaît} confirms it: {vous pouvez}." } } },
      { id: 'f2', before: "Maman, papa, ", wrong: "tu veux", fix: "vous voulez", after: " un café ?", kind: 'b', clue: "Maman, papa",
        text: { 'pt-BR': { tr: "Mãe, pai, vocês querem um café?", why: "Com o pai ou a mãe sozinhos, é {tu}. Mas aqui são dois, e mais de uma pessoa é sempre {vous}." }, en: { tr: "Mom, Dad, do you want a coffee?", why: "Each parent alone gets {tu}, but here there are two: more than one person is always {vous}." } } },
      { id: 'f3', before: "Pardon, monsieur, ", wrong: "tu habites", fix: "vous habitez", after: " dans le quartier ?", kind: 'b', clue: "monsieur",
        text: { 'pt-BR': { tr: "Com licença, o senhor mora no bairro?", why: "Com um desconhecido, ainda mais chamado de {monsieur}, use {vous}: {vous habitez}." }, en: { tr: "Excuse me, sir, do you live around here?", why: "A stranger you call {monsieur} gets {vous}, the polite \"you\": {vous habitez}." } } },
      { id: 'f4', before: "Papa, ", wrong: "vous voulez", fix: "tu veux", after: " jouer avec moi ?", kind: 'a', clue: "Papa",
        text: { 'pt-BR': { tr: "Pai, quer brincar comigo?", why: "Em francês, os filhos falam {tu} com os pais, mesmo onde no Brasil se diria \"o senhor\". {Vous} soa antiquado." }, en: { tr: "Dad, do you want to play with me?", why: "In France, children say {tu} to their parents. {Vous} with your dad sounds very old-fashioned." } } },
    ],
    items: [
      { id: 1, before: 'Salut Léa ! ', after: ' bien ?', verb: 'aller', a: 'Tu vas', b: 'Vous allez', ans: 'a', clue: 'Salut Léa',
        text: {
          'pt-BR': { tr: 'Oi, Léa! Tudo bem?', why: "{Salut} e o primeiro nome mostram intimidade: com amigo, é {tu}." },
          en: { tr: 'Hi Léa! How are you?', why: "{Salut} and a first name show you're close: a friend gets {tu}." } } },
      { id: 2, before: 'Pardon, madame, ', after: ' l\'heure, s\'il vous plaît ?', verb: 'avoir', a: 'tu as', b: 'vous avez', ans: 'b', clue: 'Pardon, madame',
        text: {
          'pt-BR': { tr: 'Com licença, a senhora tem horas, por favor?', why: "Com adulto que você não conhece, ainda mais chamado de {madame}, comece sempre pelo {vous}." },
          en: { tr: 'Excuse me, ma\'am, do you have the time, please?', why: "English has one \"you\", French has two. With an adult stranger you call {madame}, start with {vous}." } } },
      { id: 3, before: 'Bonjour monsieur, ', after: ' un café ?', verb: 'vouloir', a: 'tu veux', b: 'vous voulez', ans: 'b', clue: 'Bonjour monsieur',
        text: {
          'pt-BR': { tr: 'Bom dia, o senhor quer um café?', why: "{Monsieur} e {madame} quase sempre vêm com {vous}, como o nosso \"o senhor\" e \"a senhora\"." },
          en: { tr: 'Good morning, sir, would you like a coffee?', why: "Calling someone {monsieur} or {madame} almost always means {vous}, the polite \"you\"." } } },
      { id: 4, before: 'Les enfants, ', after: ' prêts ? On y va !', verb: 'être', a: 'tu es', b: 'vous êtes', ans: 'b', clue: 'Les enfants',
        text: {
          'pt-BR': { tr: 'Crianças, vocês estão prontos? Vamos!', why: "Criança ganha {tu}, mas aqui são várias: mais de uma pessoa é sempre {vous}, mesmo com intimidade." },
          en: { tr: 'Kids, are you ready? Let\'s go!', why: "Kids get {tu}, but there are several here. More than one person is always {vous}, however close." } } },
      { id: 5, before: 'Maman, ', after: ' faim ?', verb: 'avoir', a: 'tu as', b: 'vous avez', ans: 'a', clue: 'Maman',
        text: {
          'pt-BR': { tr: 'Mãe, você está com fome?', why: "Em francês, família é {tu}, inclusive pai e mãe." },
          en: { tr: 'Mom, are you hungry?', why: "In French, family gets {tu}, parents included." } } },
      { id: 6, before: 'Mamie, ', after: ' dîner dimanche ?', verb: 'venir', a: 'tu viens', b: 'vous venez', ans: 'a', clue: 'Mamie',
        text: {
          'pt-BR': { tr: 'Vó, você vem jantar no domingo?', why: "No Brasil muita gente diz \"a senhora\" para a avó, mas na França família quase sempre é {tu}." },
          en: { tr: 'Grandma, are you coming for dinner on Sunday?', why: "She's older, but grandma is family, and French families almost always use {tu}." } } },
      { id: 7, before: 'Excusez-moi, monsieur, ', after: ' anglais ?', verb: 'parler', a: 'tu parles', b: 'vous parlez', ans: 'b', clue: 'Excusez-moi, monsieur',
        text: {
          'pt-BR': { tr: 'Com licença, o senhor fala inglês?', why: "{Excusez-moi} já está no {vous} (no {tu} seria {excuse-moi}). O verbo combina: {vous parlez}." },
          en: { tr: 'Excuse me, sir, do you speak English?', why: "{Excusez-moi} is the {vous} form ({excuse-moi} is the {tu} one), so the verb matches: {vous parlez}." } } },
      { id: 8, before: 'Madame, ', after: ' répéter, s\'il vous plaît ?', verb: 'pouvoir', a: 'tu peux', b: 'vous pouvez', ans: 'b', clue: 's\'il vous plaît',
        text: {
          'pt-BR': { tr: 'Professora, pode repetir, por favor?', why: "{Madame} e {s'il vous plaît} pedem {vous}. Na França, é assim que os alunos chamam a professora." },
          en: { tr: 'Ma\'am, could you repeat that, please?', why: "{Madame} and {s'il vous plaît} both call for {vous}. It's also how French students address a female teacher." } } },
      { id: 9, before: '', after: ' me passer le sel, s\'il te plaît ?', verb: 'pouvoir', a: 'Tu peux', b: 'Vous pouvez', ans: 'a', clue: 's\'il te plaît',
        text: {
          'pt-BR': { tr: 'Você pode me passar o sal, por favor?', why: "{S'il te plaît} é do {tu}, então o verbo também: {tu peux}. Misturar os dois é erro comum." },
          en: { tr: 'Can you pass me the salt, please?', why: "{S'il te plaît} is the {tu} form, so the verb is too: {tu peux}. Mixing the two is a common slip." } } },
      { id: 10, before: 'Paul et Marie, ', after: ' au cinéma avec nous ?', verb: 'venir', a: 'tu viens', b: 'vous venez', ans: 'b', clue: 'Paul et Marie',
        text: {
          'pt-BR': { tr: 'Paul e Marie, vocês vêm ao cinema com a gente?', why: "São amigos, mas são dois, e mais de uma pessoa é {vous}. Aqui o {vous} não tem nada de formal." },
          en: { tr: 'Paul and Marie, are you coming to the movies with us?', why: "They're friends, but there are two of them, so it's {vous}. Here {vous} is plural, not formal." } } },
      { id: 11, before: 'Excusez-moi, ', after: ' où est la gare ?', verb: 'savoir', a: 'tu sais', b: 'vous savez', ans: 'b', clue: 'Excusez-moi',
        text: {
          'pt-BR': { tr: 'Com licença, você sabe onde fica a estação?', why: "Com desconhecido na rua, é {vous}. Entre jovens o {tu} pode aparecer, mas na dúvida fique no {vous}." },
          en: { tr: 'Excuse me, do you know where the station is?', why: "Asking a stranger for directions: {vous}. Young people may use {tu} with each other; when in doubt, {vous}." } } },
      { id: 12, before: 'Coucou Julie ! ', after: ' faire quoi ce soir ?', verb: 'vouloir', a: 'Tu veux', b: 'Vous voulez', ans: 'a', clue: 'Coucou Julie',
        text: {
          'pt-BR': { tr: 'Oi, Julie! O que você quer fazer hoje à noite?', why: "{Coucou} é um oi carinhoso, de amigo ou família: {tu}." },
          en: { tr: 'Hey Julie! What do you want to do tonight?', why: "{Coucou} is a very friendly hi, for friends and family: {tu}." } } },
      { id: 13, before: 'Moi, c\'est Hugo. Et toi, ', after: ' comment ?', verb: 's\'appeler', a: 'tu t\'appelles', b: 'vous vous appelez', ans: 'a', clue: 'Et toi',
        text: {
          'pt-BR': { tr: 'Eu sou o Hugo. E você, como se chama?', why: "{Et toi} é a forma do {tu}, então o verbo combina: {tu t'appelles}." },
          en: { tr: 'I\'m Hugo. And you, what\'s your name?', why: "{Et toi} is the {tu} form, so the verb has to match: {tu t'appelles}." } } },
      { id: 14, before: 'Enchanté, madame. Et vous, ', after: ' d\'où ?', verb: 'être', a: 'tu es', b: 'vous êtes', ans: 'b', clue: 'Et vous',
        text: {
          'pt-BR': { tr: 'Muito prazer, senhora. E a senhora, é de onde?', why: "{Et vous} mostra que a conversa é no {vous}, então o verbo também: {vous êtes}." },
          en: { tr: 'Nice to meet you, ma\'am. And you, where are you from?', why: "{Et vous} shows the conversation is in {vous}, so the verb is too: {vous êtes}." } } },
      { id: 15, before: 'Bonjour, mon petit ! ', after: ' quel âge ?', verb: 'avoir', a: 'Tu as', b: 'Vous avez', ans: 'a', clue: 'mon petit',
        text: {
          'pt-BR': { tr: 'Oi, querido! Quantos anos você tem?', why: "Em francês, adulto fala {tu} com criança, mesmo sem conhecer." },
          en: { tr: 'Hi, sweetie! How old are you?', why: "In French, adults say {tu} to children, even ones they don't know." } } },
      { id: 16, before: 'Salut, je suis nouveau dans la classe. Et toi, ', after: ' ici depuis longtemps ?', verb: 'être', a: 'tu es', b: 'vous êtes', ans: 'a', clue: 'Et toi',
        text: {
          'pt-BR': { tr: 'Oi, sou novo na turma. E você, está aqui faz tempo?', why: "Entre colegas de turma o normal é {tu}, mesmo quando acabaram de se conhecer." },
          en: { tr: 'Hi, I\'m new in the class. And you, have you been here long?', why: "Classmates use {tu} with each other, even when they've just met." } } },
      { id: 17, before: 'Monsieur Durand, ', after: ' une réunion à quinze heures.', verb: 'avoir', a: 'tu as', b: 'vous avez', ans: 'b', clue: 'Monsieur Durand',
        text: {
          'pt-BR': { tr: 'Senhor Durand, o senhor tem uma reunião às três da tarde.', why: "{Monsieur} com sobrenome é sinal de distância e respeito: {vous}. Com chefe, em geral, também." },
          en: { tr: 'Mr. Durand, you have a meeting at three p.m.', why: "{Monsieur} plus a last name signals distance and respect: {vous}. Your boss usually gets {vous} too." } } }
    ]
  },
  // A2: o imparfait ainda não entra na trilha A1.
  {
    id: 'pc-imparfait',
    level: 'A2',
    free: true, // grátis do A2 (decisão da autora, 2026-11-06)
    sample: 2,
    sampleHint: 'verb', // no cartão, o verbo entre parênteses (as opções são tempos verbais)
    theme: { 'pt-BR': 'Tempos do passado', en: 'Past tenses' },
    title: { 'pt-BR': '{Passé composé} ou {Imparfait}?', en: '{Passé composé} or {Imparfait}?' },
    lede: {
      'pt-BR': 'Complete cada frase com o {passé composé} ou o {imparfait}. Depois de responder, veja por que a frase pede aquele tempo.',
      en: 'Complete each sentence with the {passé composé} or the {imparfait}. After you answer, see why the sentence calls for that tense.'
    },
    perRound: 10,
    opts: {
      a: { label: 'Passé composé', sketch: 'point', tl: { 'pt-BR': "{passé composé}: um ponto, algo que começou e terminou", en: "{passé composé}: a point, something that started and ended" } },
      b: { label: 'Imparfait', sketch: 'line', tl: { 'pt-BR': "{imparfait}: uma linha, algo em curso, um hábito ou uma descrição", en: "{imparfait}: a line, something ongoing, a habit or a description" } }
    },
    // "Corrija o erro" (etapa 7, aprovado pela autora em 2026-11-11; rascunho e revisão em docs/jogos-corrija-o-erro-rascunho.md):
    // a frase vem com UMA forma errada (wrong); a aluna escreve a certa (fix). kind: 'a'|'b' = a opção do jogo que está certa.
    fix: [
      { id: 'f1', before: "Quand j'étais petit, ", wrong: "je suis allé", fix: "j'allais", after: " à l'école à pied tous les jours.", kind: 'b', clue: "tous les jours",
        text: { 'pt-BR': { tr: "Quando eu era pequeno, ia a pé para a escola todos os dias.", why: "{Tous les jours} mostra um hábito no passado, então vai no {imparfait}: {j'allais}." }, en: { tr: "When I was little, I walked to school every day.", why: "{Tous les jours} shows a past habit, so it takes the {imparfait}: {j'allais}, like \"used to go\"." } } },
      { id: 'f2', before: "Samedi dernier, nous ", wrong: "passions", fix: "avons passé", after: " toute la journée à la plage.", kind: 'a', clue: "Samedi dernier",
        text: { 'pt-BR': { tr: "No sábado passado, passamos o dia todo na praia.", why: "Dia marcado ({samedi dernier}) e duração fechada ({toute la journée}): {passé composé}. {Imparfait} seria hábito." }, en: { tr: "Last Saturday, we spent the whole day at the beach.", why: "A set day ({samedi dernier}) and a closed span ({toute la journée}): {passé composé}, not a habit." } } },
      { id: 'f3', before: "Quand je suis arrivé, il ", wrong: "a plu", fix: "pleuvait", after: " depuis une heure.", kind: 'b', clue: "depuis une heure",
        text: { 'pt-BR': { tr: "Quando eu cheguei, já estava chovendo fazia uma hora.", why: "Com {depuis une heure}, a chuva já estava em andamento {quand je suis arrivé}: {il pleuvait}." }, en: { tr: "When I arrived, it had been raining for an hour.", why: "With {depuis}, French uses the {imparfait} where English says \"had been raining\": {il pleuvait}." } } },
      { id: 'f4', before: "Hier soir, le téléphone ", wrong: "sonnait", fix: "a sonné", after: " trois fois.", kind: 'a', clue: "trois fois",
        text: { 'pt-BR': { tr: "Ontem à noite o telefone tocou três vezes.", why: "Ações contadas ({trois fois}) num momento marcado ({hier soir}) pedem {passé composé}: {il a sonné}." }, en: { tr: "Last night the phone rang three times.", why: "Counted actions ({trois fois}) at a set time ({hier soir}) call for the {passé composé}: {il a sonné}." } } },
    ],
    items: [
      { id: 1, before: 'Hier, ', after: ' ma prof au supermarché.', verb: 'croiser', a: "j'ai croisé", b: 'je croisais', ans: 'a', clue: 'Hier',
        text: {
          'pt-BR': { tr: 'Ontem, eu encontrei minha professora no supermercado.', why: "{Hier} e um encontro rápido, que aconteceu uma vez só: fato concluído, {passé composé}." },
          en: { tr: 'Yesterday, I ran into my teacher at the supermarket.', why: "{Hier} plus a quick, one-time encounter: a finished event, so {passé composé}." } } },
      { id: 2, before: "Quand j'étais petit, ", after: ' dans la rue tous les jours.', verb: 'jouer', a: "j'ai joué", b: 'je jouais', ans: 'b', clue: 'tous les jours',
        text: {
          'pt-BR': { tr: 'Quando eu era pequeno, eu brincava na rua todos os dias.', why: "{Tous les jours} é hábito: o que se repetia no passado, sem começo nem fim marcados, vai no {imparfait}." },
          en: { tr: 'When I was little, I used to play in the street every day.', why: "{Tous les jours} signals a habit. Where English often says \"used to\", French uses the {imparfait}." } } },
      { id: 3, before: '', after: ' la télé quand le téléphone a sonné.', verb: 'regarder', a: "J'ai regardé", b: 'Je regardais', ans: 'b', clue: 'quand le téléphone a sonné',
        text: {
          'pt-BR': { tr: 'Eu estava vendo TV quando o telefone tocou.', why: "A TV é o fundo em andamento: {imparfait}. O que interrompe, {quand le téléphone a sonné}, é {passé composé}." },
          en: { tr: 'I was watching TV when the phone rang.', why: "The background (\"was watching\") is {imparfait}; the interruption, {quand le téléphone a sonné}, is {passé composé}." } } },
      { id: 4, before: 'Hier soir, ', after: ' un film, puis je suis allé me coucher.', verb: 'regarder', a: "j'ai regardé", b: 'je regardais', ans: 'a', clue: 'puis je suis allé me coucher',
        text: {
          'pt-BR': { tr: 'Ontem à noite, eu vi um filme e depois fui dormir.', why: "Uma ação termina e vem a outra: {puis je suis allé me coucher}. Fatos em sequência pedem {passé composé}." },
          en: { tr: 'Last night, I watched a movie, then I went to bed.', why: "One action ends and the next begins: {puis je suis allé me coucher}. A chain of events takes {passé composé}." } } },
      { id: 5, before: "L'année dernière, nous ", after: ' en Italie.', verb: 'aller', a: 'sommes allés', b: 'allions', ans: 'a', clue: "L'année dernière",
        text: {
          'pt-BR': { tr: 'Ano passado, nós fomos para a Itália.', why: "{L'année dernière} é um período fechado, e a viagem aconteceu e terminou: {passé composé}." },
          en: { tr: 'Last year, we went to Italy.', why: "{L'année dernière} is a closed period, and the trip happened and ended: {passé composé}." } } },
      { id: 6, before: 'À cette époque, nous ', after: ' en Bretagne chaque été.', verb: 'aller', a: 'sommes allés', b: 'allions', ans: 'b', clue: 'chaque été',
        text: {
          'pt-BR': { tr: 'Naquela época, nós íamos para a Bretanha todo verão.', why: "{À cette époque} e {chaque été}: algo que se repetia num período. Hábito no passado é {imparfait}." },
          en: { tr: 'Back then, we used to go to Brittany every summer.', why: "{À cette époque} and {chaque été}: something that kept happening, like \"used to go\". That's the {imparfait}." } } },
      { id: 7, before: 'Quand je suis rentré, mon frère ', after: '.', verb: 'dormir', a: 'a dormi', b: 'dormait', ans: 'b', clue: 'Quand je suis rentré',
        text: {
          'pt-BR': { tr: 'Quando eu cheguei em casa, meu irmão estava dormindo.', why: "{Quand je suis rentré} marca o momento, e o irmão já estava dormindo: ação em andamento, {imparfait}." },
          en: { tr: 'When I got home, my brother was sleeping.', why: "{Quand je suis rentré} sets the moment, and he was already asleep: an action in progress, so {imparfait}." } } },
      { id: 8, before: 'Cette nuit, mon frère ', after: ' pendant huit heures.', verb: 'dormir', a: 'a dormi', b: 'dormait', ans: 'a', clue: 'pendant huit heures',
        text: {
          'pt-BR': { tr: 'Esta noite, meu irmão dormiu oito horas.', why: "{Pendant huit heures} conta a duração, e o sono terminou: um bloco fechado, {passé composé}." },
          en: { tr: 'Last night, my brother slept for eight hours.', why: "{Pendant huit heures} counts the length, and the sleep ended: a closed block, so {passé composé}." } } },
      { id: 9, before: 'Pendant les vacances, il ', after: ' trois jours de suite.', verb: 'pleuvoir', a: 'a plu', b: 'pleuvait', ans: 'a', clue: 'trois jours de suite',
        text: {
          'pt-BR': { tr: 'Nas férias, choveu três dias seguidos.', why: "Com {trois jours de suite}, a chuva é contada e acabou: um bloco fechado, {passé composé}." },
          en: { tr: 'During the vacation, it rained three days in a row.', why: "With {trois jours de suite}, the rain is counted and over: a closed block, so {passé composé}." } } },
      { id: 10, before: 'Quand on habitait à Brest, il ', after: ' presque tous les jours.', verb: 'pleuvoir', a: 'a plu', b: 'pleuvait', ans: 'b', clue: 'presque tous les jours',
        text: {
          'pt-BR': { tr: 'Quando a gente morava em Brest, chovia quase todo dia.', why: "{Presque tous les jours} descreve como era o clima numa fase da vida: repetição e descrição, {imparfait}." },
          en: { tr: 'When we lived in Brest, it rained almost every day.', why: "{Presque tous les jours} describes what the weather was like back then: repetition and description, {imparfait}." } } },
      { id: 11, before: 'Pierre ', after: ' très fatigué quand il est arrivé au travail.', verb: 'être', a: 'a été', b: 'était', ans: 'b', clue: 'quand il est arrivé au travail',
        text: {
          'pt-BR': { tr: 'O Pierre estava muito cansado quando chegou no trabalho.', why: "O cansaço já existia {quand il est arrivé au travail}. Estado físico ou emocional de fundo fica no {imparfait}." },
          en: { tr: 'Pierre was very tired when he got to work.', why: "He was already tired {quand il est arrivé au travail}. A background state, physical or emotional: {imparfait}." } } },
      { id: 12, before: 'Pierre ', after: ' malade après le voyage.', verb: 'tomber', a: 'est tombé', b: 'tombait', ans: 'a', clue: 'après le voyage',
        text: {
          'pt-BR': { tr: 'O Pierre ficou doente depois da viagem.', why: "{Tomber malade} é uma mudança: ele não estava doente e ficou. Mudança num ponto: {passé composé}." },
          en: { tr: 'Pierre got sick after the trip.', why: "{Tomber malade} is a change: he wasn't sick, then he was, {après le voyage}. One moment: {passé composé}." } } },
      { id: 13, before: '', after: " Marie en 2018, à l'anniversaire d'un ami.", verb: 'connaître', a: "J'ai connu", b: 'Je connaissais', ans: 'a', clue: "à l'anniversaire d'un ami",
        text: {
          'pt-BR': { tr: 'Eu conheci a Marie em 2018, no aniversário de um amigo.', why: "Aqui {connaître} é o primeiro encontro, numa cena precisa ({à l'anniversaire d'un ami}): {passé composé}." },
          en: { tr: 'I met Marie in 2018, at a friend\'s birthday party.', why: "Here {connaître} means meeting for the first time, in one scene ({à l'anniversaire d'un ami}): {passé composé}." } } },
      { id: 14, before: '', after: " Marie quand j'ai commencé à travailler dans cette entreprise.", verb: 'connaître', a: "J'ai déjà connu", b: 'Je connaissais déjà', ans: 'b', clue: 'déjà',
        text: {
          'pt-BR': { tr: 'Eu já conhecia a Marie quando comecei a trabalhar nessa empresa.', why: "Aqui {connaître} é um estado que já existia ({déjà}) e continuava. Estado de fundo: {imparfait}." },
          en: { tr: 'I already knew Marie when I started working at that company.', why: "Here {connaître} is a state that already existed ({déjà}) and kept going. A background state: {imparfait}." } } },
      { id: 15, before: 'Quand elle travaillait au centre-ville, elle ', after: ' un café après le déjeuner.', verb: 'prendre', a: 'a toujours pris', b: 'prenait toujours', ans: 'b', clue: 'toujours',
        text: {
          'pt-BR': { tr: 'Quando ela trabalhava no centro, ela sempre tomava um café depois do almoço.', why: "{Quand elle travaillait} abre uma fase, e {toujours} mostra o hábito dessa fase: {imparfait}." },
          en: { tr: 'When she worked downtown, she always had a coffee after lunch.', why: "{Quand elle travaillait} sets a period, and {toujours} shows a habit in it, like \"would always\": {imparfait}." } } },
      { id: 16, before: 'Hier, elle ', after: ' un café après le déjeuner.', verb: 'prendre', a: 'a pris', b: 'prenait', ans: 'a', clue: 'Hier',
        text: {
          'pt-BR': { tr: 'Ontem, ela tomou um café depois do almoço.', why: "{Hier}: um café, uma vez só. Fato único e concluído pede {passé composé}." },
          en: { tr: 'Yesterday, she had a coffee after lunch.', why: "{Hier}: one coffee, once. A single, finished event takes the {passé composé}." } } },
      { id: 17, before: '', after: " un livre quand mon amie m'a appelé.", verb: 'lire', a: "J'ai lu", b: 'Je lisais', ans: 'b', clue: "quand mon amie m'a appelé",
        text: {
          'pt-BR': { tr: 'Eu estava lendo um livro quando minha amiga me ligou.', why: "A leitura estava em andamento: {imparfait}. O que interrompe, {quand mon amie m'a appelé}, é {passé composé}." },
          en: { tr: 'I was reading a book when my friend called me.', why: "The background (\"was reading\") is {imparfait}; the interruption, {quand mon amie m'a appelé}, is {passé composé}." } } },
      { id: 18, before: 'Pendant les vacances, ', after: ' tout le livre.', verb: 'lire', a: "j'ai lu", b: 'je lisais', ans: 'a', clue: 'tout le livre',
        text: {
          'pt-BR': { tr: 'Nas férias, eu li o livro inteiro.', why: "{Tout le livre}: leitura completa, do começo ao fim. Ação concluída pede {passé composé}." },
          en: { tr: 'During the vacation, I read the whole book.', why: "{Tout le livre}: the whole book, start to finish. A finished action takes the {passé composé}." } } },
      { id: 19, before: 'Il ', after: ' minuit et tout le monde dormait.', verb: 'être', a: 'a été', b: 'était', ans: 'b', clue: 'et tout le monde dormait',
        text: {
          'pt-BR': { tr: 'Era meia-noite e todo mundo estava dormindo.', why: "Dizer a hora e descrever a cena ({tout le monde dormait}) monta o cenário da história: {imparfait}." },
          en: { tr: 'It was midnight and everyone was asleep.', why: "Telling the time and describing the scene ({tout le monde dormait}) sets the stage: {imparfait}." } } },
      { id: 20, before: 'Soudain, quelqu\'un ', after: ' à la porte.', verb: 'frapper', a: 'a frappé', b: 'frappait', ans: 'a', clue: 'Soudain',
        text: {
          'pt-BR': { tr: 'De repente, alguém bateu na porta.', why: "{Soudain} marca um acontecimento que corta o cenário. Fato pontual: {passé composé}." },
          en: { tr: 'Suddenly, someone knocked on the door.', why: "{Soudain} marks an event that breaks into the scene. A one-off event: {passé composé}." } } },
      { id: 21, before: '', after: ' à Lyon pendant deux ans, puis je suis parti à Paris.', verb: 'habiter', a: "J'ai habité", b: "J'habitais", ans: 'a', clue: 'pendant deux ans, puis',
        text: {
          'pt-BR': { tr: 'Eu morei em Lyon por dois anos e depois fui morar em Paris.', why: "Com {pendant deux ans}, o tempo em Lyon tem começo e fim. Período fechado: {passé composé}." },
          en: { tr: 'I lived in Lyon for two years, then I moved to Paris.', why: "With {pendant deux ans}, the time in Lyon has a start and an end. A closed period: {passé composé}." } } },
      { id: 22, before: 'Quand ', after: ' à Lyon, je prenais le métro tous les jours.', verb: 'habiter', a: "j'ai habité", b: "j'habitais", ans: 'b', clue: 'je prenais le métro tous les jours',
        text: {
          'pt-BR': { tr: 'Quando eu morava em Lyon, eu pegava o metrô todo dia.', why: "Repare em {je prenais le métro tous les jours}: hábito de uma fase. A fase também vai no {imparfait}: {j'habitais}." },
          en: { tr: 'When I lived in Lyon, I took the metro every day.', why: "Look at {je prenais le métro tous les jours}: a habit in a period of life. So {imparfait} here too: {j'habitais}." } } }
    ]
  }
];

// Jogos "em breve" (aprovados pela autora em 2026-11-07, docs/jogos-reformulacao-plano.md): cartão sem abrir, no fim do
// grupo do nível. Ao publicar um deles, ele sai daqui e entra em CONJ_GAMES com as frases revisadas.
const CONJ_GAMES_SOON = [
  { id: 'present-futur-proche', level: 'A1', title: { 'pt-BR': 'Agora ou depois?', en: 'Now or later?' } },
  { id: 'futur-conditionnel', level: 'A2', title: { 'pt-BR': '{Futur} ou {conditionnel}?', en: '{Futur} or {conditionnel}?' } },
  { id: 'indicatif-subjonctif', level: 'B1', free: true, title: { 'pt-BR': '{Indicatif} ou {subjonctif}?', en: '{Indicatif} or {subjonctif}?' } }
];
