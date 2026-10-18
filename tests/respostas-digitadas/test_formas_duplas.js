// Cartão com duas formas ("allemand / allemande", "Nǐ jǐ suì? / Nǐ duō dà?"): nos exercícios de digitar,
// vale uma forma só OU o texto inteiro (barra com ou sem espaço). Helpers de shared/core/estado-trilha-desafios.js.
// Rodar: node tests/respostas-digitadas/test_formas_duplas.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../shared/core/estado-trilha-desafios.js'), 'utf8'), ctx);
const R = (src) => vm.runInContext(src, ctx);
const J = JSON.stringify;

check('uma forma só continua igual', J(R("acceptedFormsTyped('bonjour')")) === J(['bonjour']));
check('duas formas: cada uma + o texto inteiro', J(R("acceptedFormsTyped('allemand / allemande')")) === J(['allemand', 'allemande', 'allemand / allemande']));
check('texto vazio não quebra', J(R("acceptedFormsTyped('')")) === J([]) && J(R('acceptedFormsTyped(null)')) === J([]));
check('barra sem espaço vira " / "', R("slashSpacing('allemand/allemande')") === 'allemand / allemande');
check('barra com espaços irregulares vira " / "', R("slashSpacing('allemand  /allemande')") === 'allemand / allemande');
check('slashSpacing aceita null', R('slashSpacing(null)') === '');
// o fluxo do zh: strip + comparação com as formas
const strip = (s) => s.toLowerCase().replace(/[.,!?;:'"，。！？；：]/g, '').trim();
const certo = (typed, expected) => R(`acceptedFormsTyped(${J(expected)})`).some(f => strip(f) === strip(R(`slashSpacing(${J(typed)})`)));
check('zh: texto inteiro com a barra = certo', certo('Nǐ jǐ suì? / Nǐ duō dà?', 'Nǐ jǐ suì? / Nǐ duō dà?'));
check('zh: barra sem espaço = certo', certo('Nǐ jǐ suì?/Nǐ duō dà?', 'Nǐ jǐ suì? / Nǐ duō dà?'));
check('zh: só a primeira frase = certo', certo('Nǐ jǐ suì?', 'Nǐ jǐ suì? / Nǐ duō dà?'));
check('zh: segunda frase incompleta = errado', !certo('Nǐ jǐ suì? / Nǐ duō', 'Nǐ jǐ suì? / Nǐ duō dà?'));
check('zh: frase de outro cartão = errado', !certo('Nǐ hǎo', 'Nǐ jǐ suì? / Nǐ duō dà?'));
summary();
