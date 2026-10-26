// Relatório "só palavras vistas" sobre o conteúdo PUBLICADO (fr/content.js, camada pt-BR, fr/dictations.js, fr/challenges.js e os
// lotes de Desafios do A1 em fr/scripts/challenges_import/lote-a1-m*.json), medido na posição do mapa NOVO (mapa.json).
// Só informativo: é a lista de reescrita ao vivo, não um teste que falha. O conteúdo publicado ainda segue a ordem antiga e vai
// acusar muita coisa; não ajustar dado para "limpar" o relatório.
// Rodar: node fr/scripts/curriculo_palavras_vistas.js --relatorio   (grava docs/i18n/curriculo/dados/RELATORIO-palavras-vistas.md)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const M = require('./curriculo_mapa.js');
const V = require('./curriculo_palavras_vistas.js');

const ROOT = path.resolve(__dirname, '..', '..');
const SAIDA = path.join(ROOT, 'docs', 'i18n', 'curriculo', 'dados', 'RELATORIO-palavras-vistas.md');

// Carrega os arquivos de conteúdo reais num sandbox (só leitura; nada é alterado).
function carregarConteudo(){
  const ctx = { CourseLayer: { apply(){} } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const ler = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
  vm.runInContext(ler('fr/content.js') + '\n;this.UNITS=UNITS;this.MODULES=MODULES;', ctx);
  vm.runInContext(ler('fr/dictations.js') + '\n;this.DICTATIONS=DICTATIONS;', ctx);
  vm.runInContext(ler('fr/challenges.js') + '\n;this.CHALLENGES=CHALLENGES;', ctx);
  vm.runInContext(ler('courses/fr-pt-BR/layer.js'), ctx);
  const lotesDir = path.join(ROOT, 'fr', 'scripts', 'challenges_import');
  const lotes = fs.readdirSync(lotesDir).filter(f => /^lote-a1-m[0-9]+(-cloze)?\.json$/.test(f)).sort()
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(lotesDir, f), 'utf8')).map(c => Object.assign({ _arquivo: f }, c)));
  return { units: ctx.UNITS, modules: ctx.MODULES, dictations: ctx.DICTATIONS, challenges: ctx.CHALLENGES, lotes,
    camada: (ctx.COURSE_LAYERS || {})['frances@pt-BR'] || {} };
}

// Posição no mapa novo de um item que pertence a um MÓDULO antigo (ditados): a última unidade desse módulo na ordem nova.
// "A1-revisao" (revisão do nível) fica na última unidade do A1.
function posicaoDoModuloAntigo(mapa, modules, moduleId){
  const ordem = M.unidadesEmOrdem(mapa);
  if (/-revisao$/.test(moduleId)){
    const nivel = moduleId.split('-')[0];
    return ordem.filter(it => it.nivel === nivel).pop().unidade.id;
  }
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return null;
  const idx = M.indicePorId(mapa);
  const its = mod.unitIds.map(id => idx[id]).filter(Boolean).sort((a, b) => a.ordemGlobal - b.ordemGlobal);
  return its.length ? its[its.length - 1].unidade.id : null;
}
function ultimaDoNivel(mapa, nivel){
  const its = M.unidadesEmOrdem(mapa).filter(it => it.nivel === nivel);
  return its.length ? its[its.length - 1].unidade.id : null;
}

// Junta todos os textos em francês com unidade (posição no mapa novo), contexto e rótulo.
function textosDoConteudo(c, mapa){
  const itens = [], fora = [];
  const push = (secao, unidade, contexto, chave, texto) => { if (texto && String(texto).trim()) itens.push({ secao, unidade, contexto, chave, texto: String(texto) }); };
  for (const u of c.units){
    for (const l of (u.dialogue && u.dialogue.lines) || []) push('Diálogos', u.id, 'dialogo', l.k, l.f);
    for (const ch of (u.dialogue && u.dialogue.check) || []) (ch.bad || []).forEach((b, i) => push('Opções do "Você entendeu?"', u.id, 'exercicio_licao', `${u.id} check ${ch.k} opção ${i + 1}`, b));
    (u.trueFalseExercises || []).forEach((t, i) => push('Verdadeiro ou falso', u.id, 'exercicio_licao', `${u.id} V/F ${i + 1}`, t.subject));
    for (const p of u.phrases || []) push('Frases "Na frase" (como se fossem essenciais)', u.id, 'ponto_verificacao_modulo', p.k, p.f);
    if (u.grammar){
      (u.grammar.blocks || []).forEach((b, i) => (b.examples || []).forEach((e, j) => push('Gramáticas: telas', u.id, 'exercicio_licao', `${u.id} tela ${i + 1} ex. ${j + 1}`, e.f)));
      const cam = (((c.camada.units || {})[u.id] || {}).grammar || {}).exercises || [];
      (u.grammar.exercises || []).forEach((e, i) => {
        const prompt = cam[i] && cam[i].prompt;
        // Enunciado com lacuna ("Je ___ étudiante.") vira a frase completa; enunciado sem lacuna está em português ("70 em francês:"),
        // então o francês do exercício é só a resposta.
        const texto = prompt && /_{2,}/.test(prompt) ? prompt.replace(/_{2,}/, e.answer) : e.answer;
        push('Gramáticas: exercícios', u.id, 'exercicio_licao', `${u.id} exercício ${i + 1}`, texto);
      });
    }
  }
  for (const d of c.dictations){
    const u = posicaoDoModuloAntigo(mapa, c.modules, d.moduleId);
    if (!u){ fora.push(`ditado ${d.id} (${d.moduleId})`); continue; }
    push('Ditados', u, 'ditado', `ditado ${d.id} (${d.moduleId})`, d.text);
  }
  // Desafio: o texto da tarefa (frase, expressão, exemplos, microatividade) separado do enunciado em francês (pergunta, opções, sentido),
  // que também é lido pelo aluno mas costuma ser metalinguagem ("Quand dit-on...").
  const desafio = (ch, unidade) => {
    const rot = `${ch.id} (${ch.type})`;
    push('Desafios: texto da tarefa', unidade, 'desafio', rot, [ch.sentenceFr && ch.blanks ? ch.sentenceFr.replace(/_{2,}/, ch.blanks[0].answer) : ch.sentenceFr,
      ch.targetText, ch.canonicalExpression, ch.example && ch.example.text, ch.secondExample && ch.secondExample.text,
      ch.microActivity && ch.microActivity.prompt && ch.microActivity.prompt.replace(/_{2,}/, ch.microActivity.answer || '')].filter(Boolean).join(' / '));
    push('Desafios: enunciado em francês', unidade, 'desafio', rot, [ch.question, ...(ch.options || []), ch.meaning && ch.meaning.fr].filter(Boolean).join(' / '));
  };
  for (const ch of c.lotes){
    if (ch.unitId && M.indicePorId(mapa)[ch.unitId]) desafio(ch, ch.unitId);
    else fora.push(`Desafio ${ch.id} (sem unidade no mapa)`);
  }
  for (const ch of c.challenges){
    const u = ['A1', 'A2'].includes(ch.level) ? ultimaDoNivel(mapa, ch.level) : null;
    if (u) desafio(ch, u); else fora.push(`Desafio ${ch.id} (nível ${ch.level}, fora do mapa A1/A2)`);
  }
  return { itens, fora };
}

function gerarRelatorio(opcoes){
  const o = opcoes || {};
  const mapa = o.mapa || M.carregarMapa(), exc = o.excecoes || M.carregarExcecoes();
  const conteudo = o.conteudo || carregarConteudo();
  const { itens, fora } = textosDoConteudo(conteudo, mapa);
  const idx = M.indicePorId(mapa), ensino = V.indiceDeEnsino(mapa);
  const nomeModulo = {};
  for (const n of mapa.niveis) for (const m of n.modulos) for (const u of m.unidades) nomeModulo[u.id] = `${n.id} M${m.ordem} "${m.nome}"`;

  const achados = [], freq = new Map(), freqInc = new Map();
  const porSecao = {};
  for (const it of itens){
    const r = V.validarTexto(it.texto, it.contexto, it.unidade, mapa, exc);
    const s = (porSecao[it.secao] = porSecao[it.secao] || { textos: 0, comAchado: 0, naoVistas: 0, incertas: 0 });
    s.textos++;
    if (!r.nao_vistas.length && !r.incertas.length) continue;
    s.comAchado++; s.naoVistas += r.nao_vistas.length; s.incertas += r.incertas.length;
    r.nao_vistas.forEach(p => freq.set(p, (freq.get(p) || 0) + 1));
    r.incertas.forEach(p => freqInc.set(p.palavra, (freqInc.get(p.palavra) || 0) + 1));
    achados.push(Object.assign({ r }, it));
  }
  const ondeTxt = p => { const e = ensino.get(p); return e ? `${e.como} em "${e.nome}" (${e.unidade})` : 'sem cartão no mapa'; };
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  const topInc = [...freqInc.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  const total = k => Object.values(porSecao).reduce((a, s) => a + s[k], 0);

  const L = [];
  L.push('# Relatório "só palavras vistas" (gerado)', '');
  L.push(`Gerado por \`node fr/scripts/curriculo_palavras_vistas.js --relatorio\` em ${new Date().toISOString().slice(0, 10)}. **Não editar à mão.**`);
  L.push('Só informativo (decisão 233): é a lista de reescrita ao vivo do conteúdo publicado medido na posição do mapa NOVO (`mapa.json`). O site ainda');
  L.push('segue a ordem antiga, então muita coisa aparece aqui sem ser erro no site de hoje. Regras e limitações: `fr/scripts/curriculo_palavras_vistas.js`');
  L.push('e `docs/guia-do-desenvolvedor.md`.', '');
  L.push('- **Não vista**: a forma não é cartão anterior (nem da própria unidade), nem nota com tradução (só diálogos), nem exceção de `excecoes.json`, nem palavra funcional.');
  L.push('- **Incerta**: começa com o radical de um verbo já visto, mas a forma não foi gerada (verbo irregular). Conferir à mão ou acrescentar em `dados/formas_extras.json`.');
  L.push('- **Frases "Na frase"** são medidas como se fossem *essenciais* (contexto exame do módulo): com palavra não vista, a frase só pode ficar como *só exemplo* (decisão 226) ou ser trocada.');
  L.push('- Ditados ficam na última unidade (na ordem nova) do módulo antigo a que pertencem; Desafios do A1, na unidade do `unitId`; Desafios de `fr/challenges.js` do A2, no fim do A2.', '');
  L.push('## Resumo', '');
  L.push('| Seção | Textos | Com achado | Não vistas | Incertas |', '|---|---:|---:|---:|---:|');
  for (const [k, s] of Object.entries(porSecao)) L.push(`| ${k} | ${s.textos} | ${s.comAchado} | ${s.naoVistas} | ${s.incertas} |`);
  L.push(`| **Total** | ${total('textos')} | ${total('comAchado')} | ${total('naoVistas')} | ${total('incertas')} |`, '');
  const comCartao = [...freq.keys()].filter(p => ensino.has(p));
  L.push(`Palavras não vistas diferentes: ${freq.size} (${comCartao.length} viram cartão ou nota mais adiante no mapa; ${freq.size - comCartao.length} não estão no mapa).`, '');
  L.push('**As 10 palavras não vistas mais frequentes** (textos em que aparecem; onde o mapa ensina):', '');
  top.forEach(([p, n], i) => L.push(`${i + 1}. *${p}*: ${n} (${ondeTxt(p)})`));
  L.push('', '**As 10 incertas mais frequentes:**', '');
  topInc.forEach(([p, n], i) => L.push(`${i + 1}. *${p}*: ${n}`));
  if (fora.length) L.push('', `**Fora do mapa (não medidos):** ${fora.length}: ${fora.join('; ')}.`);
  L.push('', '## Achados por módulo e unidade (ordem do mapa novo)', '');
  const ordem = M.unidadesEmOrdem(mapa);
  let modAtual = null;
  for (const it of ordem){
    const us = achados.filter(a => a.unidade === it.unidade.id);
    if (!us.length) continue;
    if (nomeModulo[it.unidade.id] !== modAtual){ modAtual = nomeModulo[it.unidade.id]; L.push(`### ${modAtual}`, ''); }
    L.push(`#### ${it.posicao} "${it.unidade.nome}" (${it.unidade.id})`, '');
    for (const a of us){
      const partes = [];
      if (a.r.nao_vistas.length) partes.push('não vistas: ' + a.r.nao_vistas.map(p => `*${p}* (${ondeTxt(p)})`).join(', '));
      if (a.r.incertas.length) partes.push('incertas: ' + a.r.incertas.map(p => `*${p.palavra}* (${p.lema}?)`).join(', '));
      L.push(`- ${a.secao}, \`${a.chave}\`: "${a.texto.replace(/\s+/g, ' ')}". ${partes.join('; ')}.`);
    }
    L.push('');
  }
  const md = L.join('\n') + '\n';
  if (!o.naoGravar) fs.writeFileSync(SAIDA, md);
  const resumo = `textos: ${total('textos')}; com achado: ${total('comAchado')}; não vistas: ${total('naoVistas')} (${freq.size} diferentes, ${comCartao.length} com cartão ou nota no mapa); incertas: ${total('incertas')}; fora do mapa: ${fora.length}`;
  return { arquivo: SAIDA, md, resumo, porSecao, top, topInc, fora };
}

module.exports = { carregarConteudo, textosDoConteudo, posicaoDoModuloAntigo, gerarRelatorio };
