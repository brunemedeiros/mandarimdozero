#!/usr/bin/env node
// Validação "só palavras vistas" do rascunho A1-1.json (piloto do currículo, decisões 233, 253, 265 e 266).
// Usa as funções puras de fr/scripts/curriculo_palavras_vistas.js (validarTexto) sobre o mapa.json com a ORDEM DOS CARTÕES DA A1-1
// trocada pela do rascunho (o validador conta os "n primeiros cartões" na ordem do mapa; o rascunho propõe salut logo depois de bonjour).
// Grupos "obrigatório" precisam sair sem palavra não vista (senão o texto é reescrito); grupos "informativo" só listam (frases só exemplo
// e exemplos de nota, com tradução visível, decisão 226; metalinguagem em francês dos Desafios de expressão).
// Uso: node docs/i18n/curriculo/piloto-m1/A1-1/validar.js [--json]
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const R = require('./A1-1.json');

const mapaOriginal = require(path.join(ROOT, 'docs/i18n/curriculo/dados/mapa.json'));
const excecoes = require(path.join(ROOT, 'docs/i18n/curriculo/dados/excecoes.json'));

// Cópia do mapa com os cartões da A1-1 na ordem do rascunho (mesmas palavras, mesmas chaves: o mapa não muda de conteúdo).
const mapa = JSON.parse(JSON.stringify(mapaOriginal));
const u = M.unidadesEmOrdem(mapa).find(it => it.unidade.id === 'A1-1').unidade;
const porChave = Object.fromEntries(u.cartoes.map(c => [c.chave, c]));
u.cartoes = R.cartoes.map(c => porChave[c.chave]);
if (u.cartoes.some(c => !c) || u.cartoes.length !== 10) throw new Error('cartões do rascunho não batem com o mapa');

const posDoCartao = chave => R.cartoes.findIndex(c => c.chave === chave) + 1; // n cartões vistos ao chegar na nota
const frasePorId = id => R.frases_na_frase.find(f => f.id_rascunho === id || f.chave === id) || R.dialogos[0].falas.find(f => f.chave === id);

const casos = [];
const add = (grupo, obrigatorio, onde, fr, contexto, unidade, tirar) => casos.push({ grupo, obrigatorio, onde, fr, contexto, unidade: unidade || 'A1-1', tirar });

// Diálogo e "Você entendeu?" (lição 3, depois dos 10 cartões).
for (const f of R.dialogos[0].falas) add('Diálogo', true, f.chave, f.fr, 'dialogo');
for (const c of R.dialogos[0].check) for (const o of c.opcoes_erradas || []) add('Você entendeu? (opções)', true, c.tipo, o, { tipo: 'exercicio_licao', posicao: 'fim' });

// Frases "Na frase": todas na ficha (informativo); as essenciais também na Revisão da unidade (obrigatório).
for (const f of R.frases_na_frase){
  const id = f.chave === 'nova' ? f.id_rascunho : f.chave;
  add('Frases "Na frase" (ficha)', false, `${id} [${f.papel}]`, f.fr, 'ficha');
  if (f.papel === 'essencial') add('Frases essenciais (Revisão da unidade)', true, id, f.fr, 'ponto_verificacao_unidade');
}

// Notas: exemplos e V/F (fazem parte da nota; tradução visível = regra das frases "Na frase", decisão 253). Informativo.
for (const n of R.notas){
  const pos = n.gancho.afterKey ? { tipo: 'ficha', posicao: posDoCartao(n.gancho.afterKey) } : 'ficha';
  for (const e of n.exemplos) add('Notas (exemplos)', false, n.id, e.fala || e.fr, pos);
  for (const vf of n.vf) add('Notas (V/F da nota)', false, n.id, vf.fr, pos);
}

// V/F da unidade e Revisão da unidade (produção): obrigatório.
for (const vf of R.verdadeiro_falso_da_unidade) if (vf.subject) add('V/F da unidade', true, vf.subject, vf.subject, 'ponto_verificacao_unidade');
for (const it of R.revisao_da_unidade.itens){
  if (it.blocos) add('Revisão da unidade', true, `${it.tipo} ${it.frase}`, it.blocos.concat(it.iscas || []).join(' / '), 'ponto_verificacao_unidade');
  if (it.opcoes && it.tipo === 'cenario') add('Revisão da unidade', true, `cenário ${it.id}`, it.opcoes.map(o => o.fr).join(' / '), 'ponto_verificacao_unidade');
  if (it.tipo === 'lacuna_tocando') add('Revisão da unidade', true, `lacuna ${it.frase}`, it.texto.replace('___', '') + ' / ' + it.opcoes.join(' / '), 'ponto_verificacao_unidade');
}

// Ditados: candidato na posição A1-1 (obrigatório); os publicados do módulo no fim do módulo (A1-g11), informativo.
add('Ditado (candidato)', true, 'candidato', R.ditados.candidato_para_o_modulo.fr, 'ditado');
const DIT = (() => { const s = require('fs').readFileSync(path.join(ROOT, 'fr/dictations.js'), 'utf8'); return Function(s + '; return DICTATIONS;')(); })();
for (const d of DIT.filter(d => d.moduleId === 'A1-m1')) add('Ditados publicados do módulo (fim do módulo, A1-g11)', false, d.id, d.text, 'ditado', 'A1-g11');

// Desafios na posição A1-1 (mais rígido que o fim do módulo): textos que o aluno ouve, lê ou completa. Obrigatório.
const D = R.desafios;
for (const x of D.listen_translate) add('Desafios', true, 'Ouça e traduza', x.fr, 'desafio');
for (const x of D.accent) add('Desafios', true, 'Acentuação', x.texto, 'desafio');
for (const x of D.expression.filter(e => e.exampleText)){
  const tirar = V.tokenizar(x.expression).map(t => t.forma);
  for (const campo of ['exampleText', 'secondExampleText', 'microPrompt']) add('Desafios', true, `Expressão "${x.expression}" ${campo}`, x[campo], 'desafio', null, tirar);
  // Metalinguagem em francês (formato monolíngue do Desafio de expressão): informativo, decisão de formato da dona.
  for (const campo of ['meaningFr', 'question', 'explanationFr']) add('Desafios: metalinguagem em francês', false, `"${x.expression}" ${campo}`, x[campo], 'desafio', null, tirar);
  add('Desafios: metalinguagem em francês', false, `"${x.expression}" options`, x.options.join(' / '), 'desafio', null, tirar);
}

const resultados = casos.map(c => {
  const r = V.validarTexto(c.fr, c.contexto, c.unidade, mapa, excecoes);
  const tirar = new Set(c.tirar || []);
  const nao = r.nao_vistas.filter(p => !p.split(' ').every(x => tirar.has(x)));
  return Object.assign({}, c, { nao_vistas: nao, incertas: r.incertas.filter(i => !tirar.has(i.palavra)), nomes_proprios: r.nomes_proprios });
});

if (process.argv.includes('--json')){ console.log(JSON.stringify(resultados, null, 1)); process.exit(0); }
let falhas = 0;
const grupos = [...new Set(resultados.map(r => r.grupo))];
for (const g of grupos){
  const rs = resultados.filter(r => r.grupo === g);
  const ruins = rs.filter(r => r.nao_vistas.length || r.incertas.length);
  console.log(`\n## ${g} (${rs[0].obrigatorio ? 'obrigatório' : 'informativo'}): ${rs.length} textos, ${ruins.length} com palavra não vista ou incerta`);
  for (const r of ruins){
    console.log(`- ${r.onde}: "${r.fr}" -> não vistas: ${r.nao_vistas.join(', ') || '(nenhuma)'}${r.incertas.length ? '; incertas: ' + r.incertas.map(i => `${i.palavra} (${i.lema}?)`).join(', ') : ''}`);
    if (r.obrigatorio && r.nao_vistas.length) falhas++;
  }
}
console.log(`\nTotal: ${resultados.length} textos; ${falhas} falha(s) em grupo obrigatório.`);
process.exit(falhas ? 1 : 0);
