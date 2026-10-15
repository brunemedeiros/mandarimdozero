// Família latina configurada para o FRANCÊS: exemplos reais do curso, escritos à mão (a paridade com o
// fr/app.js, entrada por entrada, está em test_paridade_fr.js). Inclui os achados de hoje, documentados
// como comportamento ATUAL (nada foi mudado no fr).
// Rodar: node tests/familia-latina/test_frances.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FL = require(path.join(ROOT, 'shared/core/familias/latina.js'));
const IDIOMAS = require(path.join(ROOT, 'shared/core/familias/latina-idiomas.js'));
const FR = FL.criar(IDIOMAS.fr);
// Configuração que a página usa de verdade (fr/lang-hooks.js), por cima do rascunho de latina-idiomas.js.
const FRC = FL.criar(Object.assign({}, IDIOMAS.fr, require('./extrair-fr.js').configFr()));
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
// Fase 2, configuração REAL do fr (fr/lang-hooks.js): decisões da dona de 2026-10-15.
check('fr (a): "la soeur" por "la sœur" = quase no vocabulário e na lacuna digitados', FRC.avaliarRespostaDigitada('la soeur', 'la sœur'), 'quase');
check('fr (a): "Coeur" por "cœur" = quase', FRC.avaliarRespostaDigitada('Coeur', 'cœur'), 'quase');
check('fr: "etudiant" por "étudiant" continua ok (acento não conta)', FRC.avaliarRespostaDigitada('etudiant', 'étudiant'), 'ok');
check('fr: "prennons" por "prenons" continua errado', FRC.avaliarRespostaDigitada('prennons', 'prenons'), 'errou');
check('fr (c): "l’école" na lacuna digitada = ok (mesma lista do vocabulário)', FRC.avaliarRespostaDigitada('l’école', "l'école"), 'ok');
check('gramática: "soixante dix" = "soixante-dix"', FR.avaliarComSeparadores('soixante dix', ['soixante-dix']), 'ok');
check('gramática: "quatre vingts" sem acento nenhum = ok', FR.avaliarComSeparadores('quatre vingts', ['quatre-vingts']), 'ok');
check('gramática: "zero" por "zéro" = quase', FR.avaliarComSeparadores('zero', ['zéro']), 'almost');

// Acentuação
check('Acentuação: "très" certo', FR.resultadoAcentuacao('très', 'très'), 'ok');
check('Acentuação: "tres" = quase', FR.resultadoAcentuacao('tres', 'très'), 'partial');
check('Acentuação: "garcon" por "garçon" = quase', FR.resultadoAcentuacao('garcon', 'garçon'), 'partial');
check('Acentuação: "Noel" por "Noël" = quase', FR.resultadoAcentuacao('Noel', 'Noël'), 'partial');
check('fr (a): Acentuação com a configuração real: "soeur" por "sœur" = quase (antes: errado)', FRC.resultadoAcentuacao('soeur', 'sœur'), 'partial');
check('genérica sem ligaduras: "soeur" por "sœur" = errado', FL.resultadoAcentuacao('soeur', 'sœur'), 'fail');
check('genérica com ligaduras: "soeur" = quase', FL.resultadoAcentuacao('soeur', 'sœur', IDIOMAS.fr.ligaduras), 'partial');
check('tipos: "élève" x "elève" = faltou agudo', FL.tiposDeErroDeAcento('élève', 'elève').map(x => x.tipo + ':' + x.marca), ['faltou:agudo']);
check('tipos: "òu" por "où" = acento na letra errada (sobrou no o, faltou no u)', FL.tiposDeErroDeAcento('où', 'òu').map(x => x.tipo + ':' + (x.marca || x.marcaDigitada) + '@' + x.posicao), ['sobrou:grave@0', 'faltou:grave@1']);

// ditado
let r = FR.avaliarDitado("J'ai vingt-cinq ans et je suis française.", "j' ai 25 ans et je suis francaise.");
check('ditado: "j\' ai" junta (elisão), 25 vira vingt-cinq, française sem cedilha = leve', resumo(r), "J'ai vingt-cinq ans et je suis ~française.:accent");
check('ditado: nota de "j\' ai ... 25 ... francaise" (6,5 de 7)', r.score, 93);
r = FR.avaliarDitado('Elle est ma sœur.', 'elle est ma soeur.');
check('ditado: "soeur" = leve de ligadura', resumo(r), 'Elle est ma ~sœur.:ligature');
check('ditado: explicação da ligadura', FR.textoErroLeve(r.merged[3]), '«sœur» usa a letra «œ», que é uma só (você escreveu «soeur»).');
r = FR.avaliarDitado('Il va à Paris.', 'il va a Paris.');
check('ditado: "a" por "à" = leve de acento com a nota do homófono', FR.textoErroLeve(r.merged[2]), '«à»: confira os acentos (você escreveu «a»). «a» é o verbo avoir (il a); «à» é preposição (à Paris).');
check('ditado: "est" por "et" = homófono', FR.classificarErroDitado('et', 'est').kind, 'homophone');
check('ditado: "petite" por "petit" = concordância (-e)', FR.classificarErroDitado('petite', 'petit').noteText.includes('(-e)'), true);
check('ditado: "aujourdhui" = leve de apóstrofo', resumo(FR.avaliarDitado("Aujourd'hui.", 'aujourdhui.')), "~Aujourd'hui.:apostrophe");
check('ditado: "peut etre" junta as duas palavras (leve); hífen E acento juntos caem em "spelling"', resumo(FR.avaliarDitado('Peut-être.', 'peut etre.')), '~Peut-être.:spelling');
check('ditado: "peut être" (só sem hífen) = leve de hífen', resumo(FR.avaliarDitado('Peut-être.', 'peut être.')), '~Peut-être.:hyphen');
check('ditado: "virgule" por extenso tira meio ponto', FR.avaliarDitado('Bonjour, Sophie.', 'bonjour virgule Sophie.').spokenPunct.length, 1);
check('ACHADO ditado: texto com "30" e aluna digita "30" perde ponto (latente: nenhum ditado do fr tem dígito)', FR.avaliarDitado('Il fait 30 degrés.', 'il fait 30 degrés.').score < 100, true);
check('teclado fr: 14 teclas, com œ', IDIOMAS.fr.gruposDeAcentos.flat().length === 14 && IDIOMAS.fr.gruposDeAcentos.flat().includes('œ'), true);
console.log(`família latina, francês: ${ok}/${ok + ruim} passaram`);
process.exit(ruim ? 1 : 0);
