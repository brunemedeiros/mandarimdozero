#!/usr/bin/env node
// Validação do rascunho A1-9.json ("Dizer de onde é, onde mora e que línguas fala", decisão 359; mesmo modelo dos pilotos A1-1 e A1-2).
// 1) Coerência com o mapa (fonte única de ordem, lições, notas e exemplos: docs/i18n/curriculo/dados/mapa.json) e regras das telas
//    (fr/scripts/curriculo_licao_curta.js).
// 2) "Só palavras vistas" (fr/scripts/curriculo_palavras_vistas.js) nas falas, nos exercícios, nas frases e nos exemplos das notas.
// Uso: node docs/i18n/curriculo/piloto-m1/A1-9/validar.js [--json]
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const P = require(path.join(ROOT, 'fr/scripts/curriculo_papel.js'));
const L = require(path.join(ROOT, 'fr/scripts/curriculo_licao_curta.js'));
const R = require('./A1-9.json');
const UID = 'A1-9';

const mapa = M.carregarMapa();
const excecoes = M.carregarExcecoes();
const u = M.indicePorId(mapa)[UID].unidade;

// ---------------------------------------------------------------- 1) coerência com o mapa e regras das telas
const coerencia = [];
const confere = (ok, o) => { if (!ok) coerencia.push(o); };
confere(JSON.stringify(R.cartoes.map(c => [c.fr, c.chave])) === JSON.stringify(u.cartoes.map(c => [c.palavra, c.chave])), 'cartões do rascunho fora da ordem do mapa');
const idLicao = Object.fromEntries(u.licoes.map(l => [l.licao, l.id]));
const numLicao = Object.fromEntries(u.licoes.map(l => [l.id, l.licao]));
confere(R.cartoes.every((c, i) => c.licao === idLicao[u.cartoes[i].licao]), 'lição de algum cartão diverge do mapa');
confere(JSON.stringify(R.licoes.filter(l => l.id !== 'checkpoint').map(l => [l.id, l.titulo['pt-BR']])) === JSON.stringify(u.licoes.map(l => [l.id, l.titulo])), 'ids ou títulos das lições divergem do mapa');
confere(JSON.stringify(R.notas.map(n => n.titulo['pt-BR'])) === JSON.stringify(u.notas.map(n => n.titulo)), 'notas fora da ordem do mapa');
R.notas.forEach((n, i) => {
  const m = u.notas[i] || {};
  confere(JSON.stringify(n.exemplos.map(e => [e.fr, e['pt-BR']])) === JSON.stringify((m.exemplos || []).map(e => [e.fr, e['pt-BR']])), `exemplos da nota "${m.titulo}" divergem do mapa`);
  confere(n.momento.depois_do_cartao === (m.momento || {}).depois_de && n.momento.licao === idLicao[(m.momento || {}).licao], `momento da nota "${m.titulo}" diverge do mapa`);
  if (n.destino === 'nota') confere(n.vf && n.vf.length >= 1, `nota "${m.titulo}" sem V/F (regra 4)`);
  confere((n.destino === 'painel') === (m.forma === 'painel'), `nota "${m.titulo}": painel no rascunho e no mapa divergem`);
});
confere(JSON.stringify(R.dialogos.map(d => [d.titulo['pt-BR'], numLicao[d.licao]])) === JSON.stringify((u.dialogos || []).map(d => [d.titulo, d.licao])), 'diálogos do rascunho (título ou lição) divergem do mapa');
confere(M.conferirLicoesDaUnidade(mapa).length === 0, 'conferência de lições do mapa acusou problema');
confere(u.cartoes.every((c, i, a) => i === 0 || a[i - 1].licao <= c.licao), 'cartões do mapa fora da ordem das lições');
// Frases publicadas: o papel marcado no frases_na_frase.json tem de bater; sem marca, o papel daqui é proposta.
const marcadas = P.carregarFrases();
const semMarca = [];
for (const f of R.frases_na_frase.filter(f => f.chave !== 'nova')){
  const marcado = P.papelDaFrase(marcadas, f.chave);
  if (marcado) confere(marcado === f.papel, `papel de ${f.chave} diverge do frases_na_frase.json`); else semMarca.push(`${f.chave} (${f.papel})`);
}
for (const problema of L.conferirTelas(R)) confere(false, problema);

// ---------------------------------------------------------------- 2) só palavras vistas
const casos = [];
const add = (grupo, obrigatorio, onde, fr, contexto, mapaDoCaso) => casos.push({ grupo, obrigatorio, onde, fr, contexto, mapa: mapaDoCaso || mapa });
for (const c of L.textosDasTelas(R, M, mapa, UID)) add(c.grupo, c.obrigatorio, c.onde, c.fr, c.contexto, c.mapa);
const posDoCartao = palavra => u.cartoes.findIndex(c => c.palavra === palavra) + 1;
for (const f of R.frases_na_frase){
  add('Frases "Na frase" (ficha, depois do cartão)', false, `${f.chave === 'nova' ? f.id_rascunho : f.chave} [${f.papel}]`, f.fr, { tipo: 'ficha', posicao: posDoCartao(f.ilustra) });
}
for (const n of R.notas) for (const e of n.exemplos) add('Notas (exemplos)', false, n.id, e.fr, { tipo: 'ficha', posicao: posDoCartao(n.momento.depois_do_cartao) });

const resultados = casos.map(c => Object.assign({}, c, V.validarTexto(c.fr, c.contexto, UID, c.mapa, excecoes)));
if (process.argv.includes('--json')){ console.log(JSON.stringify({ coerencia, resultados: resultados.map(({ mapa: _m, ...r }) => r) }, null, 1)); process.exit(0); }
console.log(`## Coerência com o mapa.json e regras das telas: ${coerencia.length ? coerencia.length + ' problema(s)' : 'ok'}`);
coerencia.forEach(p => console.log('- ' + p));
if (semMarca.length) console.log(`(papel proposto, ainda sem marca no frases_na_frase.json: ${semMarca.join(', ')})`);
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
