// Família latina configurada para o FRANCÊS como a página usa (fr/lang-hooks.js, LANG_HOOKS.familiaLatina):
// exemplos reais do curso, escritos à mão (a paridade com o fr/app.js antigo, entrada por entrada, está em
// test_paridade_fr.js). Fase 2: inclui as decisões da dona de 2026-10-15 (marcadas "(a)".."(e)").
// Rodar: node tests/familia-latina/test_frances.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FL = require(path.join(ROOT, 'shared/core/familias/latina.js'));
const { configFr } = require('./extrair-fr.js');
const CFG = configFr();
const FR = FL.criar(CFG);                 // textos com o t() em pt-BR
const FR_EN = FL.criar(configFr('en'));   // textos com o t() do site em inglês
let ok = 0, ruim = 0;
function check(desc, obtido, esperado) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) ok++; else { ruim++; console.log(`✗ ${desc}\n    esperado: ${b}\n    obtido:   ${a}`); }
}
const resumo = (r) => r.merged.map(x => x.type === 'match' ? (x.light ? `~${x.word}:${x.reason}` : x.word) : `${x.type}:${x.word || x.correct}`).join(' ');

// exercícios de digitar: acento tolerado (decisão da dona, auditoria de 2026-09-16)
check('vocab: "etudiant" por "étudiant" = certo', FL.respostaDigitadaCerta('etudiant', 'étudiant'), true);
check('vocab: "ou" por "où" = certo', FL.respostaDigitadaCerta('ou', 'où'), true);
check('vocab: "un / une" aceita "une"', FL.respostaDigitadaCerta('une', 'un / une'), true);
check('vocab: "prennons" por "prenons" = errado', FL.respostaDigitadaCerta('prennons', 'prenons'), false);
check('genérica respostaDigitadaCerta: "la soeur" por "la sœur" = errado (œ não é acento para o NFD)', FL.respostaDigitadaCerta('la soeur', 'la sœur'), false);
check('vocab: apóstrofo curvo do celular ignorado no vocabulário ("l’école")', FL.respostaDigitadaCerta('l’école', "l'école"), true);
check('genérica com a lista antiga da lacuna: o apóstrofo curvo não é ignorado', FL.respostaDigitadaCerta('l’école', "l'école", FL.PONTUACAO_LACUNA_RE), false);
check('fr (a): "la soeur" por "la sœur" = quase no vocabulário e na lacuna digitados', FR.avaliarRespostaDigitada('la soeur', 'la sœur'), 'quase');
check('fr (a): "Coeur" por "cœur" = quase', FR.avaliarRespostaDigitada('Coeur', 'cœur'), 'quase');
check('fr: "etudiant" por "étudiant" continua ok (acento não conta)', FR.avaliarRespostaDigitada('etudiant', 'étudiant'), 'ok');
check('fr: "prennons" por "prenons" continua errado', FR.avaliarRespostaDigitada('prennons', 'prenons'), 'errou');
check('fr (c): "l’école" na lacuna digitada = ok (mesma lista do vocabulário)', FR.avaliarRespostaDigitada('l’école', "l'école"), 'ok');
check('gramática: "soixante dix" = "soixante-dix"', FR.avaliarComSeparadores('soixante dix', ['soixante-dix']), 'ok');
check('gramática: "quatre vingts" sem acento nenhum = ok', FR.avaliarComSeparadores('quatre vingts', ['quatre-vingts']), 'ok');
check('gramática: "zero" por "zéro" = quase', FR.avaliarComSeparadores('zero', ['zéro']), 'almost');

// Acentuação
check('Acentuação: "très" certo', FR.resultadoAcentuacao('très', 'très'), 'ok');
check('Acentuação: "tres" = quase', FR.resultadoAcentuacao('tres', 'très'), 'partial');
check('Acentuação: "garcon" por "garçon" = quase', FR.resultadoAcentuacao('garcon', 'garçon'), 'partial');
check('Acentuação: "Noel" por "Noël" = quase', FR.resultadoAcentuacao('Noel', 'Noël'), 'partial');
check('fr (a): Acentuação: "soeur" por "sœur" = quase (antes: errado)', FR.resultadoAcentuacao('soeur', 'sœur'), 'partial');
check('genérica sem ligaduras: "soeur" por "sœur" = errado', FL.resultadoAcentuacao('soeur', 'sœur'), 'fail');
check('genérica com ligaduras: "soeur" = quase', FL.resultadoAcentuacao('soeur', 'sœur', CFG.ligaduras), 'partial');
check('tipos: "élève" x "elève" = faltou agudo', FL.tiposDeErroDeAcento('élève', 'elève').map(x => x.tipo + ':' + x.marca), ['faltou:agudo']);
check('tipos: "òu" por "où" = acento na letra errada (sobrou no o, faltou no u)', FL.tiposDeErroDeAcento('où', 'òu').map(x => x.tipo + ':' + (x.marca || x.marcaDigitada) + '@' + x.posicao), ['sobrou:grave@0', 'faltou:grave@1']);

// ditado
let r = FR.avaliarDitado("J'ai vingt-cinq ans et je suis française.", "j' ai 25 ans et je suis francaise.");
check('ditado: "j\' ai" junta (elisão), 25 vira vingt-cinq, française sem cedilha = leve', resumo(r), "J'ai vingt-cinq ans et je suis ~française.:accent");
check('ditado: nota de "j\' ai ... 25 ... francaise" (6,5 de 7)', r.score, 93);
r = FR.avaliarDitado('Elle est ma sœur.', 'elle est ma soeur.');
check('ditado: "soeur" = erro leve (meio ponto) de ligadura, como antes', resumo(r), 'Elle est ma ~sœur.:ligature');
check('ditado: explicação da ligadura (pt-BR, igual a antes)', FR.textoErroLeve(r.merged[3]), '«sœur» usa a letra «œ», que é uma só (você escreveu «soeur»).');
check('ditado (b): explicação da ligadura no site em inglês', FR_EN.textoErroLeve(r.merged[3]), '“sœur” uses the letter “œ”, which is a single letter (you wrote “soeur”).');
r = FR.avaliarDitado('Il va à Paris.', 'il va a Paris.');
check('ditado: "a" por "à" = leve de acento com a nota do homófono', FR.textoErroLeve(r.merged[2]), '«à»: confira os acentos (você escreveu «a»). «a» é o verbo avoir (il a); «à» é preposição (à Paris).');
check('ditado (b): a mesma explicação no site em inglês, sem português', FR_EN.textoErroLeve(r.merged[2]), '“à”: check the accents (you wrote “a”). “a” is the verb avoir (il a); “à” is a preposition (à Paris).');
check('ditado: "est" por "et" = homófono', FR.classificarErroDitado('et', 'est').kind, 'homophone');
check('ditado (b): homófono no site em inglês', FR_EN.classificarErroDitado('et', 'est').noteText, '“et” (you wrote “est”): words that sound alike. “et” means “and”; “est” is the verb être (il est).');
check('ditado: "petite" por "petit" = concordância (-e)', FR.classificarErroDitado('petite', 'petit').noteText.includes('(-e)'), true);
check('ditado (b): "chat" por "chien" no site em inglês', FR_EN.classificarErroDitado('chat', 'chien').noteText, '“chat”: not the expected word (you wrote “chien”).');
check('ditado: "aujourdhui" = leve de apóstrofo', resumo(FR.avaliarDitado("Aujourd'hui.", 'aujourdhui.')), "~Aujourd'hui.:apostrophe");
r = FR.avaliarDitado('Peut-être.', 'peut etre.');
check('ditado (e): "peut etre" = sem hífen E sem acento: os dois motivos (antes: "spelling")', [resumo(r), r.merged[0].reasons], ['~Peut-être.:multiple', ['hyphen', 'accent']]);
check('ditado (e): a explicação cita os dois (pt-BR)', FR.textoErroLeve(r.merged[0]), '«Peut-être»: confira o hífen e os acentos (você escreveu «peutetre»).');
check('ditado (e): a explicação cita os dois (inglês)', FR_EN.textoErroLeve(r.merged[0]), '“Peut-être”: check the hyphen and the accents (you wrote “peutetre”).');
check('ditado (e): continua valendo meio ponto', r.score, 50);
r = FR.avaliarDitado("Ma sœur est arrivée aujourd'hui.", "ma soeur est arrivee aujourdhui.");
check('ditado: três palavras com um erro leve cada continuam com um motivo só', resumo(r), "Ma ~sœur:ligature est ~arrivée:accent ~aujourd'hui.:apostrophe");
check('ditado: "peut être" (só sem hífen) = leve de hífen', resumo(FR.avaliarDitado('Peut-être.', 'peut être.')), '~Peut-être.:hyphen');
check('ditado: "virgule" por extenso tira meio ponto', FR.avaliarDitado('Bonjour, Sophie.', 'bonjour virgule Sophie.').spokenPunct.length, 1);
r = FR.avaliarDitado('Il fait 30 degrés.', 'il fait 30 degrés.');
check('ditado (d): texto com "30" e aluna digita "30" = 100, sem nota de "por extenso" (antes: perdia ponto)', [r.score, r.digitNotes.length], [100, 0]);
check('ditado (d): texto com "trente" e aluna digita "30" continua 100 com a nota', ((x) => [x.score, x.digitNotes.length])(FR.avaliarDitado('Il fait trente degrés.', 'il fait 30 degrés.')), [100, 1]);
check('ditado (d): texto com "30" e aluna digita "trente" continua troca (sem inventar)', FR.avaliarDitado('Il fait 30 degrés.', 'il fait trente degrés.').score < 100, true);
// (f) 2026-10-16: alvo com duas formas ("allemand / allemande"): o texto inteiro digitado também vale
check('fr (f): "allemand / allemande" por "allemand / allemande" = ok (antes: errou)', FR.avaliarRespostaDigitada('allemand / allemande', 'allemand / allemande'), 'ok');
check('fr (f): sem espaços em volta da barra e sem acento = ok', FR.avaliarRespostaDigitada('Francais/francaise', 'français / française'), 'ok');
check('fr (f): só uma das formas continua ok', FR.avaliarRespostaDigitada('allemande', 'allemand / allemande'), 'ok');
check('fr (f): vírgula no lugar da barra = ok', FR.avaliarRespostaDigitada('allemand, allemande', 'allemand / allemande'), 'ok');
check('fr (f): ordem trocada = errou', FR.avaliarRespostaDigitada('allemande / allemand', 'allemand / allemande'), 'errou');
check('fr (f): vírgula de uma forma só continua pontuação ("Bonjour, Sophie" por "bonjour sophie")', FR.avaliarRespostaDigitada('Bonjour, Sophie', 'bonjour sophie'), 'ok');
check('fr (f): as duas formas com uma errada = errou', FR.avaliarRespostaDigitada('allemand / allemand', 'allemand / allemande'), 'errou');
check('fr (f): respostaDigitadaCerta aceita o texto inteiro', FL.respostaDigitadaCerta('un / une', 'un / une'), true);
check('teclado fr: 14 teclas, com œ', CFG.gruposDeAcentos.flat().length === 14 && CFG.gruposDeAcentos.flat().includes('œ'), true);
console.log(`família latina, francês: ${ok}/${ok + ruim} passaram`);
process.exit(ruim ? 1 : 0);
