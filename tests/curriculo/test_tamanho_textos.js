// Tamanho dos textos da voz da professora (decisão 352): regra em fr/scripts/curriculo_tamanho_textos.js.
// Rodar: node tests/curriculo/test_tamanho_textos.js
'use strict';
const path = require('path');
const { check, summary } = require('../fase-e/harness');
const ROOT = path.resolve(__dirname, '..', '..');
const T = require(path.join(ROOT, 'fr/scripts/curriculo_tamanho_textos.js'));

const pt = s => ({ 'pt-BR': s, en: null });
const x = n => 'a'.repeat(n);

console.log('== limites');
check('limites: abertura 120, painel 110, painel com erro 150, fala final 70, nota 340, com quem 70',
  JSON.stringify(T.LIMITES) === JSON.stringify({ abertura: 120, painel: 110, painelComErro: 150, falaFinal: 70, nota: 340, comQuem: 70 }), T.LIMITES);
check('tags HTML não contam', T.semTags('<b>salut</b> e <strong>coucou</strong>') === 'salut e coucou');

console.log('== textosLongos (casos sintéticos)');
const rascunho = (telas, notas) => ({ licoes: [{ id: 'l', telas }], notas: notas || [] });
check('tudo no limite: nada acusado', T.textosLongos(rascunho([
  { id: 'a', tipo: 'abertura', objetivo: pt(x(120)) },
  { id: 'p', tipo: 'vf', explicacao: pt(x(110)), explicacao_erro: { o: pt(x(40)) } },
  { id: 'f', tipo: 'fim', fala: pt(x(70)) },
], [{ id: 'n', destino: 'nota', texto: pt(x(340)) }])).length === 0);
const longos = T.textosLongos(rascunho([
  { id: 'a', tipo: 'abertura', objetivo: pt(x(121)) },
  { id: 'p', tipo: 'vf', explicacao: pt(x(111)), explicacao_erro: { o: pt(x(40)) } },
  { id: 'f', tipo: 'fim', fala: pt(x(71)) },
], [{ id: 'n', destino: 'nota', texto: pt(x(341)) }, { id: 'pn', destino: 'painel', texto: pt(x(900)) }]));
check('acusa abertura, painel, painel com erro, fala final e nota acima do limite',
  JSON.stringify(longos.map(a => a.tipo).sort()) === JSON.stringify(['abertura', 'falaFinal', 'nota', 'painel', 'painelComErro']), longos);
check('nota que virou painel não conta como nota (o texto dela aparece nos painéis)', !longos.some(a => a.onde === 'pn'));
check('erro conta junto com a explicação (é o que o aluno lê ao errar)',
  T.textosLongos(rascunho([{ id: 'p', tipo: 'vf', explicacao: pt(x(100)), explicacao_erro: { o: pt(x(51)) } }])).some(a => a.tipo === 'painelComErro'));

check('diálogo: a fala da cena conta como abertura e a da tela final do diálogo como fala final (decisão 353)', (() => {
  const a = T.textosLongos(rascunho([{ id: 'c', tipo: 'dialogo_cena', foco: pt(x(121)) }, { id: 'df', tipo: 'dialogo_fim', fala: pt(x(71)) }]));
  return a.length === 2 && a.some(z => z.onde === 'c' && z.tipo === 'abertura') && a.some(z => z.onde === 'df' && z.tipo === 'falaFinal');
})());

check('"sua vez": situação conta como abertura e cada dica como painel (decisão 354)', (() => {
  const a = T.textosLongos(rascunho([{ id: 'p', tipo: 'dialogo_papel', situacao: pt(x(121)), turnos: [{ opcoes: ['a', 'b', 'c'], certa: 0, dicas: { b: pt(x(111)), c: pt(x(20)) } }] }]));
  return a.length === 2 && a.some(z => z.tipo === 'abertura') && a.some(z => z.tipo === 'painel' && z.onde.includes('dica: b'));
})());

check('"com quem" do par informal / formal acima de 70 é acusado; 70 passa (decisão 361)', (() => {
  const a = T.textosLongos(rascunho([{ id: 'p0', tipo: 'cartao', com_quem: pt(x(70)) }, { id: 'p1', tipo: 'cartao', com_quem: pt(x(71)) }]));
  return a.length === 1 && a[0].onde === 'p1' && a[0].tipo === 'comQuem';
})());

console.log('== rascunho real da unidade 1');
const R = require(path.join(ROOT, 'docs/i18n/curriculo/piloto-m1/A1-1/A1-1.json'));
const achados = T.textosLongos(R);
check('A1-1: nenhum texto acima do limite', achados.length === 0, achados);

summary('curriculo tamanho dos textos');
