// Lição curta: conferência das telas e textos para o validador (fr/scripts/curriculo_licao_curta.js; regra 17, decisões 338 a 356).
// Rodar: node tests/curriculo/test_licao_curta.js
'use strict';
const path = require('path');
const { check, summary } = require('../fase-e/harness');
const ROOT = path.resolve(__dirname, '..', '..');
const L = require(path.join(ROOT, 'fr/scripts/curriculo_licao_curta.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));

const pt = s => ({ 'pt-BR': s, en: null });
const copia = o => JSON.parse(JSON.stringify(o));

// Rascunho mínimo e válido: uma lição de cartões e uma de diálogo.
const DLG = 'De manhã, A encontra B.';
const base = {
  cartoes: [{ fr: 'salut', licao: 'l1' }, { fr: 'merci', licao: 'l1' }],
  frases_na_frase: [{ fr: 'Merci !' }],
  notas: [{ id: 'n1', destino: 'nota', momento: { licao: 'l1', depois_do_cartao: 'salut' }, texto: pt('Nota curta.') }],
  dialogos: [{ titulo: pt(DLG), licao: 'l2', falas: [{ falante: 'A', fr: 'Salut !' }, { falante: 'B', fr: 'Merci !' }] }],
  licoes: [
    { id: 'l1', inclui_dialogo: false, telas: [
      { id: 'a', tipo: 'abertura', objetivo: pt('Vamos lá?') },
      { id: 'c1', tipo: 'cartao', cartao: 'salut' },
      { id: 'n', tipo: 'nota', nota: 'n1' },
      { id: 'x1', tipo: 'complete', antes: '', depois: ' !', opcoes: ['Salut', 'Salu'], resposta: 'Salut', frase_completa: 'Salut !', distrator: 'grafia', explicacao: pt('ok') },
      { id: 'c2', tipo: 'cartao', cartao: 'merci' },
      { id: 'x2', tipo: 'complete', antes: '', depois: ' !', opcoes: ['Merci', 'Salut'], resposta: 'Merci', frase_completa: 'Merci !', distrator: 'outra palavra', explicacao: pt('ok') },
      { id: 'f', tipo: 'frase', frase: 'Merci !' },
      { id: 'o', tipo: 'ouvir_escolher', audio: 'gé', opcoes: ['G', 'J'], resposta: 'G', explicacao: pt('ok') },
      { id: 'd', tipo: 'digitar', audio: 'A, N, A', resposta: 'Ana', explicacao: pt('ok') },
      { id: 'z', tipo: 'fim' } ] },
    { id: 'l2', tipo: 'dialogos', inclui_dialogo: true, telas: [
      { id: 'd1', tipo: 'dialogo_cena', dialogo: DLG, foco: pt('Repare.') },
      { id: 'd2', tipo: 'dialogo_ouvir', dialogo: DLG, opcoes: [pt('a'), pt('b')], resposta: 0, explicacao: pt('ok') },
      { id: 'd3', tipo: 'dialogo_ler', dialogo: DLG },
      { id: 'd4', tipo: 'dialogo_vf', dialogo: DLG, fala: 0, resposta: true, explicacao: pt('ok') },
      { id: 'd5', tipo: 'dialogo_montar', dialogo: DLG, distratores: { 0: { texto: 'Salu !', tipo: 'grafia' }, 1: { texto: 'De rien !', tipo: 'registro' } }, explicacao: pt('ok') },
      { id: 'd6', tipo: 'dialogo_lacuna', dialogo: DLG, fala: 1, antes: '', depois: ' !', opcoes: ['Merci', 'Mersi'], resposta: 'Merci', explicacao: pt('ok') },
      { id: 'd7', tipo: 'dialogo_ordenar', dialogo: DLG, explicacao: pt('ok') },
      { id: 'd8', tipo: 'dialogo_entendeu', dialogo: DLG, opcoes: [pt('a'), pt('b')], resposta: 1, explicacao: pt('ok') },
      { id: 'd9', tipo: 'dialogo_papel', dialogo: DLG, situacao: pt('Sua vez.'), outro_falante: 'A',
        turnos: [{ outro: { fr: 'Salut !' } }, { pedido: pt('Responda.'), opcoes: ['Salut !', 'Bonjour, madame.', 'De rien !'], certa: 0, dicas: { 'Bonjour, madame.': pt('x'), 'De rien !': pt('y') } }], explicacao: pt('ok') },
      { id: 'd10', tipo: 'dialogo_fim', dialogo: DLG, fala: pt('Parabéns!'), frases: [0] } ] },
  ],
};
const problemas = r => L.conferirTelas(r);
const acusa = (mudar, trecho) => { const r = copia(base); mudar(r); return problemas(r).some(p => p.includes(trecho)); };
const tela = (r, id) => r.licoes.flatMap(l => l.telas).find(t => t.id === id);

console.log('== conferirTelas: rascunho válido');
check('rascunho mínimo válido: nenhum problema', problemas(base).length === 0, problemas(base));

console.log('== conferirTelas: cada regra acusa o erro dela');
check('cartão fora da ordem', acusa(r => r.licoes[0].telas.reverse(), 'telas de cartão fora da ordem'));
check('nota antes do gatilho (regra 4)', acusa(r => { const t = r.licoes[0].telas; t.splice(1, 0, t.splice(2, 1)[0]); }, 'nota antes do gatilho'));
check('"Complete" sem alternar grafia e outra palavra (decisão 342)', acusa(r => { tela(r, 'x2').distrator = 'grafia'; }, 'não alternam'));
check('"Complete" com frase diferente das partes', acusa(r => { tela(r, 'x1').frase_completa = 'Salut ?'; }, 'frase completa diferente'));
check('"ouvir e escolher" com resposta fora das opções', acusa(r => { tela(r, 'o').resposta = 'K'; }, 'resposta fora das opções'));
check('"digitar" sem resposta', acusa(r => { tela(r, 'd').resposta = ''; }, '"digitar" sem áudio ou sem resposta'));
check('lição de diálogo fora da ordem das etapas', acusa(r => { const t = r.licoes[1].telas; t.push(t.shift()); }, 'telas fora da ordem'));
check('montar sem distrator para uma fala', acusa(r => { delete tela(r, 'd5').distratores[1]; }, 'falta um distrator'));
check('lacuna que não reconstrói a fala', acusa(r => { tela(r, 'd6').depois = ' ?'; }, 'lacuna não reconstrói'));
check('"sua vez" com opção errada sem dica', acusa(r => { delete tela(r, 'd9').turnos[1].dicas['De rien !']; }, 'cada opção errada precisa de uma dica'));
check('nota marcada como painel sem tela de exercício', acusa(r => { r.notas.push({ id: 'n2', destino: 'painel', paineis: ['nao-existe'], texto: pt('x') }); }, 'painel sem tela'));
check('"Monte a frase" com tu e vous sem registro na tradução é acusado', (() => {
  const base = { id: 'mx', tipo: 'montar', traducao: pt('O que você faz da vida?'), pecas: ['Tu', 'fais', 'quoi', '?', 'vous'], resposta: ['Tu', 'fais', 'quoi', '?'] };
  const comTelaMontar = extra => acusa(r => { (r.licoes[0].telas || []).push(Object.assign({}, base, extra)); }, 'sem dizer o registro');
  return comTelaMontar({}) && !comTelaMontar({ traducao: pt('O que você faz da vida? (informal)') });
})());
check('texto do erro que repete o título do painel é acusado', acusa(r => { const t = (r.licoes[0].telas || []).find(x => x.opcoes) || tela(r, 'f'); t.explicacao_erro = { x: pt('Quase lá! Tente de novo.') }; }, 'repete o título do painel'));
check('rótulo "Pergunta" em cartão ou frase é acusado (decisão 361)', acusa(r => { r.cartoes[0].papel_na_funcao = pt('Pergunta'); }, 'rótulo de pergunta')
  && acusa(r => { tela(r, 'f').papel = pt('Pergunta'); }, 'rótulo de pergunta'));
check('cartão seguido de outro item novo sem exercício (decisão 362)', acusa(r => { r.licoes[0].telas = r.licoes[0].telas.filter(x => !['n', 'x1'].includes(x.id)); r.notas = []; }, 'sem exercício entre eles'));
check('nota entre dois itens novos não conta como exercício (decisão 362)', acusa(r => { r.licoes[0].telas = r.licoes[0].telas.filter(x => x.id !== 'x1'); }, 'sem exercício entre eles'));
check('V/F sem a frase do painel (o painel toca o áudio dela)', acusa(r => { r.licoes[0].telas.splice(1, 0, { id: 'v0', tipo: 'vf', fr: 'salut', afirmacao: pt('x'), resposta: true, explicacao: pt('ok') }); }, 'V/F sem a frase e a tradução do painel'));
check('resposta certa sempre na mesma posição é acusada (decisão 368)', acusa(r => {
  const t = r.licoes[0].telas; t.splice(t.length - 1, 0, { id: 'f1', tipo: 'funcao', pergunta: pt('?'), opcoes: ['Salut !', 'Merci !'], resposta: 'Salut !', explicacao: pt('ok') });
  tela(r, 'x2').opcoes = ['Merci', 'Salut']; tela(r, 'o').opcoes = ['G', 'J']; tela(r, 'x1').opcoes = ['Salut', 'Salu']; }, 'sempre na posição'));
check('abertura com a linha do tamanho é acusada (decisão 370)', acusa(r => { tela(r, 'a').tamanho = pt('4 cartões · cerca de 3 minutos'); }, 'não mostra o tamanho'));
check('texto longo demais (decisão 352)', acusa(r => { tela(r, 'a').objetivo = pt('a'.repeat(121)); }, 'texto longo demais'));
check('inclui_dialogo errado', acusa(r => { r.licoes[0].inclui_dialogo = true; }, 'inclui_dialogo não bate'));

console.log('== par informal / formal em duas telas e "Relacione os pares" (decisão 360)');
{
  const comPar = r => {
    r.cartoes.push({ fr: 'tu / vous', licao: 'l1' });
    const t = r.licoes[0].telas; const fim = t.pop();
    t.push({ id: 'p0', tipo: 'cartao', cartao: 'tu / vous', forma: 0, traducao: pt('você'), registro: 'informal' },
      { id: 'pv', tipo: 'vf', fr: 'tu', afirmacao: pt('Para um amigo.'), resposta: true, frase_do_painel: 'tu', traducao_do_painel: pt('você'), explicacao: pt('ok') },
      { id: 'p1', tipo: 'cartao', cartao: 'tu / vous', forma: 1, traducao: pt('o senhor'), registro: 'formal' },
      { id: 'rel', tipo: 'relacionar', pares: [['tu', 'você (informal)'], ['vous', 'o senhor (formal)'], ['salut', 'oi']], explicacao: pt('ok') }, fim);
  };
  const r = copia(base); comPar(r);
  check('cartão em duas telas (forma 0 e 1) e "Relacione" válidos: nenhum problema', problemas(r).length === 0, problemas(r));
  check('cartão em duas telas sem o registro é acusado', acusa(x => { comPar(x); delete tela(x, 'p1').registro; }, 'numa tela só ou em duas'));
  check('formas fora de ordem (formal antes do informal) são acusadas', acusa(x => { comPar(x); tela(x, 'p0').forma = 1; tela(x, 'p1').forma = 0; }, 'numa tela só ou em duas'));
  check('registro diferente de informal ou formal é acusado (decisão 361)', acusa(x => { comPar(x); tela(x, 'p1').registro = 'formel'; }, 'registro deve ser informal ou formal'));
  check('"vocês" (traducao_plural) na forma informal é acusado', acusa(x => { comPar(x); tela(x, 'p0').traducao_plural = pt('vocês'); }, 'só vai na forma formal'));
  check('tradução na tela: registro entre parênteses e, no formal, o "vocês" depois de "ou" (decisão 361)',
    L.traducaoNaTela({ traducao: pt('Qual é a sua nacionalidade?'), registro: 'informal' }) === 'Qual é a sua nacionalidade? (informal)'
    && L.traducaoNaTela({ traducao: pt('Qual é a sua nacionalidade?'), registro: 'formal', traducao_plural: pt('Qual é a nacionalidade de vocês?') })
      === 'Qual é a sua nacionalidade? (formal) ou Qual é a nacionalidade de vocês?'
    && L.traducaoNaTela({ traducao: pt('você'), registro: 'informal' }, 'en') === null);
  check('"Relacione" com 2 pares é acusado', acusa(x => { comPar(x); tela(x, 'rel').pares.pop(); }, '"Relacione" com menos de 3 pares'));
  check('"Relacione" com tradução repetida é acusado', acusa(x => { comPar(x); tela(x, 'rel').pares[1][1] = 'você (informal)'; }, 'item repetido'));
}

console.log('== lição de gramática (decisão 365)');
{
  const gram = () => ({ cartoes: [], dialogos: [], frases_na_frase: [],
    notas: [{ id: 'g1', destino: 'nota', momento: { licao: 'lg' }, texto: pt('Explicação curta.'), exemplos: [] }],
    licoes: [{ id: 'lg', tipo: 'gramatica', inclui_dialogo: false, telas: [
      { id: 'a', tipo: 'abertura', objetivo: pt('Vamos lá?') },
      { id: 'n', tipo: 'nota', nota: 'g1' },
      { id: 'c', tipo: 'classificar', fr: 'Tu parles anglais ?', pergunta: pt('Qual estrutura?'), opcoes: ['Entonação', 'Inversão'], resposta: 'Entonação', traducao_do_painel: pt('Você fala inglês?'), explicacao: pt('ok') },
      { id: 'z', tipo: 'fim', resumo: [{ fr: 'Tu parles anglais ?', 'pt-BR': 'Você fala inglês?' }] } ] }] });
  const acusaG = (mudar, trecho) => { const r = gram(); mudar(r); return problemas(r).some(p => p.includes(trecho)); };
  check('gramática mínima válida: nota sem gatilho, "classificar" e fim com resumo', problemas(gram()).length === 0, problemas(gram()));
  check('explicação de gramática sem exercício logo depois é acusada', acusaG(r => { r.licoes[0].telas.splice(2, 1); }, 'precisa de um exercício logo depois'));
  check('nota sem gatilho fora de uma lição de gramática é acusada', acusaG(r => { delete r.licoes[0].tipo; }, 'nota sem gatilho fora de uma lição de gramática'));
  check('"classificar" com resposta fora das opções é acusado', acusaG(r => { r.licoes[0].telas[2].resposta = 'Est-ce que'; }, '"classificar"'));
  check('fim da gramática sem resumo é acusado', acusaG(r => { delete r.licoes[0].telas[3].resumo; }, 'sem o resumo'));
  check('gramática com cartão é acusada', acusaG(r => { r.cartoes.push({ fr: 'oui', licao: 'lg' }); r.licoes[0].telas.splice(1, 0, { id: 'k', tipo: 'cartao', cartao: 'oui' }); }, 'gramática não tem cartão'));
  const RG = require(path.join(ROOT, 'docs/i18n/curriculo/piloto-m1/A1-g12/A1-g12.json'));
  check('rascunho real da unidade 4 (A1-g12): nenhum problema nas telas', L.conferirTelas(RG).length === 0, L.conferirTelas(RG));
  const casosG = L.textosDasTelas(RG, M, M.carregarMapa(), 'A1-g12');
  check('textos da gramática no fim da posição (vale tudo o que veio antes) e com a frase do "classificar"',
    casosG.every(c => c.contexto.posicao === 'fim') && casosG.some(c => c.fr === 'Parlez-vous portugais ?') && casosG.some(c => c.fr === 'Parlez-vous français ?'));
}

console.log('== destaque do que ficou diferente no "Monte a frase" (decisão 366)');
{
  const certa = ['Est-ce', 'que', 'vous', 'habitez', 'au', 'Brésil', '?'];
  const marcadas = montada => L.diferencasDaResposta(certa, montada).map((x, k) => x ? certa[k] : null).filter(Boolean);
  check('esqueceu o "?": só o "?" fica em destaque', JSON.stringify(marcadas(certa.slice(0, 6))) === JSON.stringify(['?']), marcadas(certa.slice(0, 6)));
  check('resposta certa: nada em destaque', marcadas(certa).length === 0);
  check('duas peças trocadas de lugar: uma delas em destaque', marcadas(['Est-ce', 'que', 'habitez', 'vous', 'au', 'Brésil', '?']).length === 1);
  check('peça errada no lugar da certa: a certa em destaque', JSON.stringify(marcadas(['Est-ce', 'que', 'vous', 'habitez', 'en', 'Brésil', '?'])) === JSON.stringify(['au']));
  check('a função não depende de nada de fora (a maquete embute o código dela)', (() => { const f = new Function('return ' + L.diferencasDaResposta.toString())(); return JSON.stringify(f(['a', 'b'], ['a'])) === '[false,true]'; })());
}

console.log('== todos os rascunhos do piloto sem problema nas telas');
for (const u of ['A1-1', 'A1-2', 'A1-9', 'A1-g12', 'A1-3', 'A1-g1', 'A1-22', 'A1-g11']){
  const R = require(path.join(ROOT, `docs/i18n/curriculo/piloto-m1/${u}/${u}.json`));
  check(`rascunho ${u}: nenhum problema nas telas`, L.conferirTelas(R).length === 0, L.conferirTelas(R));
}

console.log('== "Relacione": nenhuma tradução na linha da sua frase (decisão 369)');
{
  const rels = ['A1-1', 'A1-2', 'A1-9', 'A1-g12', 'A1-3', 'A1-22', 'A1-g11'].flatMap(u => require(path.join(ROOT, `docs/i18n/curriculo/piloto-m1/${u}/${u}.json`)).licoes.flatMap(l => l.telas || []).filter(t => t.tipo === 'relacionar'));
  const lado = rels.filter(t => L.ordemDaDireita(t.pares).some((v, k) => v === k)).map(t => t.id);
  check(`"Relacione" das unidades 1 a 5, 7 e 8 (${rels.length}): nenhum par na mesma linha`, rels.length > 0 && lado.length === 0, lado);
  check('a ordem da direita tem todos os pares, uma vez cada', rels.every(t => JSON.stringify([...L.ordemDaDireita(t.pares)].sort((a, b) => a - b)) === JSON.stringify(t.pares.map((_, k) => k))));
  check('2 pares: trocados de lugar', JSON.stringify(L.ordemDaDireita([['a', '1'], ['b', '2']])) === '[1,0]');
}
check('nota com gatilho num cartão de lição anterior passa (decisão 369)', (() => {
  const r = copia(base); r.licoes.splice(1, 0, { id: 'lp', tipo: 'pratica', inclui_dialogo: false, telas: [
    { id: 'pa', tipo: 'abertura', objetivo: pt('Vamos?') }, { id: 'pn', tipo: 'nota', nota: 'n9' },
    { id: 'pv', tipo: 'vf', fr: 'salut', afirmacao: pt('x'), resposta: true, frase_do_painel: 'salut', traducao_do_painel: pt('oi'), explicacao: pt('ok') }, { id: 'pz', tipo: 'fim' } ] });
  r.notas.push({ id: 'n9', destino: 'nota', momento: { licao: 'lp', depois_do_cartao: 'merci' }, texto: pt('Nota.') });
  return !problemas(r).some(p => p.includes('nota antes do gatilho'));
})());

console.log('== nota com formas: exemplo para cada forma e nenhum exemplo de fora (decisão 374)');
{
  const comFormas = (formas, exemplos) => { const r = copia(base); Object.assign(r.notas[0], { formas, exemplos: exemplos.map(fr => ({ fr, 'pt-BR': 'x' })) }); return problemas(r); };
  check('formas todas com exemplo: nada acusado', comFormas(['nous avons', 'ils ont'], ['Nous avons vingt ans.', 'Ils ont dix ans.']).length === 0);
  check('forma sem frase de exemplo é acusada', comFormas(['nous avons', 'vous avez', 'ils ont'], ['Nous avons vingt ans.', 'Ils ont dix ans.']).some(p => p.includes('"vous avez" não tem frase de exemplo')));
  check('exemplo de outro verbo é acusado (Ils sont na nota de avoir)', comFormas(['nous avons', 'ils ont'], ['Nous avons vingt ans.', 'Ils ont dix ans.', 'Ils sont de Paris.']).some(p => p.includes('"Ils sont de Paris." não usa nenhuma forma')));
}

console.log('== embaralhar peças e falas (decisão 363)');
{
  const naOrdem = (pecas, resposta) => { const lidas = []; for (const p of pecas) if (lidas.length < resposta.length && p === resposta[lidas.length]) lidas.push(p); return lidas.length === resposta.length; };
  const montar = ['A1-1', 'A1-2', 'A1-9', 'A1-g11'].flatMap(u => require(path.join(ROOT, `docs/i18n/curriculo/piloto-m1/${u}/${u}.json`)).licoes.flatMap(l => l.telas || []).filter(t => t.tipo === 'montar'));
  const ruins = montar.filter(t => naOrdem(L.embaralharPecas(t.pecas, t.resposta), t.resposta)).map(t => t.id);
  check(`"Monte a frase" das unidades 1 a 3 e 8 (${montar.length}): as peças certas nunca aparecem na ordem da resposta`, montar.length > 0 && ruins.length === 0, ruins);
  check('as peças embaralhadas são as mesmas (nada some nem duplica)', montar.every(t => JSON.stringify([...L.embaralharPecas(t.pecas, t.resposta)].sort()) === JSON.stringify([...t.pecas].sort())));
  check('mesma tela, mesma ordem (determinístico)', montar.every(t => JSON.stringify(L.embaralharPecas(t.pecas, t.resposta)) === JSON.stringify(L.embaralharPecas(t.pecas, t.resposta))));
  check('peças só da resposta, com palavra repetida, também saem fora de ordem', !naOrdem(L.embaralharPecas(['Je', 'suis', 'de', 'Rio', 'et', 'de', 'Paris'], ['Je', 'suis', 'de', 'Rio', 'et', 'de', 'Paris']), ['Je', 'suis', 'de', 'Rio', 'et', 'de', 'Paris']));
  check('falas do "Coloque na ordem": nunca na ordem original, de 2 a 8 falas', [2, 3, 4, 5, 6, 7, 8].every(n => { const p = L.embaralharIndices(n, 'diálogo ' + n); return p.some((v, k) => v !== k) && [...p].sort((a, b) => a - b).every((v, k) => v === k); }));
}

console.log('== textosDasTelas e posição (mapa real, unidade 1)');
{
  const mapa = M.carregarMapa();
  const R1 = require(path.join(ROOT, 'docs/i18n/curriculo/piloto-m1/A1-1/A1-1.json'));
  check('rascunho real da unidade 1: nenhum problema nas telas', L.conferirTelas(R1).length === 0, L.conferirTelas(R1));
  const casos = L.textosDasTelas(R1, M, mapa, 'A1-1');
  check('textos das telas da unidade 1 incluem falas dos diálogos e exercícios', casos.some(c => c.grupo.startsWith('Diálogo')) && casos.some(c => c.grupo === 'Exercícios das telas'));
  check('distrator de grafia não vai para o validador (é errado de propósito)', !casos.some(c => c.fr === 'Salu, Hugo ! Ça va ?' || c.fr === 'Salu'));
  check('fim da lição 1 da unidade 1 = 4 cartões vistos', L.posicaoNoFimDaLicao(M, mapa, 'A1-1', 1).posicao === 4);
  check('última lição = fim da unidade', L.posicaoNoFimDaLicao(M, mapa, 'A1-1', 6).posicao === 'fim');
}

summary('curriculo lição curta');
