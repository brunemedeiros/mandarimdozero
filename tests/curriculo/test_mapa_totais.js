// Mapa do currículo em dados (decisões 228, 232 e 259): docs/i18n/curriculo/dados/mapa.json + excecoes.json, contados por
// fr/scripts/curriculo_mapa.js. Confere os totais do 08 v2 aprovado e as regras 12, 13, 14, 16 e a decisão 246.
// Se um número não bater, NÃO ajuste o json para forçar: registre em docs/i18n/curriculo/dados/ACHADOS.md.
// Rodar: node tests/curriculo/test_mapa_totais.js
'use strict';
const fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-e/harness');
const ROOT = path.resolve(__dirname, '..', '..');
const C = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));

const mapa = C.carregarMapa();
const exc = C.carregarExcecoes();
const ids = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/published_ids.json'), 'utf8'));
const [A1, A2] = C.contas(mapa);

console.log('== totais do 08 v2 (seção 1 e 3)');
check('A1: 9 módulos', A1.modulos === 9, A1.modulos);
check('A1: 57 unidades', A1.unidades === 57, A1.unidades);
check('A1: 34 vocabulário + 23 gramática', A1.vocabulario === 34 && A1.gramatica === 23, [A1.vocabulario, A1.gramatica]);
check('A1: 360 cartões', A1.cartoes === 360, A1.cartoes);
check('A1: 713 cartões A/B', A1.ab === 713, A1.ab);
check('A1: cartões por módulo 60/33/50/49/33/29/35/41/30',
  JSON.stringify(A1.porModulo.map(m => m.cartoes)) === JSON.stringify([60, 33, 50, 49, 33, 29, 35, 41, 30]), A1.porModulo.map(m => m.cartoes));
check('A1: ~150 lições (M1 23, M2 15, M3 19, M4 21, M5 14, M6 12, M7 17, M8 17, M9 12)',
  JSON.stringify(A1.porModulo.map(m => m.licoes)) === JSON.stringify([23, 15, 19, 21, 14, 12, 17, 17, 12]), A1.porModulo.map(m => m.licoes));
check('A1: ~30h40 de trilha', A1.tempo === 30 * 60 + 40, C.formatarTempo(A1.tempo));
check('A2: 10 módulos', A2.modulos === 10, A2.modulos);
check('A2: 58 unidades (36 vocabulário + 22 gramática)', A2.unidades === 58 && A2.vocabulario === 36 && A2.gramatica === 22, [A2.unidades, A2.vocabulario, A2.gramatica]);
check('A2: 428 cartões', A2.cartoes === 428, A2.cartoes);
check('A2: 418 novos + 10 publicados', A2.novos === 418 && A2.publicados === 10, [A2.novos, A2.publicados]);
check('A2: 852 cartões A/B', A2.ab === 852, A2.ab);
check('A2: cartões por módulo 47/36/34/47/36/36/48/48/48/48',
  JSON.stringify(A2.porModulo.map(m => m.cartoes)) === JSON.stringify([47, 36, 34, 47, 36, 36, 48, 48, 48, 48]), A2.porModulo.map(m => m.cartoes));
check('A2: ~33h10 de trilha pela regra do 08 (40 min por vocabulário, 25 por gramática)', A2.tempo === 33 * 60 + 10, C.formatarTempo(A2.tempo));
check('A2: tempos por módulo do 08 = regra', A2.porModulo.every((m, i) => m.tempo === mapa.niveis[1].modulos[i].tempo_08_min),
  A2.porModulo.map(m => C.formatarTempo(m.tempo)));
check('A2: ~76 notas (77 com le château, que só entra se couber)', A2.notas === 76 && A2.notasCondicionais === 1, [A2.notas, A2.notasCondicionais]);

console.log('== reconhecimento só (decisões 218 e 255; regra 12)');
{
  const rec = C.unidadesEmOrdem(mapa).flatMap(it => (it.unidade.cartoes || []).filter(c => c.reconhecimento_so).map(c => `${it.unidade.id}:${c.palavra}`));
  check('7 verbos de "Verbos muito usados" (A1-36) + savoir, connaître, dire, donner',
    JSON.stringify(rec) === JSON.stringify(['A1-36:aller', 'A1-36:faire', 'A1-36:vouloir', 'A1-36:pouvoir', 'A1-36:devoir', 'A1-36:voir', 'A1-36:prendre',
      'A2-10:donner', 'A2-17:savoir', 'A2-17:connaître', 'A2-20:dire']), rec);
  const prendre = mapa.niveis[0].modulos[3].unidades[0].cartoes.find(c => c.palavra === 'prendre');
  check('prendre mantém a chave publicada A1-14-v6 (decisão 255)', prendre && prendre.chave === 'A1-14-v6' && prendre.origem === 'publicado');
}

console.log('== regras');
check('regra 14: nenhuma palavra é cartão em duas unidades (fora as aceitas)', C.conferirRegra14(mapa, exc).length === 0, C.conferirRegra14(mapa, exc));
check('regra 13: nenhuma unidade A1 ou A2 acima de 12 palavras (fora conjunto fechado em excecoes.json)',
  C.conferirLimitePalavras(mapa, exc).length === 0, C.conferirLimitePalavras(mapa, exc));
check('regra 13: as liberadas são só os conjuntos fechados A1-3, A1-21, A1-24',
  JSON.stringify(exc.unidades_acima_do_limite.map(e => e.unidade)) === JSON.stringify(['A1-3', 'A1-21', 'A1-24']));
check('regra 12: toda gramática tem versão grátis numa unidade ANTERIOR de vocabulário', C.conferirVersaoGratis(mapa).length === 0, C.conferirVersaoGratis(mapa));
check('regra 16: todo módulo até 3h50, salvo o último de cada nível', C.conferirTetoTempo(mapa).length === 0, C.conferirTetoTempo(mapa));
check('decisão 246: títulos das notas de vocabulário', C.conferirTitulosNotasVocab(mapa).length === 0, C.conferirTitulosNotasVocab(mapa));
check('decisão 246: existe ao menos uma nota de vocabulário (o teste não roda vazio)',
  C.unidadesEmOrdem(mapa).some(it => (it.unidade.notas || []).some(n => n.tipo === 'Vocab')));
check('decisão 238: id_funcao único e em kebab-case', C.conferirIdFuncao(mapa).length === 0, C.conferirIdFuncao(mapa));
check('excecoes.json: toda unidade citada existe no mapa', C.conferirExcecoes(mapa, exc).length === 0, C.conferirExcecoes(mapa, exc));

console.log('== chaves estáveis');
check('chaves: sem repetição e todas no livro-razão fr/published_ids.json', C.conferirChaves(mapa, ids).length === 0, C.conferirChaves(mapa, ids));
check('todo cartão de palavra publicado está no mapa (como chave ou fundida)', C.chavesPublicadasForaDoMapa(mapa, ids).length === 0, C.chavesPublicadasForaDoMapa(mapa, ids));
{
  const pubUnits = new Set(ids.units);
  const vocabPub = C.unidadesEmOrdem(mapa).filter(it => pubUnits.has(it.unidade.id)).map(it => it.unidade.id);
  check('as 30 unidades publicadas estão no mapa', ids.units.every(u => vocabPub.includes(u)), ids.units.filter(u => !vocabPub.includes(u)));
}

console.log('== funções puras (regras isoladas)');
{
  // decisão 260: a versão grátis tem um lugar só (versao_gratis_em na gramática); a unidade que abriga é derivada.
  const abriga = C.gramaticasAbrigadasPor({ niveis: [{ id: 'X', modulos: [{ id: 'm', unidades: [{ id: 'V1', tipo: 'vocabulario' }, { id: 'V2', tipo: 'vocabulario' }, { id: 'G1', tipo: 'gramatica', versao_gratis_em: ['V1', 'V2'] }] }] }] });
  check('versão grátis derivada: unidade abriga a gramática que a cita', JSON.stringify(abriga) === JSON.stringify({ V1: ['G1'], V2: ['G1'] }), abriga);
  check('mapa.json não repete a ligação nas unidades', !JSON.stringify(mapa).includes('abriga_versao_gratis_de'));
}
{
  const voc = (n, extra) => Object.assign({ tipo: 'vocabulario', cartoes: Array.from({ length: n }, (_, i) => ({ palavra: 'p' + i })) }, extra);
  check('lições: 10 palavras = 3 + Revisão', C.licoesDaUnidade(voc(10)) === 4);
  check('lições: 11 palavras = 4 + Revisão', C.licoesDaUnidade(voc(11)) === 5);
  check('lições: gramática não entra na conta', C.licoesDaUnidade({ tipo: 'gramatica' }) === 0);
  check('lições: valor do 08 vence a regra quando existe', C.licoesDaUnidade(voc(11, { licoes_08: 4 })) === 4);
  check('A/B: reconhecimento tem 1 cartão', C.cartoesAB({ cartoes: [{ palavra: 'a' }, { palavra: 'b', reconhecimento_so: true }] }) === 3);
  const m = { niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'u1', cartoes: [{ palavra: 'Le chat' }] }, { id: 'u2', cartoes: [{ palavra: 'le  chat' }] }] }] }] };
  check('regra 14 acusa repetição (maiúscula e espaço não escondem)', C.conferirRegra14(m, {}).length === 1);
  check('regra 14 aceita a repetição registrada', C.conferirRegra14(m, { regra14_repeticoes_aceitas: [{ palavra: 'le chat' }] }).length === 0);
  const g = { niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'g', tipo: 'gramatica', versao_gratis_em: ['v'] }, { id: 'v', tipo: 'vocabulario' }] }] }] };
  check('versão grátis depois da gramática é acusada', C.conferirVersaoGratis(g).length === 1);
  const t = { niveis: [{ id: 'A1', modulos: [{ id: 'a', tempo_08_min: 231, unidades: [] }, { id: 'b', tempo_08_min: 300, unidades: [] }] }] };
  check('teto: 3h51 acusa; o último módulo do nível passa', JSON.stringify(C.conferirTetoTempo(t).map(p => p.modulo)) === '["a"]');
  check('título de nota de vocabulário fora do padrão é acusado',
    C.conferirTitulosNotasVocab({ niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'u', notas: [{ tipo: 'Vocab', titulo: 'Outros traços' }] }] }] }] }).length === 1);
}

summary('curriculo mapa totais');
