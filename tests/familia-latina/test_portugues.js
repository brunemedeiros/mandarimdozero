// Família latina configurada para o PORTUGUÊS DO BRASIL como idioma estudado (o /pt, para quem fala inglês).
// Todos os casos saem de exemplos reais do português: cedilha, til, crase, contrações (de + a = da,
// em + o = no), nasais, acento diferencial, Reforma Ortográfica de 2009, hífen, números com gênero.
// Nenhum caso foi adaptado do francês. Depois, propriedades sobre o texto em português do Brasil que a
// dona escreveu (courses/fr-pt-BR/layer.js).
// Rodar: node tests/familia-latina/test_portugues.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FL = require(path.join(ROOT, 'shared/core/familias/latina.js'));
const IDIOMAS = require(path.join(ROOT, 'shared/core/familias/latina-idiomas.js'));
const PT = FL.criar(IDIOMAS.pt);

let ok = 0, ruim = 0;
function check(desc, obtido, esperado) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) ok++;
  else { ruim++; console.log(`✗ ${desc}\n    esperado: ${b}\n    obtido:   ${a}`); }
}
const resumoDitado = (r) => r.merged.map(x => x.type === 'match' ? (x.light ? `~${x.word}:${x.reason}` : x.word) : `${x.type}:${x.word || x.correct}`).join(' ');

// ------------------------------------------------------------ 1. tirar acento: cedilha, til, crase, trema
check('semAcento: coração', FL.semAcento('coração'), 'coracao');
check('semAcento: pão, mãe, irmã, põe', ['pão', 'mãe', 'irmã', 'põe'].map(FL.semAcento), ['pao', 'mae', 'irma', 'poe']);
check('semAcento: você, avô, avó, à, é', ['você', 'avô', 'avó', 'à', 'é'].map(FL.semAcento), ['voce', 'avo', 'avo', 'a', 'e']);
check('normalizarFrouxo: "  Atenção " -> atencao', FL.normalizarFrouxo('  Atenção '), 'atencao');
check('normalizarFrouxo aceita acento digitado em duas partes (NFD do teclado)', FL.normalizarFrouxo('coração'), 'coracao');
check('formasAceitas: "o / a" (artigo nas duas formas)', FL.formasAceitas('obrigado / obrigada'), ['obrigado', 'obrigada']);

// ------------------------------------------------------------ 2. qual acento faltou, sobrou ou foi trocado
const tipos = (a, d) => (FL.tiposDeErroDeAcento(a, d) || null) && FL.tiposDeErroDeAcento(a, d).map(x => `${x.tipo}:${x.marca || x.marcaDigitada}${x.tipo === 'trocado' ? '<-' + x.marcaDigitada : ''}@${x.letra}`);
check('coração x coracao: faltou cedilha e til', tipos('coração', 'coracao'), ['faltou:cedilha@ç', 'faltou:til@ã']);
check('pão x pao: faltou til (nasal)', tipos('pão', 'pao'), ['faltou:til@ã']);
check('mãe x mae: faltou til', tipos('mãe', 'mae'), ['faltou:til@ã']);
check('órgão x orgao: faltou agudo e til', tipos('órgão', 'orgao'), ['faltou:agudo@ó', 'faltou:til@ã']);
check('também x tambem: faltou agudo (nasal com m)', tipos('também', 'tambem'), ['faltou:agudo@é']);
check('você x vocé: circunflexo trocado por agudo', tipos('você', 'vocé'), ['trocado:circunflexo<-agudo@ê']);
check('avó x avô: agudo trocado por circunflexo (avó = avó, avô = avô)', tipos('avó', 'avô'), ['trocado:agudo<-circunflexo@ó']);
check('à x a: faltou grave (crase)', tipos('à', 'a'), ['faltou:grave@à']);
check('linguiça x lingüiça: sobrou trema (abolido em 2009)', tipos('linguiça', 'lingüiça'), ['sobrou:trema@u']);
check('igual: []', FL.tiposDeErroDeAcento('ação', 'Ação'), []);
check('casa x caso: letra diferente, não é erro de acento (null)', FL.tiposDeErroDeAcento('casa', 'caso'), null);
check('falam x falão: m x o não é acento (null)', FL.tiposDeErroDeAcento('falam', 'falão'), null);
check('corasão x coração: s x ç não é só a cedilha (null)', FL.tiposDeErroDeAcento('coração', 'corasão'), null);
check('nome da marca: grave no "a" = crase', PT.nomeDaMarca('grave', 'à'), 'crase (à)');
check('nome da marca: til', PT.nomeDaMarca('til', 'ã'), 'tilde');
check('nome da marca: cedilha', PT.nomeDaMarca('cedilha', 'ç'), 'cedilla');

// ------------------------------------------------------------ 3. desafio Acentuação (acento EXIGIDO)
check('Acentuação: coração certo', PT.resultadoAcentuacao('coração', 'coração'), 'ok');
check('Acentuação: maiúscula e espaço não contam', PT.resultadoAcentuacao('  Coração ', 'coração'), 'ok');
check('Acentuação: coracao = quase', PT.resultadoAcentuacao('coracao', 'coração'), 'partial');
check('Acentuação: coraçao (faltou só o til) = quase', PT.resultadoAcentuacao('coraçao', 'coração'), 'partial');
check('Acentuação: corasão = errado (s por ç é grafia)', PT.resultadoAcentuacao('corasão', 'coração'), 'fail');
check('Acentuação: "vou a praia" por "vou à praia" = quase', PT.resultadoAcentuacao('vou a praia', 'vou à praia'), 'partial');
check('Acentuação: "vou há praia" = errado', PT.resultadoAcentuacao('vou há praia', 'vou à praia'), 'fail');
check('Acentuação: avô por avó = quase (o desafio mostra a certa)', PT.resultadoAcentuacao('avô', 'avó'), 'partial');
check('Acentuação: vazio = errado', PT.resultadoAcentuacao('', 'pão'), 'fail');

// ------------------------------------------------------------ 4. exercícios de digitar: o risco do acento tolerado
// No fr o acento NÃO conta (decisão antiga da dona). No pt há pares em que só o acento muda o sentido.
check('regra do fr aplicada ao pt aceitaria "avô" para "avó" (risco documentado)', FL.respostaDigitadaCerta('avô', 'avó'), true);
check('regra do fr aplicada ao pt aceitaria "pais" para "país"', FL.respostaDigitadaCerta('pais', 'país'), true);
check('modo "quase": avô para avó = quase', FL.avaliarRespostaDigitada('avô', 'avó', { acento: 'quase' }), 'quase');
check('modo "quase": esta para está = quase', FL.avaliarRespostaDigitada('esta', 'está', { acento: 'quase' }), 'quase');
check('modo "quase": Está. para está = ok (maiúscula e ponto não contam)', FL.avaliarRespostaDigitada('Está.', 'está', { acento: 'quase' }), 'ok');
check('modo "quase": "obrigada" aceita em "obrigado / obrigada"', FL.avaliarRespostaDigitada('obrigada', 'obrigado / obrigada', { acento: 'quase' }), 'ok');
check('modo "quase": erro de letra = errou', FL.avaliarRespostaDigitada('abrigado', 'obrigado', { acento: 'quase' }), 'errou');
check('modo "tolerante": sem til = ok', FL.avaliarRespostaDigitada('pao', 'pão', { acento: 'tolerante' }), 'ok');
// Decisão da dona (2026-10-15): no pt, falta de acento nos exercícios de digitar = Quase. A configuração do pt já vem assim.
check('pt (decisão): configuração com acentoNaDigitacao = quase', IDIOMAS.pt.acentoNaDigitacao, 'quase');
check('pt: "avô" por "avó" = quase', PT.avaliarRespostaDigitada('avô', 'avó'), 'quase');
check('pt: "pais" por "país" = quase', PT.avaliarRespostaDigitada('pais', 'país'), 'quase');
check('pt: "pao" por "pão" = quase (nem certo, nem erro total)', PT.avaliarRespostaDigitada('pao', 'pão'), 'quase');
check('pt: "coracao" por "coração" = quase', PT.avaliarRespostaDigitada('coracao', 'coração'), 'quase');
check('pt: "Coração!" = ok (maiúscula e pontuação não contam)', PT.avaliarRespostaDigitada('Coração!', 'coração'), 'ok');
check('pt: "copo d’água" (apóstrofo do celular) = ok', PT.avaliarRespostaDigitada('copo d’água', "copo d'água"), 'ok');
check('pt: "corasão" = errou (s por ç é grafia)', PT.avaliarRespostaDigitada('corasão', 'coração'), 'errou');
check('pt: vazio = errou', PT.avaliarRespostaDigitada('', 'pão'), 'errou');
check('pt: todos os pares de acento da config viram quase entre si',
  IDIOMAS.pt.paresDeAcento.every(p => p.every(a => p.every(b => a === b || PT.avaliarRespostaDigitada(a, b) === 'quase'))), true);
check('todos os pares de acento da config diferem só no acento',
  IDIOMAS.pt.paresDeAcento.every(p => p.every(w => FL.semAcento(w) === FL.semAcento(p[0])) && new Set(p).size === p.length), true);
check('separadores: "segunda feira" por "segunda-feira" = ok (hífen = espaço)', PT.avaliarComSeparadores('segunda feira', ['segunda-feira']), 'ok');
check('separadores: "guarda chuva" sem nada mais = ok', PT.avaliarComSeparadores('guarda chuva', ['guarda-chuva']), 'ok');
check('separadores: "pe de moleque" por "pé de moleque" = quase', PT.avaliarComSeparadores('pe de moleque', ['pé de moleque']), 'almost');

// ------------------------------------------------------------ 5. ditado: til, cedilha, crase
let r = PT.avaliarDitado('Minha mãe faz pão.', 'minha mae faz pao.');
check('ditado: mãe/pão sem til = 2 erros leves de acento', resumoDitado(r), 'Minha ~mãe:accent faz ~pão.:accent');
check('ditado: nota 75 (2 exatas + 2 meias de 4)', r.score, 75);
r = PT.avaliarDitado('A lição começa às nove.', 'a licao comeca as nove.');
check('ditado: lição/começa/às sem acento = leves', resumoDitado(r), 'A ~lição:accent ~começa:accent ~às:accent nove.');
r = PT.avaliarDitado('Vou à escola.', 'vou a escola.');
const crase = r.merged.find(x => x.light);
check('ditado: "a" por "à" = erro leve de acento', crase && crase.reason, 'accent');
check('ditado: explicação da crase (grupo a/à/há)', PT.textoErroLeve(crase), '“à”: check the accents (you wrote “a”). “a” is “the” (feminine) or “to”; “à” is a + a joined (vou à praia, “I’m going to the beach”); “há” is the verb haver, “there is/are” or “ago” (há dois anos, “two years ago”).');
r = PT.avaliarDitado('Vou à escola.', 'vou há escola.');
check('ditado: "há" por "à" = troca de palavra', r.merged.map(x => x.type), ['match', 'sub', 'match']);
check('ditado: a troca há/à explica o grupo', PT.classificarErroDitado('à', 'há').kind, 'homophone');
check('ditado: "Ele tem" x "Eles têm": tem/têm é homófono', PT.classificarErroDitado('têm', 'tem').kind, 'homophone');

// ------------------------------------------------------------ 6. ditado: contrações
r = PT.avaliarDitado('Moro no Brasil.', 'moro em o Brasil.');
check('ditado: "em o" por "no" = 1 erro leve de contração', resumoDitado(r), 'Moro ~no:contraction Brasil.');
check('ditado: explicação em + o = no', PT.textoErroLeve(r.merged[1]), '“no” is one word: em + o = no (you wrote “em o”).');
check('ditado: nota 83 (2 exatas + meia de 3)', r.score, 83);
r = PT.avaliarDitado('Gosto da praia.', 'gosto de a praia.');
check('ditado: "de a" por "da"', resumoDitado(r), 'Gosto ~da:contraction praia.');
r = PT.avaliarDitado('Ele passou pela rua.', 'ele passou por a rua.');
check('ditado: "por a" por "pela"', resumoDitado(r), 'Ele passou ~pela:contraction rua.');
r = PT.avaliarDitado('Ela mora num apartamento.', 'ela mora em um apartamento.');
check('ditado: "em um" por "num"', resumoDitado(r), 'Ela mora ~num:contraction apartamento.');
r = PT.avaliarDitado('Não gosto disso.', 'nao gosto de isso.');
check('ditado: "de isso" por "disso" (e "nao" sem til)', resumoDitado(r), '~Não:accent gosto ~disso.:contraction');
r = PT.avaliarDitado('O livro é dele.', 'o livro e de ele.');
check('ditado: "de ele" por "dele"; "e" por "é" leve', resumoDitado(r), 'O livro ~é:accent ~dele.:contraction');
r = PT.avaliarDitado('Antes de a aula começar, ele chegou.', 'antes da aula começar, ele chegou.');
check('ditado: "da" onde a norma separa ("antes de a aula começar")', resumoDitado(r), 'Antes ~de:contraction ~a:contraction aula começar, ele chegou.');
check('ditado: explicação de quem juntou', PT.textoErroLeve(r.merged[1]), 'Here the text keeps “de” as a separate word (you wrote “da”).');
r = PT.avaliarDitado('Está na hora de o filme começar.', 'está na hora de o filme começar.');
check('ditado: texto com "de o" digitado igual = 100 (não inventa contração)', r.score, 100);
r = PT.avaliarDitado('Gosto da praia e do mar.', 'gosto da praia e do mar.');
check('ditado: contração digitada certa = 100', r.score, 100);
r = PT.avaliarDitado('Penso em outra coisa.', 'penso em outra coisa.');
check('ditado: "em" + palavra que não forma contração fica como está', r.score, 100);

// ------------------------------------------------------------ 7. ditado: Reforma de 2009, hífen, apóstrofo
r = PT.avaliarDitado('Que ideia boa!', 'que idéia boa!');
check('ditado: "idéia" (grafia antiga) = leve de acento', resumoDitado(r), 'Que ~ideia:accent boa!');
check('ditado: explica que o acento caiu na Reforma', PT.textoErroLeve(r.merged[1]), '“ideia”: check the accents (you wrote “idéia”). This accent was dropped in the 2009 spelling reform.');
check('classificar: "vôo" por "voo" = reform', PT.classificarErroDitado('voo', 'vôo').kind, 'reform');
check('classificar: "lingüiça" por "linguiça" = reform', PT.classificarErroDitado('linguiça', 'lingüiça').kind, 'reform');
r = PT.avaliarDitado('Comprei um guarda-chuva.', 'comprei um guarda chuva.');
check('ditado: "guarda chuva" = 1 palavra com erro leve de hífen', resumoDitado(r), 'Comprei um ~guarda-chuva.:hyphen');
r = PT.avaliarDitado('Até segunda-feira!', 'ate segundafeira!');
check('ditado: "segundafeira" e "ate"', resumoDitado(r), '~Até:accent ~segunda-feira!:hyphen');
r = PT.avaliarDitado('Quero um copo d\'água.', 'quero um copo dágua.');
check('ditado: "dágua" por "d\'água" = leve de apóstrofo', resumoDitado(r), 'Quero um copo ~d\'água.:apostrophe');
check('pt não tem elisão: "d\' água" não vira "d\'água"', PT.prepararTextoDitado("copo d' água", 'copo d\'água').text, "copo d' água");
check('apóstrofo curvo do celular vira reto', PT.prepararTextoDitado('copo d’água', '').text, "copo d'água");

// ------------------------------------------------------------ 8. ditado: números (gênero) e pontuação falada
r = PT.avaliarDitado('Tenho duas irmãs.', 'tenho 2 irmãs.');
check('número: 2 = "duas" quando o texto diz "duas"', r.digitNotes, [{ digits: '2', words: 'duas' }]);
check('número: nota 100', r.score, 100);
check('número: 2 = "dois" quando o texto diz "dois"', PT.avaliarDitado('Tenho dois irmãos.', 'tenho 2 irmãos.').digitNotes[0].words, 'dois');
check('número: 21 = "vinte e uma" (bonecas)', PT.avaliarDitado('Ela tem vinte e uma bonecas.', 'ela tem 21 bonecas.').score, 100);
check('número: 14 = "quatorze" quando o texto usa quatorze', PT.avaliarDitado('Tenho quatorze anos.', 'tenho 14 anos.').digitNotes[0].words, 'quatorze');
check('número: 14 = "catorze" quando o texto usa catorze', PT.avaliarDitado('Tenho catorze anos.', 'tenho 14 anos.').digitNotes[0].words, 'catorze');
check('número: 100 = "cem"', PT.avaliarDitado('Paguei cem reais.', 'paguei 100 reais.').score, 100);
check('números de 0 a 100 escritos', [0, 1, 2, 3, 16, 17, 19, 20, 33, 50, 99, 100, 101].map(n => IDIOMAS.pt.numeroPorExtenso(n)),
  [['zero'], ['um', 'uma'], ['dois', 'duas'], ['três'], ['dezesseis'], ['dezessete'], ['dezenove'], ['vinte'], ['trinta e três'], ['cinquenta'], ['noventa e nove'], ['cem'], null]);
check('número: texto com dígito ("30 graus") e aluna digita "30" = 100', PT.avaliarDitado('Está fazendo 30 graus hoje.', 'está fazendo 30 graus hoje.').score, 100);
r = PT.avaliarDitado('Oi, tudo bem?', 'oi vírgula tudo bem ponto de interrogação');
check('pontuação falada: vírgula e ponto de interrogação viram sinais (na ordem da lista, como no fr)', r.spokenPunct.map(x => x.symbol).sort(), ['?', ','].sort());
check('pontuação falada: cada uma tira meio ponto', r.score, 67);
r = PT.avaliarDitado('Espero no ponto de ônibus.', 'espero no ponto de ônibus.');
check('pontuação falada: "ponto" que é palavra do texto não vira sinal', [r.spokenPunct.length, r.score], [0, 100]);

// ------------------------------------------------------------ 9. classificar a troca: homófonos e concordância
const k = (a, b) => PT.classificarErroDitado(a, b).kind;
check('mas x mais', k('mas', 'mais'), 'homophone');
check('mal x mau', k('mal', 'mau'), 'homophone');
check('cem x sem', k('cem', 'sem'), 'homophone');
check('sexta x cesta', k('sexta', 'cesta'), 'homophone');
check('concerto x conserto', k('conserto', 'concerto'), 'homophone');
check('obrigada x obrigado = concordância (-a x -o)', PT.classificarErroDitado('obrigada', 'obrigado').detail, { alvo: '-a', digitado: '-o' });
check('bonitas x bonitos', PT.classificarErroDitado('bonitas', 'bonitos').detail, { alvo: '-as', digitado: '-os' });
check('livros x livro (plural)', PT.classificarErroDitado('livros', 'livro').detail, { alvo: '-s', digitado: '—' });
check('professora x professor', PT.classificarErroDitado('professora', 'professor').detail, { alvo: '-a', digitado: '—' });
check('pães x pão (-ão -> -ães)', PT.classificarErroDitado('pães', 'pão').detail, { alvo: '-ães', digitado: '-ão' });
check('limões x limão', k('limões', 'limão'), 'agreement');
check('falo x fala (pessoa do verbo)', k('falo', 'fala'), 'agreement');
check('Paulo x Paula: nome próprio não é concordância', k('Paulo', 'Paula'), 'other');
check('gato x rato = outra palavra', k('gato', 'rato'), 'other');
check('contração digitada separada numa troca: "de a" por "da"', k('da', 'de a'), 'contraction');
check('texto da concordância (inglês)', PT.classificarErroDitado('obrigada', 'obrigado').noteText, '“obrigada” (you wrote “obrigado”): only the ending is different (-a x -o). If the word agrees with another one, check gender, number or the verb form; otherwise it may just be a typo.');

// ------------------------------------------------------------ 10. teclado de acentos do português
const teclas = IDIOMAS.pt.gruposDeAcentos.flat();
check('teclado pt: as 12 letras com acento do português', teclas.slice().sort(), ['à', 'á', 'â', 'ã', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'].sort());
check('teclado pt: sem ü (trema abolido), sem è/œ/ë (do francês)', ['ü', 'è', 'œ', 'ë', 'î'].some(c => teclas.includes(c)), false);
check('teclado pt: HTML com as classes pedidas', PT.htmlTecladoDeAcentos({ picker: 'lat-accent-picker', group: 'lat-accent-group', key: 'lat-accent-key' }).includes('<button type="button" class="lat-accent-key">ã</button>'), true);
check('teclado: selecionar o "a" de "nao" e tocar ã -> "não", cursor depois do ã', FL.inserirNoCursor('nao', 1, 2, 'ã'), { value: 'não', cursor: 2 });
check('teclado: sem cursor, vai para o fim', FL.inserirNoCursor('coraç', null, null, 'ã'), { value: 'coraçã', cursor: 6 });

// ------------------------------------------------------------ 11. propriedades sobre texto real em português
const layer = fs.readFileSync(path.join(ROOT, 'courses/fr-pt-BR/layer.js'), 'utf8');
const frases = [...new Set([...layer.matchAll(/"((?:[^"\\\n]|\\.){15,200})"/g)].map(m => JSON.parse('"' + m[1] + '"')))]
  .filter(s => /\s/.test(s) && /[áàâãéêíóôõúç]/i.test(s) && !/[<>{}]/.test(s));
let prop = { cem: 0, semSub: 0, tipos: 0, acentuacao: 0, n: frases.length };
for (const f of frases) {
  if (PT.avaliarDitado(f, f).score === 100) prop.cem++;
  const semAc = FL.semAcento(f);
  const d = PT.avaliarDitado(f, semAc);
  if (d.merged.every(x => x.type === 'match' && (!x.light || x.reason === 'accent'))) prop.semSub++;
  const t = FL.tiposDeErroDeAcento(f, semAc);
  if (t && t.length > 0 && t.every(x => x.tipo === 'faltou')) prop.tipos++;
  if (PT.resultadoAcentuacao(semAc, f) === 'partial') prop.acentuacao++;
}
check(`texto real (${prop.n} frases do pt-BR da dona): ditado da própria frase = 100`, prop.cem, prop.n);
check('texto real: frase sem acento só gera erros leves de acento (nenhuma troca)', prop.semSub, prop.n);
check('texto real: tiposDeErroDeAcento só acusa "faltou"', prop.tipos, prop.n);
check('texto real: Acentuação sem acento = quase', prop.acentuacao, prop.n);
check('texto real: há frases suficientes (>= 300)', prop.n >= 300, true);

console.log(`família latina, português: ${ok}/${ok + ruim} passaram`);
process.exit(ruim ? 1 : 0);
