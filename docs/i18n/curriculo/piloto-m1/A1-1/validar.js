#!/usr/bin/env node
// Validação do rascunho A1-1.json (piloto do currículo; unidade polida pela dona, decisões 311 a 320; validador das decisões 233, 253 e 265).
// 1) Coerência com o mapa (fonte única de ordem, lições, notas e exemplos: docs/i18n/curriculo/dados/mapa.json).
// 2) "Só palavras vistas" com as funções puras de fr/scripts/curriculo_palavras_vistas.js (validarTexto) sobre o mapa.json real.
// Grupos "obrigatório" precisam sair sem palavra não vista (senão o texto é reescrito); grupos "informativo" só listam (frases só exemplo
// e exemplos de nota, com tradução visível, decisão 226; Desafios publicados, que se revisam por módulo, decisão 281).
// Uso: node docs/i18n/curriculo/piloto-m1/A1-1/validar.js [--json]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const P = require(path.join(ROOT, 'fr/scripts/curriculo_papel.js'));
const R = require('./A1-1.json');

const mapa = M.carregarMapa();
const excecoes = M.carregarExcecoes();
const u = M.indicePorId(mapa)['A1-1'].unidade;

// ---------------------------------------------------------------- 1) coerência com o mapa
const coerencia = [];
const confere = (ok, o) => { if (!ok) coerencia.push(o); };
confere(JSON.stringify(R.cartoes.map(c => [c.fr, c.chave])) === JSON.stringify(u.cartoes.map(c => [c.palavra, c.chave])), 'cartões do rascunho fora da ordem do mapa');
const idLicao = Object.fromEntries(u.licoes.map(l => [l.licao, l.id]));
confere(R.cartoes.every((c, i) => c.licao === idLicao[u.cartoes[i].licao]), 'lição de algum cartão diverge do mapa');
confere(JSON.stringify(R.licoes.filter(l => l.id !== 'checkpoint').map(l => [l.id, l.titulo['pt-BR']])) === JSON.stringify(u.licoes.map(l => [l.id, l.titulo])), 'ids ou títulos das lições divergem do mapa');
confere(JSON.stringify(R.notas.map(n => n.titulo['pt-BR'])) === JSON.stringify(u.notas.map(n => n.titulo)), 'notas fora da ordem do mapa');
R.notas.forEach((n, i) => {
  const m = u.notas[i] || {};
  confere(JSON.stringify(n.exemplos.map(e => [e.fr, e['pt-BR']])) === JSON.stringify((m.exemplos || []).map(e => [e.fr, e['pt-BR']])), `exemplos da nota "${m.titulo}" divergem do mapa`);
  confere(n.momento.depois_do_cartao === (m.momento || {}).depois_de && n.momento.licao === idLicao[(m.momento || {}).licao], `momento da nota "${m.titulo}" diverge do mapa`);
  confere(n.vf && n.vf.length >= 1, `nota "${m.titulo}" sem V/F (regra 4)`);
});
confere(R.cartoes.every(c => R.frases_na_frase.some(f => (f.chave === 'nova' ? f.id_rascunho : f.chave) === c.frase_do_cartao)), 'cartão sem frase "Na frase" no rascunho');
confere(new Set(R.cartoes.map(c => c.frase_do_cartao)).size === R.cartoes.length, 'duas cartas com a mesma frase do cartão');
const marcadas = P.carregarFrases();
for (const f of R.frases_na_frase.filter(f => f.chave !== 'nova')) confere(P.papelDaFrase(marcadas, f.chave) === f.papel, `papel de ${f.chave} diverge do frases_na_frase.json`);
confere(M.conferirLicoesDaUnidade(mapa).length === 0, 'conferência de lições do mapa acusou problema');
// Diálogos: mesma lição no rascunho e no mapa (decisão 320); só a lição do diálogo tem inclui_dialogo e o diálogo na sequência.
const numLicao = Object.fromEntries(u.licoes.map(l => [l.id, l.licao]));
confere(JSON.stringify(R.dialogos.map(d => [d.titulo['pt-BR'], numLicao[d.licao]])) === JSON.stringify((u.dialogos || []).map(d => [d.titulo, d.licao])), 'diálogos do rascunho (título ou lição) divergem do mapa');
for (const l of R.licoes.filter(l => l.id !== 'checkpoint')){
  const seus = R.dialogos.filter(d => d.licao === l.id).map(d => d.titulo['pt-BR']);
  const naSequencia = R.dialogos.filter(d => l.sequencia.some(s => s.includes(`"${d.titulo['pt-BR']}"`))).map(d => d.titulo['pt-BR']);
  confere(l.inclui_dialogo === (seus.length > 0), `lição ${l.id}: inclui_dialogo não bate com os diálogos dela`);
  confere(JSON.stringify(naSequencia) === JSON.stringify(seus), `lição ${l.id}: sequência não traz exatamente os diálogos dela`);
}

// ---------------------------------------------------------------- 2) só palavras vistas
const posDoCartao = palavra => u.cartoes.findIndex(c => c.palavra === palavra) + 1; // n cartões vistos ao chegar na nota
const idFrase = f => f.chave === 'nova' ? f.id_rascunho : f.chave;

const casos = [];
const add = (grupo, obrigatorio, onde, fr, contexto, unidade, mapaDoCaso) => casos.push({ grupo, obrigatorio, onde, fr, contexto, unidade: unidade || 'A1-1', mapa: mapaDoCaso || mapa });

// Posição do fim de uma lição (decisões 253 e 320): os cartões das lições 1 a n (prefixo da ordem do mapa) e só as notas dessas lições.
// Na última lição é o fim da unidade (todos os cartões e notas). Função pura: devolve {mapa, posicao} sem mexer no mapa real.
function posicaoNoFimDaLicao(mapaReal, unidadeId, n){
  const un = M.indicePorId(mapaReal)[unidadeId].unidade;
  if (n >= Math.max(...un.licoes.map(l => l.licao))) return { mapa: mapaReal, posicao: 'fim' };
  const copia = JSON.parse(JSON.stringify(mapaReal));
  const uc = M.indicePorId(copia)[unidadeId].unidade;
  uc.notas = (uc.notas || []).filter(x => x.momento && x.momento.licao <= n);
  return { mapa: copia, posicao: un.cartoes.filter(c => c.licao <= n).length };
}
confere(u.cartoes.every((c, i, a) => i === 0 || a[i - 1].licao <= c.licao), 'cartões do mapa fora da ordem das lições (a posição do fim da lição depende disso)');

// Diálogos e "Você entendeu?": na posição do fim da lição do diálogo (informal no fim da lição 2, formal no fim da lição 4; decisão 320).
for (const d of R.dialogos){
  const nome = d.titulo['pt-BR'];
  const p = posicaoNoFimDaLicao(mapa, 'A1-1', numLicao[d.licao]);
  for (const f of d.falas) add(`Diálogo "${nome}" (fim da lição ${numLicao[d.licao]})`, true, f.chave === 'nova' ? `nova (${f.falante})` : f.chave, f.fr, { tipo: 'dialogo', posicao: p.posicao }, 'A1-1', p.mapa);
  for (const c of d.check) for (const o of c.opcoes_erradas || []) add('Você entendeu? (opções)', true, `${nome} ${c.tipo}`, o, { tipo: 'exercicio_licao', posicao: p.posicao }, 'A1-1', p.mapa);
  // Autoteste: um cartão de lição posterior, que nenhuma nota das lições anteriores mostra (ex.: merci aparece em "Très bien, merci !"
  // da nota "Como responder"), tem de ser acusado nesta posição; sem isso, um diálogo do meio passaria como se fosse o fim.
  const exemplosAntes = u.notas.filter(x => x.momento && x.momento.licao <= numLicao[d.licao]).flatMap(x => (x.exemplos || []).map(e => e.fr.toLowerCase()));
  const prox = u.cartoes.find(c => c.licao > numLicao[d.licao] && !exemplosAntes.some(e => e.includes(c.palavra.split(' / ')[0].toLowerCase())));
  if (prox && p.posicao !== 'fim'){
    const r = V.validarTexto(prox.palavra.split(' / ')[0], { tipo: 'dialogo', posicao: p.posicao }, 'A1-1', p.mapa, excecoes);
    confere(r.nao_vistas.length > 0, `autoteste: "${prox.palavra}" (lição ${prox.licao}) passou como vista no diálogo "${nome}"`);
  }
}

// Frases "Na frase": na ficha logo depois do cartão que ilustram (informativo); as essenciais também na Revisão da unidade (obrigatório).
for (const f of R.frases_na_frase){
  const cartao = R.cartoes.find(c => c.chave === f.ilustra || 'nova: ' + c.fr === f.ilustra);
  add('Frases "Na frase" (ficha, depois do cartão)', false, `${idFrase(f)} [${f.papel}]`, f.fr, { tipo: 'ficha', posicao: cartao ? posDoCartao(cartao.fr) : 'fim' });
  if (f.papel === 'essencial') add('Frases essenciais (Revisão da unidade)', true, idFrase(f), f.fr, 'ponto_verificacao_unidade');
}

// Notas: exemplos e V/F (fazem parte da nota; tradução visível = regra das frases "Na frase", decisão 253). Informativo.
for (const n of R.notas){
  const pos = { tipo: 'ficha', posicao: posDoCartao(n.momento.depois_do_cartao) };
  for (const e of n.exemplos) add('Notas (exemplos)', false, n.id, e.fr, pos);
}

// V/F da unidade e Revisão da unidade (produção): obrigatório.
for (const vf of R.verdadeiro_falso_da_unidade) if (vf.subject) add('V/F da unidade', true, vf.subject, vf.subject, 'ponto_verificacao_unidade');
for (const it of R.revisao_da_unidade.itens){
  if (it.blocos) add('Revisão da unidade', true, `${it.tipo} ${it.frase}`, it.blocos.concat(it.iscas || []).join(' / '), 'ponto_verificacao_unidade');
  if (it.tipo === 'cenario') add('Revisão da unidade', true, `cenário ${it.id}`, it.opcoes.map(o => o.fr).join(' / '), 'ponto_verificacao_unidade');
  if (it.tipo === 'lacuna_tocando') add('Revisão da unidade', true, `lacuna ${it.frase}`, it.texto.replace('___', '') + ' / ' + it.opcoes.join(' / '), 'ponto_verificacao_unidade');
}
// Toda frase usada na Revisão da unidade é essencial (decisão 265).
for (const it of R.revisao_da_unidade.itens.filter(i => i.frase)){
  const f = R.frases_na_frase.find(x => idFrase(x) === it.frase);
  const fala = R.dialogos.some(d => d.falas.some(x => x.chave === it.frase));
  confere(fala || (f && P.frasePodeAparecer(f.papel, 'ponto_verificacao_unidade')), `Revisão da unidade usa frase que não é essencial: ${it.frase}`);
}

// Ditados: candidato (obrigatório, palavra de nota não conta); os publicados do módulo no fim do módulo (A1-g11), informativo.
add('Ditado (candidato)', true, 'candidato', R.ditados.candidato_para_o_modulo.fr, 'ditado');
const DIT = (() => { const s = fs.readFileSync(path.join(ROOT, 'fr/dictations.js'), 'utf8'); return Function(s + '; return DICTATIONS;')(); })();
for (const d of DIT.filter(d => d.moduleId === 'A1-m1')) add('Ditados publicados do módulo (fim do módulo, A1-g11)', false, d.id, d.text, 'ditado', 'A1-g11');

// Desafios PUBLICADOS da unidade (não reescritos agora, decisão 281): só para listar os afetados. Informativo.
const DES = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/modulo-a1-m1-content.json'), 'utf8'));
for (const x of DES.listenTranslate.filter(x => x.unitId === 'A1-1')) add('Desafios publicados (lista para a revisão do módulo)', false, 'Ouça e traduza', x.fr, 'desafio');
for (const x of DES.accent.filter(x => x.unitId === 'A1-1')) add('Desafios publicados (lista para a revisão do módulo)', false, 'Acentuação', x.fr || x.text || x.word, 'desafio');
for (const x of DES.expression.filter(x => x.unitId === 'A1-1')){
  for (const campo of ['exampleText', 'secondExampleText', 'microPrompt']) if (x[campo]) add('Desafios publicados (lista para a revisão do módulo)', false, `Expressão "${x.expression}" ${campo}`, x[campo], 'desafio');
}

const resultados = casos.map(c => Object.assign({}, c, V.validarTexto(c.fr, c.contexto, c.unidade, c.mapa, excecoes)));

if (process.argv.includes('--json')){ console.log(JSON.stringify({ coerencia, resultados: resultados.map(({ mapa: _m, ...r }) => r) }, null, 1)); process.exit(0); }
console.log(`## Coerência com o mapa.json e o frases_na_frase.json: ${coerencia.length ? coerencia.length + ' problema(s)' : 'ok'}`);
coerencia.forEach(p => console.log('- ' + p));
let falhas = coerencia.length;
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
console.log(`\nTotal: ${resultados.length} textos; ${falhas} falha(s) (coerência + grupos obrigatórios).`);
process.exit(falhas ? 1 : 0);
