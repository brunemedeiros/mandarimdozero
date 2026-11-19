#!/usr/bin/env node
// Validação do rascunho A1-g1.json ("Gramática: être e avoir", decisão 373; a segunda gramática no formato da lição curta, no molde da A1-g12).
// 1) Coerência com o mapa (docs/i18n/curriculo/dados/mapa.json: unidade de gramática, nome e posição) e regras das telas
//    (fr/scripts/curriculo_licao_curta.js).
// 2) "Só palavras vistas" (fr/scripts/curriculo_palavras_vistas.js) nos exercícios e nos exemplos das explicações: na gramática,
//    vale tudo o que veio antes da unidade (ela não tem cartões).
// Uso: node docs/i18n/curriculo/piloto-m1/A1-g1/validar.js [--json]
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const L = require(path.join(ROOT, 'fr/scripts/curriculo_licao_curta.js'));
const R = require('./A1-g1.json');
const UID = 'A1-g1';

const mapa = M.carregarMapa();
const excecoes = M.carregarExcecoes();
const it = M.indicePorId(mapa)[UID];
const u = it.unidade;

// ---------------------------------------------------------------- 1) coerência com o mapa e regras das telas
const coerencia = [];
const confere = (ok, o) => { if (!ok) coerencia.push(o); };
confere(u.tipo === 'gramatica' && R.unidade.tipo === 'gramatica', 'a unidade não é de gramática no mapa ou no rascunho');
confere(u.nome === R.unidade.titulo['pt-BR'], `nome diverge do mapa: "${u.nome}" x "${R.unidade.titulo['pt-BR']}"`);
confere(it.posicao === R.unidade.posicao, `posição diverge do mapa: ${it.posicao} x ${R.unidade.posicao}`);
confere(R.licoes.length === 1 && R.licoes[0].tipo === 'gramatica', 'a gramática simples fica numa lição só (decisão 365)');
confere(!R.cartoes.length && !R.dialogos.length, 'gramática sem cartões e sem diálogo (decisão 365)');
for (const problema of L.conferirTelas(R)) confere(false, problema);

// ---------------------------------------------------------------- 2) só palavras vistas
const casos = L.textosDasTelas(R, M, mapa, UID).map(c => Object.assign({}, c));
for (const n of R.notas) for (const e of n.exemplos) casos.push({ grupo: 'Explicações (exemplos)', obrigatorio: true, onde: n.id, fr: e.fr, contexto: { tipo: 'ficha', posicao: 'fim' }, mapa });
for (const t of R.licoes[0].telas.filter(t => t.tipo === 'fim')) for (const x of t.resumo) casos.push({ grupo: 'Tela final (resumo)', obrigatorio: true, onde: t.id, fr: x.fr, contexto: { tipo: 'ficha', posicao: 'fim' }, mapa });

const resultados = casos.map(c => Object.assign({}, c, V.validarTexto(c.fr, c.contexto, UID, c.mapa, excecoes)));
if (process.argv.includes('--json')){ console.log(JSON.stringify({ coerencia, resultados: resultados.map(({ mapa: _m, ...r }) => r) }, null, 1)); process.exit(0); }
console.log(`## Coerência com o mapa.json e regras das telas: ${coerencia.length ? coerencia.length + ' problema(s)' : 'ok'}`);
coerencia.forEach(p => console.log('- ' + p));
let falhas = coerencia.length;
for (const g of [...new Set(resultados.map(r => r.grupo))]){
  const rs = resultados.filter(r => r.grupo === g);
  const ruins = rs.filter(r => r.nao_vistas.length || r.incertas.length);
  console.log(`\n## ${g} (${rs[0].obrigatorio ? 'obrigatório' : 'informativo'}): ${rs.length} textos, ${ruins.length} com palavra não vista ou incerta`);
  for (const r of ruins){
    console.log(`- ${r.onde}: "${r.fr}" -> não vistas: ${r.nao_vistas.join(', ') || '(nenhuma)'}${r.incertas.length ? '; incertas: ' + r.incertas.map(i => `${i.palavra} (${i.lema}?)`).join(', ') : ''}`);
    if (r.obrigatorio && r.nao_vistas.length) falhas++;
  }
}
console.log(`\nTotal: ${resultados.length} textos; ${falhas} falha(s) (coerência + grupos obrigatórios).`);
process.exit(falhas ? 1 : 0);
