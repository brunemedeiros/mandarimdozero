// Validador "só palavras vistas" (decisão 233; regra 11; decisões 211, 225, 253, 260): fr/scripts/curriculo_palavras_vistas.js.
// Casos sintéticos (mapa pequeno) que falhariam sem cada regra + conferências no mapa real e nos dados.
// Rodar: node tests/curriculo/test_palavras_vistas.js
'use strict';
const path = require('path');
const { check, summary } = require('../fase-e/harness');
const ROOT = path.resolve(__dirname, '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const R = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas_relatorio.js'));

// Mapa sintético: A1 com U1 (bonjour, le pain, manger), U2 (le fromage, la pomme; nota com "adorer"), U3 (le musée).
const mapa = { niveis: [
  { id: 'A1', modulos: [{ id: 'A1-m1', nome: 'Um', ordem: 1, unidades: [
    { id: 'U1', nome: 'Um', tipo: 'vocabulario', cartoes: [{ palavra: 'bonjour' }, { palavra: 'le pain' }, { palavra: 'manger' }] },
    { id: 'U2', nome: 'Dois', tipo: 'vocabulario', cartoes: [{ palavra: 'le fromage' }, { palavra: 'la pomme' }],
      notas: [{ titulo: 'Mais sobre gostos', tipo: 'Vocab', palavras: ['adorer'] }] },
    { id: 'U3', nome: 'Três', tipo: 'vocabulario', cartoes: [{ palavra: 'le musée' }, { palavra: 'sur' }, { palavra: 'aller', reconhecimento_so: true }] },
  ] }] },
  { id: 'A2', modulos: [{ id: 'A2-m1', nome: 'A2', ordem: 1, unidades: [
    { id: 'V1', nome: 'Viagem', tipo: 'vocabulario', cartoes: [{ palavra: 'le voyage' }] },
  ] }] },
] };
const dados = {
  funcionais: { grupos: [
    { id: 'artigos', antes_do_cartao: true, palavras: ['le', 'la', 'les', 'l\'', 'un', 'une', 'des', 'du', 'de'] },
    { id: 'pronomes', palavras: ['je', 'j\'', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'c\'', 'ce', 'ça'] },
    { id: 'preposicoes', palavras: ['à', 'sur', 'avec'] },
    { id: 'conjuncoes', palavras: ['et', 'mais'] },
    { id: 'etre', lema: 'être', palavras: ['suis', 'est'] },
    { id: 'aller', lema: 'aller', palavras: ['vais', 'va'] },
  ] },
  formasExtras: { formas: { 'le voyage': [] }, nomes_proprios: ['Ana'] },
};
const exc = { palavras_antes_do_cartao: [
  { expressao: 'délicieux', unidades: ['U2'], cartao_em: [] },
  { expressao: "l'euro", unidades: [], escopo: 'nivel:A1', cartao_em: [] },
] };
const val = (texto, ctx, u, e) => V.validarTexto(texto, ctx, u, mapa, e === undefined ? exc : e, dados);

console.log('== palavra de unidade posterior');
check('U2: "le musée" (cartão da U3) é acusado', val('Le musée.', 'dialogo', 'U2').nao_vistas.includes('musée'), val('Le musée.', 'dialogo', 'U2'));
check('U3: "le musée" passa', val('Le musée.', 'dialogo', 'U3').nao_vistas.length === 0, val('Le musée.', 'dialogo', 'U3'));
check('U1: "le fromage" (U2) é acusado', val('Je mange le fromage.', 'dialogo', 'U1').nao_vistas.join() === 'fromage', val('Je mange le fromage.', 'dialogo', 'U1'));
check('palavra de unidade anterior passa com forma gerada (mange, pains, pommes)', val('Je mange des pains et des pommes.', 'ditado', 'U2').nao_vistas.length === 0, val('Je mange des pains et des pommes.', 'ditado', 'U2'));
check('A2 vê tudo do A1', val('Le musée et le fromage.', 'desafio', 'V1').nao_vistas.length === 0);
check('posição "inicio": cartão da própria unidade ainda não visto', val('Le musée.', { tipo: 'dialogo', posicao: 'inicio' }, 'U3').nao_vistas.includes('musée'));
check('posição número: só os n primeiros cartões', val('Le pain et manger.', { tipo: 'dialogo', posicao: 2 }, 'U1').nao_vistas.join() === 'manger', val('Le pain et manger.', { tipo: 'dialogo', posicao: 2 }, 'U1'));

console.log('== nota de vocabulário (decisões 225 e 253)');
check('diálogo: palavra da nota da U2 conta como vista', val("J'adore le pain.", 'dialogo', 'U2').nao_vistas.length === 0, val("J'adore le pain.", 'dialogo', 'U2'));
check('ditado: a mesma palavra NÃO conta', val("J'adore le pain.", 'ditado', 'U2').nao_vistas.includes('adore'), val("J'adore le pain.", 'ditado', 'U2'));
check('Desafio: a mesma palavra NÃO conta', val("J'adore le pain.", 'desafio', 'U3').nao_vistas.includes('adore'));
check('diálogo antes da nota (U1): não conta', val("J'adore le pain.", 'dialogo', 'U1').nao_vistas.includes('adore'));
check('só o diálogo está em NOTAS_CONTAM_EM', [...V.NOTAS_CONTAM_EM].join() === 'dialogo');

console.log('== exceções de excecoes.json (decisões 232 e 260)');
check('exceção da unidade aceita (délicieux na U2)', val('Le fromage est délicieux.', 'dialogo', 'U2').nao_vistas.length === 0, val('Le fromage est délicieux.', 'dialogo', 'U2'));
check('sem a exceção, délicieux é acusado', val('Le fromage est délicieux.', 'dialogo', 'U2', { palavras_antes_do_cartao: [] }).nao_vistas.includes('délicieux'));
check('exceção não vale em outra unidade (U3)', val('Le fromage est délicieux.', 'dialogo', 'U3').nao_vistas.includes('délicieux'));
check('escopo nivel:A1 vale em qualquer unidade do A1 (euros na U1)', val('Le pain : cinq euros.', 'dialogo', 'U1').nao_vistas.join() === 'cinq', val('Le pain : cinq euros.', 'dialogo', 'U1'));
check('escopo nivel:A1 não vale no A2', val('Dix euros.', 'dialogo', 'V1').nao_vistas.includes('euros'));

console.log('== palavras funcionais');
check('artigos, pronomes, preposições e conjunções passam', val('Je mange le pain et la pomme avec elle, mais il mange du pain.', 'ditado', 'U2').nao_vistas.length === 0,
  val('Je mange le pain et la pomme avec elle, mais il mange du pain.', 'ditado', 'U2'));
check('sem a lista funcional, "avec" seria acusado', V.validarTexto('Le pain avec le pain.', 'ditado', 'U2', mapa, exc, { funcionais: { grupos: [] }, formasExtras: { formas: {} } }).nao_vistas.includes('avec'));
check('o cartão vence a lista: "sur" antes da U3 é não vista', val('Le pain sur la pomme.', 'ditado', 'U2').nao_vistas.includes('sur'));
check('o cartão vence a lista: "sur" na U3 passa', val('Le pain sur la pomme.', 'ditado', 'U3').nao_vistas.length === 0);
check('grupo com lema: "vais" antes do cartão aller é não vista', val('Je vais.', 'dialogo', 'U2').nao_vistas.includes('vais'));
check('grupo com lema: "vais" depois do cartão aller passa', val('Je vais.', 'dialogo', 'U3').nao_vistas.length === 0);
check('lema que não é cartão no mapa (être) vale desde o começo', val('Je suis.', 'dialogo', 'U1').nao_vistas.length === 0);

console.log('== tokenização, incertas e nomes próprios');
check("apóstrofo curvo vira reto (l’eau não quebra)", V.tokenizar('C’est l’heure').map(t => t.forma).join('|') === "c'est|l'heure");
check('partes: hífen e elisão', V.partesDoToken("qu'est-ce").join('|') === "qu'|est|ce");
check('número em algarismo e {placeholder} são ignorados', val('Bonjour {nome}, 12 pains.', 'dialogo', 'U1').nao_vistas.length === 0);
check('nome próprio no meio da frase fica fora do erro', (r => r.nao_vistas.length === 0 && r.nomes_proprios.includes('Paris'))(val('Je mange à Paris.', 'dialogo', 'U1')));
check('nome da lista no começo da frase fica fora do erro', val('Ana mange.', 'dialogo', 'U1').nao_vistas.length === 0);
check('palavra do mapa com maiúscula continua acusada', val('Je mange au Musée.', 'dialogo', 'U1').nao_vistas.includes('musée'));
{
  const r = val('Je mangeais et je mangiais.', 'ditado', 'U1');
  check('forma irregular de verbo visto cai em incertas, não em não vistas', r.incertas.some(x => x.palavra === 'mangiais') && !r.nao_vistas.includes('mangiais'), r);
}
check('forma conhecida do mapa ainda não vista é não vista, não incerta', val('Le voyage.', 'dialogo', 'U1').nao_vistas.includes('voyage'));
{
  let erro = false; try { val('x', 'prova', 'U1'); } catch (e) { erro = true; }
  check('contexto desconhecido dá erro', erro);
  let erro2 = false; try { val('x', 'dialogo', 'U99'); } catch (e) { erro2 = true; }
  check('unidade fora do mapa dá erro', erro2);
}

console.log('== formas geradas');
{
  const f = V.formasGeradas('manger');
  check('verbo -er: presente regular, particípio e mangeons', ['mange', 'manges', 'mangeons', 'mangez', 'mangent', 'mangé'].every(x => f.has(x)));
  check('adjetivo: feminino e plural', ['grande', 'grands', 'grandes'].every(x => V.formasGeradas('grand').has(x)));
  check('alternativas: "le professeur / la professeure" e "un kilo (de)"', V.alternativas('le professeur / la professeure').length === 2 && V.alternativas('un kilo (de)')[0] === 'un kilo de');
}

console.log('== mapa e dados reais');
{
  const mapaReal = M.carregarMapa(), excReal = M.carregarExcecoes();
  const r1 = V.validarTexto('Le pain est délicieux.', 'dialogo', 'A1-5', mapaReal, excReal);
  check('real: délicieux aceito em "Gostos e pedidos no café" (exceção 176)', !r1.nao_vistas.includes('délicieux'), r1);
  const r2 = V.validarTexto('Le pain est délicieux.', 'dialogo', 'A1-12', mapaReal, excReal);
  check('real: délicieux acusado em "Pedir quantidades na feira" (sem exceção ali)', r2.nao_vistas.includes('délicieux'), r2);
  const r3 = V.validarTexto('Ça fait cinq euros.', 'dialogo', 'A1-5', mapaReal, excReal);
  check("real: l'euro vale no A1 inteiro (decisão 260)", !r3.nao_vistas.includes('euros'), r3);
  // Desde a decisão 313, "je vais bien" é cartão de "Cumprimentar e se despedir": "vais" passa a ser vista lá; "veux" (vouloir, de
  // "Verbos muito usados") e "musée" continuam não vistas.
  const r4 = V.validarTexto('Je veux aller au musée.', 'dialogo', 'A1-1', mapaReal, excReal);
  check('real: "veux" e "musée" acusados em "Cumprimentar e se despedir"', r4.nao_vistas.includes('veux') && r4.nao_vistas.includes('musée'), r4);
  const r4b = V.validarTexto('Je vais bien, et vous ?', 'dialogo', 'A1-1', mapaReal, excReal);
  check('real: "Je vais bien, et vous ?" vista no fim de "Cumprimentar e se despedir" (cartões da decisão 313)', r4b.nao_vistas.length === 0 && r4b.incertas.length === 0, r4b);
  const r4c = V.validarTexto('Comment allez-vous ?', 'dialogo', 'A1-1', mapaReal, excReal);
  const r4d = V.validarTexto('Comment allez-vous ?', 'ponto_verificacao_unidade', 'A1-1', mapaReal, excReal);
  check('real: palavra só de nota (exemplos com tradução) conta no diálogo e não na Revisão da unidade (decisões 253, 265 e 274)',
    !V.validarTexto('mademoiselle', 'dialogo', 'A1-1', mapaReal, excReal).nao_vistas.length &&
    V.validarTexto('mademoiselle', 'ponto_verificacao_unidade', 'A1-1', mapaReal, excReal).nao_vistas.includes('mademoiselle'), [r4c, r4d]);
  const d = V.carregarDados();
  const grupos = d.funcionais.grupos;
  check('palavras_funcionais.json: todo grupo tem justificativa', grupos.every(g => typeof g.justificativa === 'string' && g.justificativa.length > 10));
  const lemasNoMapa = new Set(M.unidadesEmOrdem(mapaReal).flatMap(it => (it.unidade.cartoes || []).flatMap(c => V.alternativas(c.palavra))));
  check('palavras_funcionais.json: todo lema é cartão no mapa', grupos.filter(g => g.lema).every(g => lemasNoMapa.has(g.lema)), grupos.filter(g => g.lema && !lemasNoMapa.has(g.lema)).map(g => g.lema));
  check('palavras_funcionais.json: números de 0 a 100 presentes', ['zéro', 'un', 'dix', 'vingt', 'soixante', 'cent'].every(n => grupos.some(g => g.palavras.includes(n))));
  const todasAlt = new Set(M.unidadesEmOrdem(mapaReal).flatMap(it => [...(it.unidade.cartoes || []), ...(it.unidade.notas || []).flatMap(n => (n.palavras || []).map(p => ({ palavra: p })))].flatMap(c => [c.palavra, ...V.alternativas(c.palavra)])));
  const orfas = Object.keys(d.formasExtras.formas).filter(k => !todasAlt.has(k));
  check('formas_extras.json: toda chave é cartão ou palavra de nota do mapa', orfas.length === 0, orfas);
}

console.log('== relatório (fumaça: roda sobre o conteúdo real sem gravar)');
{
  const rel = R.gerarRelatorio({ naoGravar: true });
  const n = Object.values(rel.porSecao).reduce((a, s) => a + s.textos, 0);
  check('relatório lê diálogos, frases, gramáticas, ditados e Desafios', ['Diálogos', 'Frases "Na frase" (como se fossem essenciais)', 'Gramáticas: exercícios', 'Ditados', 'Desafios: texto da tarefa'].every(s => rel.porSecao[s] && rel.porSecao[s].textos > 0), Object.keys(rel.porSecao));
  check('relatório mede mais de 500 textos', n > 500, n);
  check('relatório cita nome do módulo e da unidade', /### A1 M1 "Apresentar-se"/.test(rel.md) && /#### M1\.1 "Cumprimentar e se despedir" \(A1-1\)/.test(rel.md));
}

summary('curriculo palavras vistas');
