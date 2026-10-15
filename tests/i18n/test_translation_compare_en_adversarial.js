// Suíte ADVERSARIAL do comparador de "Ouça e traduza" com o INGLÊS como língua da tradução
// (a aluna fala inglês e traduz do fr/zh/pt-BR para o inglês). Veredito = o mesmo do app
// (fr/app.js): aceita só se !personMismatch && isAcceptable. Ver docs/i18n/comparador-en-adversarial.md.
// Cada caso: [id, categoria, resposta, referências, 'aceitar'|'rejeitar', justificativa linguística].
// O esperado é a verdade LINGUÍSTICA, não o que o código faz hoje. Casos em KNOWN_LIMITS são
// limites conhecidos de um comparador sem IA: ainda são medidos e impressos, mas não derrubam a suíte.
// Falha fora de KNOWN_LIMITS = regressão ou bug novo, derruba a suíte (exit 1).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const W = { window: {} }; W.window = W;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'shared', 'translation-compare.js'), 'utf8'), W);
const EN = W.TranslationCompare.forLang('en');
const verdict = (s, refs) => (!EN.personMismatch(s) && EN.isAcceptable(s, refs)) ? 'aceitar' : 'rejeitar';

const R = {
  hello: ['Hello, how are you?', 'Hi, how are you?'],
  name: ['My name is Marie.'],
  sister: ['My sister is older than me.', 'My sister is older than I am.'],
  brothers: ['I have two brothers and one sister.'],
  coffee: ['I want a coffee, please.', 'I would like a coffee, please.'],
  noMeat: ['I do not eat meat.', "I don't eat meat."],
  time: ['It is half past three.', "It's three thirty."],
  price: ['This shirt costs fifteen euros.', 'This shirt is fifteen euros.'],
  price50: ['The ticket costs fifty euros.'],
  plan: ['We are going to the market tomorrow.', 'Tomorrow we are going to the market.'],
  past: ['She was at home yesterday.'],
  future: ['He will be at home tomorrow.'],
  likes: ['They like cheese.'],
  home: ['He lives in Paris with his family.'],
  color: ['My favorite color is blue.', 'My favourite colour is blue.'],
  color2: ['My favorite color is blue.'],
  water: ['Could I have a glass of water, please?', 'Can I have a glass of water, please?'],
  late: ['I am late.'],
  nobody: ['Nobody is at home.'],
  never: ['He never eats breakfast.'],
  often: ['He often eats breakfast.'],
  morning: ['I get up at seven every morning.'],
  bread: ['We buy bread at the bakery.'],
  cheap: ['The restaurant is cheap and very good.'],
  big: ['I live in a big house.'],
  thanks: ['Thank you very much.', 'Thanks a lot.'],
  tired: ['I am very tired today.'],
  doYou: ['Do you speak French?'],
  where: ['Where is the train station?']
};

const C = [
  // ---- negação ----
  ['neg-01','negação',"I am not late",R.late,'rejeitar','"not" inverte o sentido'],
  ['neg-02','negação','I eat meat',R.noMeat,'rejeitar','omitiu "not": afirmativa x negativa'],
  ['neg-03','negação',"I don't eat meat",R.noMeat,'aceitar','contração = "do not"'],
  ['neg-04','negação','Somebody is at home',R.nobody,'rejeitar','nobody x somebody: sentido oposto'],
  ['neg-05','negação','He always eats breakfast',R.never,'rejeitar','never x always: sentido oposto'],
  ['neg-06','negação','He never eats breakfast',R.often,'rejeitar','never x often: sentido oposto'],
  ['neg-07','negação','I do not eat meat',R.noMeat,'aceitar','igual à referência'],
  ['neg-08','negação','I eat no meat',R.noMeat,'aceitar','"eat no meat" = "do not eat meat" (paráfrase legítima)'],
  ['neg-09','negação','I never eat meat',R.noMeat,'aceitar','never ~ do not: aceitável em aula'],
  ['neg-10','negação',"He isn't at home",['He is at home.'],'rejeitar','n\'t = not'],
  ['neg-11','negação','There is no water',['There is water.'],'rejeitar','"no" é a negação'],
  ['neg-12','negação','I want tea but not coffee',['I want tea and coffee.'],'rejeitar','"but not" x "and"'],
  ['neg-13','negação','Nobody is at home',R.nobody,'aceitar','igual'],
  // ---- números e quantidades ----
  ['num-01','número','I have three brothers and one sister',R.brothers,'rejeitar','two x three'],
  ['num-02','número','I have two brothers and two sisters',R.brothers,'rejeitar','one x two'],
  ['num-03','número','This shirt costs fifty euros',R.price,'rejeitar','fifteen x fifty'],
  ['num-04','número','This shirt costs 15 euros',R.price,'aceitar','dígitos = por extenso'],
  ['num-05','número','The ticket costs 15 euros',R.price50,'rejeitar','15 x fifty'],
  ['num-06','número','The ticket costs fifty euros',R.price50,'aceitar','igual'],
  ['num-07','número','The ticket costs fifteen euros',R.price50,'rejeitar','fifteen x fifty (quase iguais no som)'],
  ['num-08','número','It is half past four',R.time,'rejeitar','four x three'],
  ['num-09','número','It is three thirty',R.time,'aceitar','forma equivalente de hora (referência 2)'],
  ['num-10','número','I have 2 brothers and 1 sister',R.brothers,'aceitar','dígitos = por extenso'],
  ['num-11','número','I have two brothers and one sister',R.brothers,'aceitar','igual'],
  ['num-12','número','The ticket costs 50 euros',R.price50,'aceitar','dígitos = por extenso'],
  ['num-13','número','The ticket costs 15 euros',['The ticket costs 15 euros.'],'aceitar','igual, em dígitos'],
  ['num-14','número','The ticket costs 50 euros',['The ticket costs 15 euros.'],'rejeitar','15 x 50 em dígitos'],
  // ---- sujeito/verbo ----
  ['sub-01','sujeito/verbo','They are at home',['He is at home.'],'rejeitar','he is x they are: sujeito trocado'],
  ['sub-02','sujeito/verbo','He are at home',['He is at home.'],'rejeitar','concordância errada'],
  ['sub-03','sujeito/verbo','I is late',R.late,'rejeitar','concordância errada'],
  ['sub-04','sujeito/verbo','She likes cheese',R.likes,'rejeitar','sujeito trocado they x she'],
  ['sub-05','sujeito/verbo','We are going to the market tomorrow',R.plan,'aceitar','igual'],
  ['sub-06','sujeito/verbo','They are going to the market tomorrow',R.plan,'rejeitar','we x they: pessoa trocada'],
  ['sub-07','sujeito/verbo','She lives in Paris with her family',R.home,'rejeitar','she x he: gênero do sujeito trocado'],
  ['sub-08','sujeito/verbo','He live in Paris with his family',R.home,'rejeitar','falta o -s (concordância)'],
  ['sub-09','sujeito/verbo','You are late',R.late,'rejeitar','you x I: pessoa trocada'],
  ['sub-10','sujeito/verbo','My sister is older than I am',R.sister,'aceitar','referência 2'],
  ['sub-11','sujeito/verbo','My brother is older than me',R.sister,'rejeitar','brother x sister'],
  // ---- tempo verbal ----
  ['ten-01','tempo verbal','She will be at home yesterday',R.past,'rejeitar','tempo incoerente'],
  ['ten-02','tempo verbal','She will be at home',R.past,'rejeitar','was x will be: passado x futuro'],
  ['ten-03','tempo verbal','He was at home tomorrow',R.future,'rejeitar','was x will be'],
  ['ten-04','tempo verbal','He was at home',['He will be at home.'],'rejeitar','passado x futuro, sem advérbio'],
  ['ten-05','tempo verbal','I eat meat',['I ate meat.'],'rejeitar','presente x passado'],
  ['ten-06','tempo verbal','We went to the market yesterday',['We are going to the market tomorrow.'],'rejeitar','passado x futuro'],
  ['ten-07','tempo verbal','She is at home yesterday',R.past,'rejeitar','is x was (mesma estrutura, tempo diferente)'],
  ['ten-08','tempo verbal','I have been tired today',R.tired,'rejeitar','presente perfeito x presente'],
  ['ten-09','tempo verbal','She has been at home yesterday',R.past,'rejeitar','tempo diferente'],
  ['ten-10','tempo verbal','She was at home yesterday',R.past,'aceitar','igual'],
  // ---- omissão de palavra de conteúdo ----
  ['om-01','omissão','I want a coffee',R.coffee,'aceitar','"please" é cortesia: tolerável'],
  ['om-02','omissão','I get up at seven',R.morning,'rejeitar','omitiu "every morning": perde a rotina'],
  ['om-03','omissão','I live in a house',R.big,'rejeitar','omitiu "big"'],
  ['om-04','omissão','We buy bread',R.bread,'rejeitar','omitiu "at the bakery"'],
  ['om-05','omissão','My name is',R.name,'rejeitar','omitiu o nome próprio'],
  ['om-06','omissão','Marie',R.name,'rejeitar','só o nome: não traduziu a frase'],
  ['om-07','omissão','The restaurant is cheap',R.cheap,'rejeitar','omitiu "very good" (metade do sentido)'],
  ['om-08','omissão','Thank you',R.thanks,'aceitar','"very much" é intensificador'],
  // ---- palavra de conteúdo trocada ----
  ['sw-01','troca','I want a tea, please',R.coffee,'rejeitar','tea x coffee'],
  ['sw-02','troca','My favorite color is red',R.color2,'rejeitar','blue x red'],
  ['sw-03','troca','We buy meat at the bakery',R.bread,'rejeitar','bread x meat'],
  ['sw-04','troca','Where is the bus station?',R.where,'rejeitar','train x bus'],
  ['sw-05','troca','Hello, where are you?',R.hello,'rejeitar','how x where'],
  ['sw-06','troca','I get up at eight every morning',R.morning,'rejeitar','seven x eight'],
  ['sw-07','troca','I get up at seven every night',R.morning,'rejeitar','morning x night'],
  ['sw-08','troca','The restaurant is expensive and very good',R.cheap,'rejeitar','cheap x expensive (antônimo)'],
  ['sw-09','troca','The restaurant is cheap and very bad',R.cheap,'rejeitar','good x bad (antônimo)'],
  // ---- sinônimos legítimos ----
  ['syn-01','sinônimo','Hi, how are you?',R.hello,'aceitar','referência 2'],
  ['syn-02','sinônimo','Hi, how are you doing?',R.hello,'aceitar','"doing" é extra; frase equivalente'],
  ['syn-03','sinônimo','I would like a coffee, please',R.coffee,'aceitar','referência 2'],
  ['syn-04','sinônimo','I would like a coffee',R.coffee,'aceitar','referência 2 sem "please"'],
  ['syn-05','sinônimo','Can I have a glass of water, please?',R.water,'aceitar','referência 2'],
  ['syn-06','sinônimo','May I have a glass of water, please?',R.water,'aceitar','may/could/can: pedidos equivalentes'],
  ['syn-07','sinônimo','Thanks a lot',R.thanks,'aceitar','referência 2'],
  ['syn-08','sinônimo','Thanks very much',R.thanks,'aceitar','equivalente natural'],
  ['syn-09','sinônimo','This shirt is fifteen euros',R.price,'aceitar','referência 2'],
  ['syn-10','sinônimo','The shirt costs fifteen euros',R.price,'aceitar','the x this: artigo/demonstrativo, aceitável'],
  ['syn-11','sinônimo','The restaurant is inexpensive and very good',R.cheap,'aceitar','inexpensive = cheap'],
  ['syn-12','sinônimo','I live in a large house',R.big,'aceitar','large = big'],
  ['syn-13','sinônimo','I wake up at seven every morning',R.morning,'aceitar','wake up = get up'],
  ['syn-14','sinônimo','We purchase bread at the bakery',R.bread,'aceitar','purchase = buy'],
  ['syn-15','sinônimo','I am really tired today',R.tired,'aceitar','really = very'],
  // ---- contrações ----
  ['con-01','contração',"I'm late",R.late,'aceitar',"I'm = I am"],
  ['con-02','contração',"We're going to the market tomorrow",R.plan,'aceitar',"we're = we are"],
  ['con-03','contração',"It's half past three",R.time,'aceitar',"it's = it is"],
  ['con-04','contração',"It’s half past three",R.time,'aceitar','apóstrofo tipográfico'],
  ['con-05','contração',"I do not eat meat",["I don't eat meat."],'aceitar','forma longa x contraída'],
  ['con-06','contração',"She's at home tomorrow",['She will be at home tomorrow.'],'aceitar',"she's = she is: 'She is at home tomorrow' é presente com valor de futuro marcado; tolerável"],
  ['con-07','contração',"He's lived in Paris with his family",R.home,'rejeitar',"he's lived = he has lived: presente perfeito x presente simples"],
  ['con-08','contração',"I won't eat meat",R.noMeat,'rejeitar',"won't = will not: futuro x presente"],
  ['con-09','contração',"They’re late",['They are late.'],'aceitar',"they're = they are"],
  ['con-10','contração',"Isn't he at home?",['Is he at home?'],'rejeitar','pergunta negativa x afirmativa'],
  ['con-11','contração',"Don't you speak French?",R.doYou,'rejeitar','don\'t you x do you: negativa'],
  ['con-12','contração',"She's not at home",['She is not at home.'],'aceitar',"she's not = she is not"],
  ['con-13','contração',"She isn't at home",['She is not at home.'],'aceitar',"isn't = is not"],
  // ---- ordem das palavras ----
  ['ord-01','ordem','Tomorrow we are going to the market',R.plan,'aceitar','advérbio no início (referência 2)'],
  ['ord-02','ordem','We are going tomorrow to the market',R.plan,'aceitar','ordem aceitável'],
  ['ord-03','ordem','Going we are market the to tomorrow',R.plan,'rejeitar','sopa de palavras: mesmas palavras, sem frase'],
  ['ord-04','ordem','The dog bites the man',['The man bites the dog.'],'rejeitar','inversão agente/paciente muda o sentido'],
  ['ord-05','ordem','Marie is my name',R.name,'aceitar','ordem diferente, mesmo sentido'],
  ['ord-06','ordem','My sister is older than me',R.sister,'aceitar','referência 1'],
  ['ord-07','ordem','I am older than my sister',R.sister,'rejeitar','relação invertida'],
  // ---- maiúsculas e pontuação ----
  ['pun-01','pontuação','HELLO, HOW ARE YOU?',R.hello,'aceitar','caixa alta'],
  ['pun-02','pontuação','hello how are you',R.hello,'aceitar','sem pontuação nem maiúscula'],
  ['pun-03','pontuação','  Hello,   how   are  you?  ',R.hello,'aceitar','espaços extras'],
  ['pun-04','pontuação','Hello how are you!!!',R.hello,'aceitar','pontuação diferente'],
  ['pun-05','pontuação','my name is marie',R.name,'aceitar','nome em minúsculas'],
  ['pun-06','pontuação','',R.hello,'rejeitar','vazio'],
  ['pun-07','pontuação','...?!',R.hello,'rejeitar','só pontuação'],
  ['pun-08','pontuação','Hello. How are you?',R.hello,'aceitar','duas frases'],
  ['pun-09','pontuação','Hello — how are you?',R.hello,'aceitar','travessão tipográfico entre palavras'],
  ['pun-10','pontuação','Hello,how are you?',R.hello,'aceitar','vírgula sem espaço (digitação comum)'],
  ['pun-11','pontuação','Where is the train-station?',R.where,'aceitar','hífen no lugar de espaço'],
  ['pun-12','pontuação','Hello, how are you?!',R.hello,'aceitar','pontuação dupla'],
  // ---- americano x britânico ----
  ['am-01','americano/britânico','My favourite colour is blue',R.color2,'aceitar','colour = color, favourite = favorite'],
  ['am-02','americano/britânico','My favorite color is blue',['My favourite colour is blue.'],'aceitar','ao contrário'],
  ['am-03','americano/britânico','My favorite colour is blue',R.color,'aceitar','referência 2 cobre parte; mistura de grafias'],
  ['am-04','americano/britânico','We go to the theatre tonight',['We are going to the theater tonight.'],'aceitar','theatre = theater'],
  ['am-05','americano/britânico','I have a flat in Paris',['I have an apartment in Paris.'],'aceitar','flat = apartment (léxico UK)'],
  ['am-06','americano/britânico','I like football',['I like soccer.'],'aceitar','football (UK) = soccer (US)'],
  ['am-07','americano/britânico','I need to practise English',['I need to practice English.'],'aceitar','practise (verbo UK) = practice'],
  ['am-08','americano/britânico','I am grey',['I am gray.'],'aceitar','grey = gray'],
  // ---- perguntas ----
  ['q-01','pergunta','Do you speak French?',R.doYou,'aceitar','igual'],
  ['q-02','pergunta','You speak French',R.doYou,'aceitar','pergunta com entonação (sem inversão)'],
  ['q-03','pergunta','Do you speak German?',R.doYou,'rejeitar','French x German'],
  ['q-04','pergunta','Where is the train station?',R.where,'aceitar','igual'],
  ['q-05','pergunta','Where are you at the train station?',R.where,'rejeitar','sentido diferente com as mesmas palavras de conteúdo'],
  ['q-06','pergunta','How is you?',['How are you?'],'rejeitar','"you is": concordância errada (o detector ignora frases com ?)'],
  ['q-07','pergunta','How are you?',R.hello,'aceitar','referência sem "Hello"'],
  // ---- armadilhas de falso erro no detector de concordância ----
  ['fp-01','falso erro','I think they are at home',['I think they are at home.'],'aceitar','correto'],
  ['fp-02','falso erro','The people I met are nice',['The people I met are nice.'],'aceitar','"I met are": oração relativa reduzida'],
  ['fp-03','falso erro','Yes, I am',['Yes, I am.'],'aceitar','resposta curta'],
  ['fp-04','falso erro','Here it is',['Here it is.'],'aceitar','it is no fim'],
  ['fp-05','falso erro','I wish he were here',['I wish he were here.'],'aceitar','subjuntivo "he were"'],
  ['fp-06','falso erro','You and I are friends',['You and I are friends.'],'aceitar','sujeito composto: "I are"'],
  ['fp-07','falso erro','She and he are friends',['She and he are friends.'],'aceitar','sujeito composto'],
  ['fp-08','falso erro','He and I are late',['He and I are late.'],'aceitar','sujeito composto'],
  ['fp-09','falso erro','What do they do?',['What do they do?'],'aceitar','pergunta'],
  ['fp-10','falso erro','Who is he? He is my brother',['Who is he? He is my brother.'],'aceitar','tem "?"'],
  ['fp-12','falso erro','The books that you have are new',['The books that you have are new.'],'aceitar','"have are" não é pronome+verbo'],
  ['fp-13','falso erro','Where are you from',['Where are you from?'],'aceitar','pergunta sem "?": inversão "are you"'],
  ['fp-14','falso erro','How old are you',['How old are you?'],'aceitar','pergunta sem "?"'],
  ['fp-15','falso erro','Is he a teacher',['Is he a teacher?'],'aceitar','pergunta sem "?"'],
  ['fp-16','falso erro','Are they at home',['Are they at home?'],'aceitar','pergunta sem "?"'],
  ['fp-17','falso erro','Am I late',['Am I late?'],'aceitar','pergunta sem "?"'],
  ['fp-18','falso erro','What is it',['What is it?'],'aceitar','pergunta sem "?"'],
  ['fp-19','falso erro','Where is she now',['Where is she now?'],'aceitar','pergunta sem "?"'],
  ['fp-21','falso erro','Are you a student',['Are you a student?'],'aceitar','pergunta sem "?"'],
  ['fp-22','falso erro','Have you eaten',['Have you eaten?'],'aceitar','pergunta sem "?"'],
  ['fp-23','falso erro','Where do you live',['Where do you live?'],'aceitar','pergunta sem "?"'],
  ['fp-24','falso erro','Where does he live',['Where does he live?'],'aceitar','pergunta sem "?"'],
  ['fp-25','falso erro','Do you have a car',['Do you have a car?'],'aceitar','pergunta sem "?"'],
  ['fp-26','falso erro','Where have they gone',['Where have they gone?'],'aceitar','pergunta sem "?"'],
  ['fp-27','falso erro','Why are we late',['Why are we late?'],'aceitar','pergunta sem "?"'],
  ['fp-28','falso erro','Is it you',['Is it you?'],'aceitar','pergunta sem "?"'],
  ['fp-29','falso erro','Where is he? Is she at home',['Where is he? Is she at home?'],'aceitar','duas perguntas'],
  ['fp-32','falso erro','If I were rich I would travel',['If I were rich, I would travel.'],'aceitar','subjuntivo "I were"'],
  ['fp-33','falso erro','He said they are tired',['He said they are tired.'],'aceitar','correto'],
  ['fp-34','falso erro','It is not true that I am tired',['It is not true that I am tired.'],'aceitar','correto'],
  ['fp-35','falso erro','I know she is right',['I know she is right.'],'aceitar','correto'],
  ['fp-37','falso erro','You were late',['You were late.'],'aceitar','you were'],
  ['fp-38','falso erro','I was late',['I was late.'],'aceitar','I was'],
  ['fp-39','falso erro','They were late',['They were late.'],'aceitar','they were'],
  ['fp-40','falso erro','She does her homework',['She does her homework.'],'aceitar','she does'],
  ['fp-41','falso erro','He has two brothers',['He has two brothers.'],'aceitar','he has'],
  ['fp-42','falso erro','They do the dishes',['They do the dishes.'],'aceitar','they do'],
  ['fp-43','falso erro','We have a car',['We have a car.'],'aceitar','we have'],
  ['fp-44','falso erro','You have a car',['You have a car.'],'aceitar','you have'],
  ['fp-45','falso erro','It does not matter',['It does not matter.'],'aceitar','it does not'],
  ['fp-46','falso erro','I do not know',['I do not know.'],'aceitar','I do not'],
  ['fp-47','falso erro','Let us go, they are waiting',['Let us go, they are waiting.'],'aceitar','"us go" não é pronome-sujeito'],
  ['fp-48','falso erro',"I'm happy, he's tired, they're hungry",["I am happy, he is tired, they are hungry."],'aceitar','contrações encadeadas'],
  // ---- concordância errada que o detector deve pegar ----
  ['agr-01','concordância','You is late',R.late,'rejeitar','you is'],
  ['agr-02','concordância','We is at the market',['We are at the market.'],'rejeitar','we is'],
  ['agr-03','concordância','She do her homework',['She does her homework.'],'rejeitar','she do'],
  ['agr-04','concordância','He have two brothers',['He has two brothers.'],'rejeitar','he have'],
  ['agr-05','concordância','It are cheap',['It is cheap.'],'rejeitar','it are'],
  ['agr-06','concordância','I are tired',R.tired,'rejeitar','I are'],
  ['agr-07','concordância','I has two brothers',R.brothers,'rejeitar','I has'],
  ['agr-08','concordância','I am tired and he are happy',['I am tired and he is happy.'],'rejeitar','erro na segunda oração'],
  ['agr-09','concordância','He never have breakfast',R.never,'rejeitar','advérbio entre sujeito e verbo ("never have")'],
  ['agr-10','concordância','She always are late',['She is always late.'],'rejeitar','advérbio entre sujeito e verbo'],
  ['agr-11','concordância','They is not at home',['They are not at home.'],'rejeitar','they is not'],
  ['agr-12','concordância',"He don't like cheese",["He doesn't like cheese."],'rejeitar','"he don\'t" (coloquial, mas erro em aula)'],
  ['agr-13','concordância',"She doesn't likes cheese",["She doesn't like cheese."],'rejeitar','doesn\'t + verbo flexionado'],
  ['agr-14','concordância','I am agree',['I agree.'],'rejeitar','"am agree": decalque do fr/pt (je suis d\'accord)'],
  ['agr-15','concordância','I have 20 years',['I am twenty years old.'],'rejeitar','decalque de "j\'ai 20 ans"'],
  ['agr-16','concordância','She have 20 years',['She is twenty years old.'],'rejeitar','decalque + concordância'],
  // ---- palavras funcionais (stopwords) que mudam o sentido ----
  ['fn-01','função','She is in Paris',['She is at Paris.'],'aceitar','preposição trocada: erro leve, tolerado'],
  ['fn-02','função','I can swim',['I will swim.'],'rejeitar','can x will: modal trocado'],
  ['fn-03','função','You must go now',['You may go now.'],'rejeitar','must x may'],
  ['fn-04','função','I do not want a coffee',['I would like a coffee.'],'rejeitar','negação'],
  ['fn-05','função','He is my brother',['She is my sister.'],'rejeitar','he/brother x she/sister'],
  ['fn-06','função','Her book is blue',['His book is blue.'],'rejeitar','her x his: possessivo trocado'],
  ['fn-07','função','Their house is big',['Our house is big.'],'rejeitar','their x our'],
  ['fn-08','função','I give it to him',['I give it to her.'],'rejeitar','him x her'],
  ['fn-09','função','I have a car',['I had a car.'],'rejeitar','have x had: presente x passado'],
  ['fn-10','função','I am going to eat',['I was going to eat.'],'rejeitar','am x was'],
  ['fn-11','função','She will come',['She would come.'],'rejeitar','will x would'],
  ['fn-12','função','I like this house',['I like that house.'],'aceitar','this x that: sutileza de proximidade, tolerada'],
  ['fn-13','função','I and you are friends',['You and I are friends.'],'aceitar','ordem dos pronomes: erro de estilo apenas'],
  ['fn-14','função','I eat and he drinks',['I eat or he drinks.'],'rejeitar','and x or']
];

// 41 limites conhecidos (explicados em docs/i18n/comparador-en-adversarial.md): tempo verbal/modal em
// palavras funcionais, omissão e troca de UMA palavra de conteúdo (sem dicionário de sinônimos/antônimos),
// ordem das palavras, vocabulário UK x US, decalques e concordâncias fora do padrão "pronome + verbo".
// Se um deles passar a passar, a suíte avisa: remova da lista.
const KNOWN_LIMITS = new Set((
  'sub-08 sub-11 ten-01 ten-03 ten-04 ten-07 ten-08 ten-09 om-02 om-03 om-04 om-08 sw-01 sw-02 sw-03 sw-04 sw-07 sw-08 sw-09 ' +
  'con-07 con-08 ord-03 ord-04 ord-07 am-05 am-06 q-05 q-06 q-07 agr-08 agr-13 agr-14 agr-15 fn-03 fn-06 fn-07 fn-08 fn-09 fn-10 ' +
  'fn-11 fn-14').split(' '));

let pass = 0; const realFail = [], limit = [], limitOk = [];
for (const [id, cat, s, refs, exp, why] of C){
  const got = verdict(s, refs);
  const known = KNOWN_LIMITS.has(id);
  if (got === exp){ pass++; if (known) limitOk.push(id); }
  else if (known) limit.push([id, cat, exp, got, s]);
  else realFail.push([id, cat, exp, got, s, why]);
}
console.log(`Casos: ${C.length} | passam: ${pass} | limite conhecido (falha tolerada): ${limit.length} | FALHAS: ${realFail.length}`);
limit.forEach(([id, cat, exp, got, s]) => console.log(`  LIMITE ${id} [${cat}]: esperado ${exp}, obteve ${got}  <${s}>`));
realFail.forEach(([id, cat, exp, got, s, why]) => console.log(`  FALHOU ${id} [${cat}]: esperado ${exp}, obteve ${got}  <${s}>  (${why})`));
if (limitOk.length) console.log(`  (limites que agora passam, remova de KNOWN_LIMITS: ${limitOk.join(', ')})`);
if (require.main === module) process.exit(realFail.length ? 1 : 0);
module.exports = { C, verdict };
