#!/usr/bin/env node
// Validação do rascunho A1-g11.json ("Gramática: masculino e feminino", unidade 8, a última do módulo 1), no molde da A1-g1.
// 1) Coerência com o mapa (docs/i18n/curriculo/dados/mapa.json: unidade de gramática, nome e posição) e regras das telas
//    (fr/scripts/curriculo_licao_curta.js).
// 2) "Só palavras vistas" (fr/scripts/curriculo_palavras_vistas.js) nos exercícios, nos exemplos das explicações e no resumo: na
//    gramática, vale tudo o que veio antes da unidade (ela não tem cartões). Aqui também o áudio do "Ouça e escolha" (a prática
//    "Pronúncia: masculino ou feminino?", decisões 21 e 36) e a coluna da direita do "Relacione" (os dois lados são francês).
// 3) A prática de pronúncia: o aluno ouve sem ver a escrita e escolhe "masculino", "feminino" ou "não dá para saber pelo som".
// Uso: node docs/i18n/curriculo/piloto-m1/A1-g11/validar.js [--json]
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const V = require(path.join(ROOT, 'fr/scripts/curriculo_palavras_vistas.js'));
const M = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));
const L = require(path.join(ROOT, 'fr/scripts/curriculo_licao_curta.js'));
const R = require('./A1-g11.json');
const UID = 'A1-g11';

const mapa = M.carregarMapa();
const excecoes = M.carregarExcecoes();
const it = M.indicePorId(mapa)[UID];
const u = it.unidade;
const telas = R.licoes[0].telas;

// ---------------------------------------------------------------- 1) coerência com o mapa e regras das telas
const coerencia = [];
const confere = (ok, o) => { if (!ok) coerencia.push(o); };
confere(u.tipo === 'gramatica' && R.unidade.tipo === 'gramatica', 'a unidade não é de gramática no mapa ou no rascunho');
confere(u.nome === R.unidade.titulo['pt-BR'], `nome diverge do mapa: "${u.nome}" x "${R.unidade.titulo['pt-BR']}"`);
confere(it.posicao === R.unidade.posicao, `posição diverge do mapa: ${it.posicao} x ${R.unidade.posicao}`);
confere(R.licoes.length === 1 && R.licoes[0].tipo === 'gramatica', 'a gramática simples fica numa lição só (decisão 365)');
confere(!R.cartoes.length && !R.dialogos.length, 'gramática sem cartões e sem diálogo (decisão 365)');
const explicacoes = telas.filter(t => t.tipo === 'nota').length;
const exercicios = telas.filter(t => !['abertura', 'nota', 'fim'].includes(t.tipo)).length;
confere(u.telas === explicacoes && u.exercicios === exercicios, `mapa diz ${u.telas} explicações e ${u.exercicios} exercícios; o rascunho tem ${explicacoes} e ${exercicios}`);
for (const problema of L.conferirTelas(R)) confere(false, problema);

// ---------------------------------------------------------------- 3) prática de pronúncia (decisões 21 e 36)
const OPCOES_PRONUNCIA = ['masculino', 'feminino', 'não dá para saber pelo som'];
const pratica = telas.filter(t => t.tipo === 'ouvir_escolher' && JSON.stringify(t.opcoes) === JSON.stringify(OPCOES_PRONUNCIA));
confere(pratica.length >= 3 && pratica.length <= 4, `a prática "masculino ou feminino?" tem ${pratica.length} telas (3 ou 4)`);
confere(new Set(pratica.map(t => t.resposta)).size === 3, 'a prática não usa as três respostas (masculino, feminino, não dá para saber)');
// O áudio é a palavra sozinha: com "il" / "elle" o pronome entrega a resposta; com "Je suis", a voz (feminina ou masculina) também.
for (const t of pratica) confere(!/\b(il|elle|je)\b/i.test(t.audio), `tela ${t.id}: o áudio da prática entrega o gênero ("${t.audio}")`);
// O painel mostra a forma escrita (decisão do desenho): o áudio aparece em negrito na explicação.
for (const t of pratica) confere(((t.explicacao || {})['pt-BR'] || '').includes(`<b>${t.audio}</b>`), `tela ${t.id}: o painel não mostra a forma escrita`);

// ---------------------------------------------------------------- 2) só palavras vistas
const fim = { tipo: 'ficha', posicao: 'fim' };
const casos = L.textosDasTelas(R, M, mapa, UID).map(c => Object.assign({}, c));
for (const n of R.notas) for (const e of n.exemplos) casos.push({ grupo: 'Explicações (exemplos)', obrigatorio: true, onde: n.id, fr: e.fr, contexto: fim, mapa });
for (const t of telas.filter(t => t.tipo === 'fim')) for (const x of t.resumo) casos.push({ grupo: 'Tela final (resumo)', obrigatorio: true, onde: t.id, fr: x.fr, contexto: fim, mapa });
for (const t of telas.filter(t => t.tipo === 'ouvir_escolher')){
  casos.push({ grupo: 'Ouça e escolha (áudio e opções em francês)', obrigatorio: true, onde: t.id, fr: t.audio, contexto: fim, mapa });
  if (!pratica.includes(t)) for (const o of t.opcoes) casos.push({ grupo: 'Ouça e escolha (áudio e opções em francês)', obrigatorio: true, onde: t.id, fr: o, contexto: fim, mapa });
}
for (const t of telas.filter(t => t.tipo === 'relacionar')) for (const [, d] of t.pares) casos.push({ grupo: 'Relacione (coluna da direita)', obrigatorio: true, onde: t.id, fr: d, contexto: fim, mapa });

const resultados = casos.map(c => Object.assign({}, c, V.validarTexto(c.fr, c.contexto, UID, c.mapa, excecoes)));
if (process.argv.includes('--json')){ console.log(JSON.stringify({ coerencia, resultados: resultados.map(({ mapa: _m, ...r }) => r) }, null, 1)); process.exit(0); }
console.log(`## Coerência com o mapa.json, regras das telas e prática de pronúncia: ${coerencia.length ? coerencia.length + ' problema(s)' : 'ok'}`);
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
