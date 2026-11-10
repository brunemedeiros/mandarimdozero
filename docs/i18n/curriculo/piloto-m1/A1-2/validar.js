#!/usr/bin/env node
// Validação do rascunho A1-2.json ("Dizer o nome e a nacionalidade", decisões 326 a 328 e 330; mesmo modelo do piloto A1-1, decisões 233, 253 e 265).
// 1) Coerência com o mapa (fonte única de ordem, lições, notas e exemplos: docs/i18n/curriculo/dados/mapa.json).
// 2) "Só palavras vistas" com as funções puras de fr/scripts/curriculo_palavras_vistas.js (validarTexto) sobre o mapa.json real.
// Grupos "obrigatório" precisam sair sem palavra não vista (senão o texto é reescrito); grupos "informativo" só listam (frases só exemplo
// e exemplos de nota, com tradução visível, decisão 226; Desafios publicados, que se revisam por módulo, decisão 281).
// Uso: node docs/i18n/curriculo/piloto-m1/A1-2/validar.js [--json]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const P = require(path.join(ROOT, 'fr/scripts/curriculo_papel.js'));
const L = require(path.join(ROOT, 'fr/scripts/curriculo_licao_curta.js'));
const R = require('./A1-2.json');
const UID = 'A1-2';

const mapa = M.carregarMapa();
const excecoes = M.carregarExcecoes();
const u = M.indicePorId(mapa)[UID].unidade;

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
  // V/F logo depois das notas de explicação e de realidade (regra 4; 08 seção 1); a de pronúncia (alfabeto, em grade) não tem.
  if (['Exp', 'Real'].includes(n.tipo)) confere(n.vf && n.vf.length >= 1, `nota "${m.titulo}" sem V/F (regra 4)`);
  confere(n.tipo === m.tipo, `tipo da nota "${m.titulo}" diverge do mapa`);
  // Gatilho (decisão 326): toda nota vem logo depois de um cartão da própria lição.
  confere(R.cartoes.some(c => c.fr === n.momento.depois_do_cartao && c.licao === n.momento.licao), `nota "${m.titulo}" sem cartão-gatilho na lição dela`);
});
confere(R.cartoes.every(c => R.frases_na_frase.some(f => (f.chave === 'nova' ? f.id_rascunho : f.chave) === c.frase_do_cartao)), 'cartão sem frase "Na frase" no rascunho');
confere(new Set(R.cartoes.map(c => c.frase_do_cartao)).size === R.cartoes.length, 'duas cartas com a mesma frase do cartão');
// Decisão 330: cartão só de reconhecimento (ne… pas) igual no rascunho e no mapa; a nota "Tu t'appelles comment ?" não manda escrever uma ordem só
// (os exercícios aceitam as duas, regra de correção registrada em "correcao").
confere(JSON.stringify(R.cartoes.map(c => !!c.reconhecimento_so)) === JSON.stringify(u.cartoes.map(c => !!c.reconhecimento_so)), 'reconhecimento_so diverge do mapa');
{
  const n06 = R.notas.find(n => n.id_mapa === 'N06') || {};
  confere(!/Nos exercícios/i.test(JSON.stringify(n06.texto || {}) + JSON.stringify(n06.vf || [])) && /duas ordens/.test(n06.correcao || ''), 'nota Tu t\'appelles comment ? ainda manda escrever uma ordem só, ou sem a regra de correção');
}
const marcadas = P.carregarFrases();
// Frases publicadas ainda sem marca no frases_na_frase.json: o papel daqui é proposta (a marca entra na aprovação, como na A1-1).
const semMarca = [];
for (const f of R.frases_na_frase.filter(f => f.chave !== 'nova')){
  const marcado = P.papelDaFrase(marcadas, f.chave);
  if (marcado) confere(marcado === f.papel, `papel de ${f.chave} diverge do frases_na_frase.json`); else semMarca.push(`${f.chave} (${f.papel})`);
}
// Decisão 328: la France e le Brésil (com as frases p4, p5, p6) vão para "Dizer de onde é, onde mora e que línguas fala" (título da decisão 332), logo depois desta unidade.
{
  const idx = M.indicePorId(mapa), a9 = idx['A1-9'];
  confere(a9.modulo === idx[UID].modulo && a9.ordemGlobal === idx[UID].ordemGlobal + 1, 'A1-9 não está logo depois da A1-2');
  confere(['A1-2-v5', 'A1-2-v6'].every(k => a9.unidade.cartoes.some(c => c.chave === k)), 'la France e le Brésil não estão na A1-9');
  confere(R.frases_que_saem.every(f => f.vai_para === 'A1-9'), 'frase que sai sem destino A1-9');
  confere(!u.cartoes.some(c => ['A1-2-v5', 'A1-2-v6'].includes(c.chave)), 'la France ou le Brésil ainda na A1-2');
}
confere(M.conferirLicoesDaUnidade(mapa).length === 0, 'conferência de lições do mapa acusou problema');
// Diálogos: mesma lição no rascunho e no mapa (decisão 320); só a lição do diálogo tem inclui_dialogo e o diálogo na sequência.
const numLicao = Object.fromEntries(u.licoes.map(l => [l.id, l.licao]));
confere(JSON.stringify(R.dialogos.map(d => [d.titulo['pt-BR'], numLicao[d.licao]])) === JSON.stringify((u.dialogos || []).map(d => [d.titulo, d.licao])), 'diálogos do rascunho (título ou lição) divergem do mapa');
// Telas da lição curta (regra 17), lições de diálogo, notas em tela ou painel e tamanho dos textos: fr/scripts/curriculo_licao_curta.js.
for (const problema of L.conferirTelas(R)) confere(false, problema);

// ---------------------------------------------------------------- 2) só palavras vistas
const posDoCartao = palavra => u.cartoes.findIndex(c => c.palavra === palavra) + 1; // n cartões vistos ao chegar na nota
const idFrase = f => f.chave === 'nova' ? f.id_rascunho : f.chave;

const casos = [];
const add = (grupo, obrigatorio, onde, fr, contexto, unidade, mapaDoCaso) => casos.push({ grupo, obrigatorio, onde, fr, contexto, unidade: unidade || UID, mapa: mapaDoCaso || mapa });

confere(u.cartoes.every((c, i, a) => i === 0 || a[i - 1].licao <= c.licao), 'cartões do mapa fora da ordem das lições (a posição do fim da lição depende disso)');

// Falas dos diálogos e textos dos exercícios das telas (lições de cartões e de diálogo): fr/scripts/curriculo_licao_curta.js.
for (const c of L.textosDasTelas(R, M, mapa, UID)) add(c.grupo, c.obrigatorio, c.onde, c.fr, c.contexto, UID, c.mapa);

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
for (const x of DES.listenTranslate.filter(x => x.unitId === UID)) add('Desafios publicados (lista para a revisão do módulo)', false, 'Ouça e traduza', x.fr, 'desafio');
for (const x of DES.accent.filter(x => x.unitId === UID)) add('Desafios publicados (lista para a revisão do módulo)', false, 'Acentuação', x.fr || x.text || x.word, 'desafio');
for (const x of DES.expression.filter(x => x.unitId === UID)){
  for (const campo of ['exampleText', 'secondExampleText', 'microPrompt']) if (x[campo]) add('Desafios publicados (lista para a revisão do módulo)', false, `Expressão "${x.expression}" ${campo}`, x[campo], 'desafio');
}

const resultados = casos.map(c => Object.assign({}, c, V.validarTexto(c.fr, c.contexto, c.unidade, c.mapa, excecoes)));

if (process.argv.includes('--json')){ console.log(JSON.stringify({ coerencia, resultados: resultados.map(({ mapa: _m, ...r }) => r) }, null, 1)); process.exit(0); }
console.log(`## Coerência com o mapa.json e o frases_na_frase.json: ${coerencia.length ? coerencia.length + ' problema(s)' : 'ok'}`);
coerencia.forEach(p => console.log('- ' + p));
if (semMarca.length) console.log(`(papel proposto, ainda sem marca no frases_na_frase.json: ${semMarca.join(', ')})`);
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
