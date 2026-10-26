// Regra da dona (2026-10-26): no Ouça e traduza em pt-BR, resposta em português de PORTUGAL não é "certa": é "Quase"
// ('partial'), e a devolutiva mostra a forma do Brasil. Roda o bloco REAL challenge-translation-logic de shared/desafios.js.
// Também varre TODAS as traduções aceitas do repositório (fr/challenges.js, lotes, retratos da produção): nenhuma pode ter
// marca de Portugal (fora as listadas em CONHECIDAS, que o SQL docs/rollout-sql/desafios-correcoes-2026-10-26.sql tira) e
// cada uma, digitada igual, continua 'ok'.
// Rodar: node tests/desafios-ptpt/test_ptpt.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'shared', 'desafios.js'), 'utf8');
const a = SRC.indexOf('// BEGIN challenge-translation-logic'), b = SRC.indexOf('// END challenge-translation-logic');
const ctx = {}; vm.runInNewContext(SRC.slice(a, b) + '\n;globalThis.__x = { listenTranslateOutcome, listenTranslateVerdict, ptEuropeanToBrazilian, translationHasPersonMismatch };', ctx);
const { listenTranslateOutcome, listenTranslateVerdict, ptEuropeanToBrazilian, translationHasPersonMismatch } = ctx.__x;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const out = (ans, refs) => listenTranslateOutcome(ans, refs, translationHasPersonMismatch(ans), {});
const verdict = (ans, refs) => listenTranslateVerdict(ans, refs, translationHasPersonMismatch(ans), {});

// ---- PT-PT -> Quase, com a forma do Brasil ----
const LT_A1_001_NOVO = ['Eu como uma maçã.', 'Estou comendo uma maçã.', 'Eu estou comendo uma maçã.'];
const LT_A1_001_ANTIGO = ['Eu como uma maçã.', 'Estou comendo uma maçã.', 'Eu estou a comer uma maçã.'];
const PTPT = [
  ['Eu estou a comer uma maçã.', LT_A1_001_NOVO, ['estou comendo']],
  ['Eu estou a comer uma maçã.', LT_A1_001_ANTIGO, ['estou comendo']], // antes do SQL: a forma de Portugal digitada igual à referência
  ['Estou a comer uma maçã', LT_A1_001_NOVO, ['estou comendo']],
  ['Estou a procurar um vestido.', ['Estou procurando um vestido.', 'Eu procuro um vestido.', 'Procuro um vestido.'], ['estou procurando']],
  ['Estou a comprar legumes e arroz.', ['Eu compro legumes e arroz.', 'Compro legumes e arroz.', 'Estou comprando legumes e arroz.'], ['estou comprando']],
  ['Hoje está a chover.', ['Hoje está chovendo.', 'Hoje chove.', 'Hoje está chuvoso.'], ['está chovendo']],
  ['Eu apanho o autocarro todos os dias.', ['Eu pego o ônibus todos os dias.', 'Pego o ônibus todo dia.', 'Eu pego o ônibus diariamente.'], ['pego', 'ônibus']],
  ['Hoje de manhã eu apanhei o autocarro.', ['Hoje de manhã eu peguei o ônibus.', 'Esta manhã peguei o ônibus.', 'Hoje cedo eu peguei o ônibus.'], ['peguei', 'ônibus']],
  ['Eu apanho o comboio.', ['Eu pego o trem.'], ['pego', 'trem']],
  ['O meu telemóvel está na mesa.', ['Meu celular está na mesa.'], ['celular']],
  ['Onde fica a casa de banho?', ['Onde fica o banheiro?', 'Onde é o banheiro?'], ['banheiro']],
  ['Eu tomo o pequeno-almoço às sete.', ['Eu tomo café da manhã às sete.'], ['café da manhã']],
  ['Eu tomo o pequeno almoço às sete.', ['Eu tomo café da manhã às sete.'], ['café da manhã']],
  ['Eu bebo um sumo de laranja.', ['Eu bebo um suco de laranja.'], ['suco']],
  ['A rapariga está aqui.', ['A moça está aqui.'], ['moça']],
  ['É um facto.', ['É um fato.'], ['fato']],
  ['Perdi o contacto dela.', ['Perdi o contato dela.'], ['contato']],
  ['Tem leite no frigorífico.', ['Tem leite na geladeira.'], ['geladeira']],
  ['O ecrã do computador é grande.', ['A tela do computador é grande.'], ['tela']],
  ['Ela andava a estudar muito.', ['Ela estava estudando muito.', 'Ela andava estudando muito.'], ['andava estudando']],
  ['Ele ficou a saber da notícia ontem.', ['Ele ficou sabendo da notícia ontem.'], ['ficou sabendo']],
];
for (const [ans, refs, br] of PTPT){
  const v = verdict(ans, refs);
  check(`PT-PT -> Quase: "${ans}"`, v.outcome === 'partial', v);
  check(`PT-PT mostra a forma do Brasil: "${ans}" -> ${br.join(', ')}`, v.ptPt && JSON.stringify(v.ptPt.marks.map(m => m.br)) === JSON.stringify(br), v.ptPt && v.ptPt.marks);
}
check('PT-PT sem relação com a frase continua Errado', out('Eu estou a dormir no sofá.', LT_A1_001_NOVO) === 'fail');
check('marca de Portugal + outro erro (número) continua Quase', out('Estou a comer três maçãs.', ['Estou comendo duas maçãs.']) === 'partial');
check('par mostrado: "estou a comer" -> "estou comendo"', JSON.stringify(ptEuropeanToBrazilian('Eu estou a comer uma maçã.').marks) === JSON.stringify([{ pt: 'estou a comer', br: 'estou comendo' }]));

// ---- Brasil -> continua certo (e sem marca) ----
const BR = [
  ['Eu estou comendo uma maçã.', LT_A1_001_NOVO],
  ['Estou comendo uma maçã', LT_A1_001_NOVO],
  ['Eu como uma maçã', LT_A1_001_NOVO],
  ['Eu pego o ônibus todos os dias.', ['Eu pego o ônibus todos os dias.']],
  ['Qual é o teu nome?', ['Qual é o seu nome?', 'Como você se chama?', 'Qual é o teu nome?']], // "tu/teu" não conta
  ['Tu queres açúcar?', ['Você quer açúcar?', 'Tu queres açúcar?', 'Quer açúcar?']],
  ['Eu venho do Brasil, e tu?', ['Eu venho do Brasil, e você?', 'Sou do Brasil, e você?', 'Eu venho do Brasil, e tu?']],
  ['Eu vou à farmácia.', ['Eu vou à farmácia.', 'Vou à farmácia.']],
];
for (const [ans, refs] of BR){
  const v = verdict(ans, refs);
  check(`Brasil -> certo: "${ans}"`, v.outcome === 'ok' && v.ptPt === null, v);
}
// Frases do Brasil que lembram as marcas e NÃO podem ser pegas
for (const s of ['Eu sumo daqui amanhã.', 'Ela está a fim de sair.', 'O museu fica a dois quilômetros.', 'Ela anda a pé.', 'Ele está a caminho.',
  'Ela apanhou da mãe.', 'Eu apanho as roupas do varal.', 'Ele fica a cargo do projeto.', 'O fato é que ele saiu.', 'Estamos a ponto de sair.']){
  check(`sem marca de Portugal: "${s}"`, ptEuropeanToBrazilian(s).marks.length === 0, ptEuropeanToBrazilian(s).marks);
}

// ---- Varredura do repositório: toda tradução aceita ----
function load(file, name){ const c = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8') + `\n;globalThis.__x=${name};`, c); return c.__x; }
const all = load('fr/challenges.js', 'CHALLENGES').map(c => ({ ...c, _src: 'fr/challenges.js' }));
const dir = path.join(ROOT, 'fr/scripts/challenges_import');
for (const f of fs.readdirSync(dir).filter(f => /^(lote|modulo)-.*\.json$/.test(f))){
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const c of (Array.isArray(j) ? j : (j.challenges || j.items || []))) all.push({ ...c, _src: f });
}
for (const f of ['docs/i18n/challenges-producao-a1m3-lt.json', 'docs/i18n/challenges-producao-sem-fonte.json']){
  for (const c of JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).challenges) all.push({ ...c, _src: f });
}
const CONHECIDAS = new Set([]); // formas de Portugal ainda presentes no repositório (nenhuma depois de 2026-10-26)
let refsVistas = 0;
const achadas = [];
for (const c of all.filter(c => c.type === 'listen_translate' && Array.isArray(c.referenceTranslations))){
  for (const r of c.referenceTranslations){
    refsVistas++;
    const m = ptEuropeanToBrazilian(r).marks;
    if (m.length && !CONHECIDAS.has(r)) achadas.push(`${c._src} ${c.id}: ${r}`);
    else if (!m.length) check(`${c.id} "${r}" digitada igual continua certa`, out(r, c.referenceTranslations) === 'ok', out(r, c.referenceTranslations));
  }
  check(`${c.id} (${c._src}): ao menos uma tradução do Brasil`, c.referenceTranslations.some(r => !ptEuropeanToBrazilian(r).marks.length));
}
check('nenhuma forma de Portugal nas traduções aceitas do repositório', achadas.length === 0, achadas);
console.log(`Traduções aceitas varridas: ${refsVistas}`);
console.log(`PT-PT no Ouça e traduza: ${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
