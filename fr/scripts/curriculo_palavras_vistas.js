#!/usr/bin/env node
// Validador "só palavras vistas" (decisão 233; regra 11 do docs/i18n/curriculo/15-regras-do-curriculo.md; decisões 211, 225, 226,
// 232, 253 e 260 do docs/i18n/curriculo/12-decisoes-apos-maquete-m1.md).
//
// Pergunta que responde: numa posição do mapa NOVO (mapa.json), num certo contexto (diálogo, ditado, Desafio...), quais palavras
// de um texto em francês o aluno ainda não viu? "Vista" = forma de cartão de uma unidade anterior (ou da própria unidade, conforme a
// posição do texto), palavra de nota com tradução (só nos diálogos, decisões 225 e 253), exceção aceita pela dona (excecoes.json,
// por unidade ou "escopo": "nivel:A1") ou palavra funcional (dados/palavras_funcionais.json).
//
// Comparação por FORMA, não por lema: cada cartão gera um conjunto de formas simples (gênero e número; verbos em -er/-ir/-re no
// presente regular, particípio e imperfeito) e dados/formas_extras.json acrescenta formas à mão. LIMITAÇÃO: forma irregular que não
// está em formas_extras.json não é reconhecida; para não acusar erro falso, a palavra que começa com o radical de um cartão já visto
// cai em `incertas` (conferir à mão), nunca em `nao_vistas`. Detalhes e o que não fazer: docs/guia-do-desenvolvedor.md.
//
// Uso: node fr/scripts/curriculo_palavras_vistas.js --relatorio   (grava docs/i18n/curriculo/dados/RELATORIO-palavras-vistas.md)
// Teste: node tests/curriculo/test_palavras_vistas.js
'use strict';
const fs = require('fs'), path = require('path');
const M = require('./curriculo_mapa.js');
const { CONTEXTOS } = require('./curriculo_papel.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DADOS = path.join(ROOT, 'docs', 'i18n', 'curriculo', 'dados');

// Contextos em que a palavra de nota com tradução conta como vista (decisões 225 e 253: só diálogos). Nos outros (exercícios,
// Pontos de verificação, Teste de Nível, ditados, Desafios) a nota NÃO conta: escolha conservadora onde a decisão não fala.
const NOTAS_CONTAM_EM = new Set(['dialogo']);

// ---------------------------------------------------------------- texto -> palavras
function normalizar(s){
  return String(s).normalize('NFC').replace(/[’‘ʼ`´]/g, "'").replace(/[‐‑–]/g, '-');
}
function semAcento(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Tokens de um texto, com a forma original (para nome próprio) e se o token abre frase.
// Apóstrofo e hífen ficam dentro do token; o resto da pontuação separa. Números em algarismo e {placeholders} são ignorados.
function tokenizar(texto){
  const t = normalizar(texto).replace(/\{[^}]*\}/g, ' ');
  // Pontuação que abre frase: fim de frase, dois-pontos, barra (textos juntados), aspas e travessão de fala.
  const re = /[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ'\-]+|[.!?…:\/«"—]|[0-9]+/g;
  const out = []; let inicio = true, m;
  while ((m = re.exec(t))){
    const s = m[0];
    if (/^[.!?…:\/«"—]$/.test(s)){ inicio = true; continue; }
    if (/^[0-9]+$/.test(s)){ inicio = false; continue; }
    const limpo = s.replace(/^['-]+|-+$/g, '');
    if (!limpo || limpo === "'") continue;
    out.push({ original: limpo, forma: limpo.toLowerCase(), inicioDeFrase: inicio });
    inicio = false;
  }
  return out;
}

// Partes de um token: hífen primeiro ("qu'est-ce" -> "qu'est", "ce"), depois a elisão ("qu'est" -> "qu'", "est").
function partesDoToken(forma){
  const partes = [];
  for (const h of forma.split('-').filter(Boolean)){
    const i = h.indexOf("'");
    if (i > 0 && i < h.length - 1){ partes.push(h.slice(0, i + 1)); partes.push(...partesDoToken(h.slice(i + 1))); }
    else partes.push(h);
  }
  return partes;
}

// Alternativas de uma "palavra" de cartão ou nota: "le professeur / la professeure" -> 2; "un kilo (de)" -> "un kilo de".
function alternativas(palavra){
  return normalizar(palavra).split(/\s+\/\s+|,\s+/).map(a => a.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
function tokensDe(texto){ return tokenizar(texto).map(t => t.forma); }

// Formas simples geradas por regra a partir de uma palavra (substantivo, adjetivo ou verbo regular). Gera de mais de propósito:
// forma que não existe não atrapalha (nenhum texto a usa); forma que falta vira `incerta`.
function formasGeradas(p){
  const f = new Set([p]);
  if (p.length < 3 || p.endsWith("'")) return f;
  const add = (...xs) => xs.forEach(x => f.add(x));
  add(p + 's', p + 'e', p + 'es');
  if (/(eau|eu)$/.test(p)) add(p + 'x');
  if (/al$/.test(p)) add(p.slice(0, -2) + 'aux');
  if (/eux$/.test(p)) add(p.slice(0, -1) + 'se', p.slice(0, -1) + 'ses');
  if (/if$/.test(p)) add(p.slice(0, -1) + 've', p.slice(0, -1) + 'ves');
  if (/(en|on|el|et)$/.test(p)) add(p + p.slice(-1) + 'e', p + p.slice(-1) + 'es');
  if (/er$/.test(p) && p.length > 3){
    const r = p.slice(0, -2);
    add(r + 'ère', r + 'ères');                                         // adjetivo (léger -> légère)
    const r1 = /g$/.test(r) ? r + 'e' : /c$/.test(r) ? r.slice(0, -1) + 'ç' : r; // mangeons, commençons
    add(r + 'e', r + 'es', r1 + 'ons', r + 'ez', r + 'ent', r + 'é', r + 'ée', r + 'és', r + 'ées',
      r1 + 'ais', r1 + 'ait', r1 + 'aient', r + 'ions', r + 'iez', r1 + 'ant');
  }
  if (/ir$/.test(p) && p.length > 3){
    const r = p.slice(0, -2);
    add(r + 'is', r + 'it', r + 'issons', r + 'issez', r + 'issent', r + 'i', r + 'ie', r + 'issais', r + 'issait');
  }
  if (/re$/.test(p) && p.length > 3){
    const r = p.slice(0, -2);
    add(r + 's', r, r + 'ons', r + 'ez', r + 'ent', r + 'u', r + 'ue', r + 'ais', r + 'ait');
  }
  return f;
}

// Radical para a classificação `incerta`: tira a terminação de verbo/nome e os acentos (lever -> lev, préférer -> prefer).
function radical(p){
  const s = semAcento(p).replace(/(oir|er|ir|re|e|s)$/, '');
  return s.length >= 4 ? s : null;
}

// ---------------------------------------------------------------- dados
function carregarJson(nome, dir){ return JSON.parse(fs.readFileSync(path.join(dir || DADOS, nome), 'utf8')); }
function carregarDados(dir){
  return { funcionais: carregarJson('palavras_funcionais.json', dir), formasExtras: carregarJson('formas_extras.json', dir) };
}
function conjuntoFuncional(dados){
  return new Set(((dados.funcionais && dados.funcionais.grupos) || []).flatMap(g => g.palavras.map(p => p.toLowerCase())));
}
let dadosPadrao = null;
function dadosOuPadrao(d){ return d || (dadosPadrao = dadosPadrao || carregarDados()); }

// Formas de uma "palavra" (cartão ou nota) com as formas extras: todas as palavras de todas as alternativas.
// `principais` = formas das alternativas de UMA palavra só (com ou sem artigo): é o que faz o cartão "vencer" a lista funcional.
const ARTIGO = /^(le|la|les|l'|un|une)$/;
// `funcionais` (Set): palavra gramatical dentro de um cartão de várias palavras ("une fois par semaine") não ganha formas geradas
// (senão "par" geraria "pars", que é forma de partir).
function formasDaPalavra(palavra, formasExtras, funcionais){
  const todas = new Set(), principais = new Set(), radicais = [];
  for (const alt of alternativas(palavra)){
    const toks = tokensDe(alt);
    const plenas = toks.filter(t => !ARTIGO.test(t));
    for (const tok of toks){
      todas.add(tok);
      for (const parte of partesDoToken(tok)){
        if (funcionais && funcionais.has(parte) && toks.length > 1){ todas.add(parte); continue; }
        for (const f of formasGeradas(parte)) todas.add(f);
        // Só verbo (terminação de infinitivo) dá radical: nome e adjetivo já têm as formas geradas e as extras.
        if (/(er|ir|re|oir)$/.test(parte) && parte.length >= 5){ const r = radical(parte); if (r) radicais.push({ radical: r, lema: alt }); }
      }
    }
    if (plenas.length === 1) for (const f of formasGeradas(plenas[0])) principais.add(f);
    for (const f of (formasExtras && formasExtras[alt]) || []){ todas.add(f.toLowerCase()); if (plenas.length === 1) principais.add(f.toLowerCase()); }
  }
  for (const f of (formasExtras && formasExtras[normalizar(palavra)]) || []) todas.add(f.toLowerCase());
  return { todas, principais, radicais };
}

// ---------------------------------------------------------------- palavras vistas numa posição
function nivelDaUnidade(mapa, unidadeId){ const it = M.indicePorId(mapa)[unidadeId]; return it ? it.nivel : null; }

function contextoNormalizado(contexto){
  const c = typeof contexto === 'string' ? { tipo: contexto } : Object.assign({}, contexto);
  if (!CONTEXTOS.includes(c.tipo)) throw new Error(`contexto desconhecido: ${c.tipo}`);
  if (c.posicao === undefined) c.posicao = 'fim';
  return c;
}

// Palavras vistas ao chegar a `unidadeId` no mapa NOVO.
//   opcoes.contexto: um dos CONTEXTOS (padrão 'dialogo') ou {tipo, posicao};
//   posicao na própria unidade: 'fim' (todos os cartões e notas da unidade; padrão: diálogo, Ponto de verificação, ditado e
//   Desafio vêm depois das lições), 'inicio' (nada da unidade) ou um número n (os n primeiros cartões, na ordem do mapa).
//   opcoes.dados: {funcionais, formasExtras} (padrão: os arquivos de dados/).
// Devolve { formas: Set, radicais: [{radical, lema}] }.
function palavrasVistasAte(mapa, excecoes, unidadeId, opcoes){
  const o = opcoes || {};
  const ctx = contextoNormalizado(o.contexto || 'dialogo');
  const dados = dadosOuPadrao(o.dados);
  const extras = (dados.formasExtras && dados.formasExtras.formas) || {};
  const funcionais = conjuntoFuncional(dados);
  const ordem = M.unidadesEmOrdem(mapa);
  const pos = ordem.findIndex(it => it.unidade.id === unidadeId);
  if (pos < 0) throw new Error(`unidade fora do mapa: ${unidadeId}`);
  const notasContam = NOTAS_CONTAM_EM.has(ctx.tipo);

  const formas = new Set(), radicais = [];
  const cartaoVisto = new Set();       // texto do cartão (alternativas) já visto: libera os grupos funcionais com `lema`
  const principaisFuturas = new Set(); // formas de cartões de uma palavra ainda não vistos: o cartão vence a lista funcional
  const lemasNoMapa = new Set();

  ordem.forEach((it, i) => {
    const u = it.unidade;
    const cartoes = u.cartoes || [];
    let nVistos = i < pos ? cartoes.length : 0;
    if (i === pos) nVistos = ctx.posicao === 'fim' ? cartoes.length : ctx.posicao === 'inicio' ? 0 : Math.min(Number(ctx.posicao) || 0, cartoes.length);
    cartoes.forEach((c, j) => {
      const fp = formasDaPalavra(c.palavra, extras, funcionais);
      alternativas(c.palavra).forEach(a => lemasNoMapa.add(a));
      if (j < nVistos){
        fp.todas.forEach(f => formas.add(f)); radicais.push(...fp.radicais);
        alternativas(c.palavra).forEach(a => cartaoVisto.add(a));
      } else fp.principais.forEach(f => principaisFuturas.add(f));
    });
    const notaDaPosicao = i < pos || (i === pos && ctx.posicao !== 'inicio');
    if (notasContam && notaDaPosicao){
      for (const n of M.notasDaUnidade(u)) for (const p of M.palavrasDaNota(n)){
        const fp = formasDaPalavra(p, extras, funcionais); fp.todas.forEach(f => formas.add(f)); radicais.push(...fp.radicais);
      }
    }
  });
  // Cartão já visto numa unidade anterior não é "futuro", mesmo se outra forma igual vier depois.
  for (const f of formas) principaisFuturas.delete(f);

  // Exceções da dona (excecoes.json): valem na unidade citada ou no nível inteiro ("escopo": "nivel:A1"); não acumulam.
  const nivel = ordem[pos].nivel;
  for (const e of (excecoes && excecoes.palavras_antes_do_cartao) || []){
    const vale = (e.unidades || []).includes(unidadeId) || e.escopo === `nivel:${nivel}`;
    if (vale) formasDaPalavra(e.expressao, extras, funcionais).todas.forEach(f => formas.add(f));
  }

  // Palavras funcionais.
  for (const g of (dados.funcionais && dados.funcionais.grupos) || []){
    if (g.lema && lemasNoMapa.has(g.lema) && !cartaoVisto.has(g.lema)) continue;
    for (const p of g.palavras){
      const f = p.toLowerCase();
      if (!g.antes_do_cartao && principaisFuturas.has(f)) continue;
      formas.add(f);
    }
  }
  return { formas, radicais };
}

// ---------------------------------------------------------------- validação de um texto
const memo = new WeakMap();
function vistasComMemo(mapa, excecoes, unidadeId, ctx, dados){
  if (!memo.has(mapa)) memo.set(mapa, new Map());
  const m = memo.get(mapa);
  const k = JSON.stringify([unidadeId, ctx.tipo, ctx.posicao]);
  // A memória vale só para os dados padrão e o mesmo objeto de exceções.
  const cache = m.get(k);
  if (cache && cache.excecoes === excecoes && cache.dados === dados) return cache.v;
  const v = palavrasVistasAte(mapa, excecoes, unidadeId, { contexto: ctx, dados });
  m.set(k, { excecoes, dados, v });
  return v;
}

// Classifica um token: 'vista' | 'incerta' (com lema) | 'nao_vista' (com as partes que faltam).
// `conhecidas` = formas que o mapa ensina em algum lugar (indiceDeEnsino): forma conhecida e ainda não vista é `nao_vista`, nunca
// `incerta` (ex.: "devant" antes do cartão não vira "forma de devoir").
function classificar(forma, vistas, conhecidas){
  if (vistas.formas.has(forma)) return { tipo: 'vista' };
  if (conhecidas && conhecidas.has(forma)) return { tipo: 'nao_vista', partes: [forma] };
  const partes = partesDoToken(forma);
  if (partes.length > 1){
    const res = partes.map(p => classificar(p, vistas, conhecidas));
    if (res.every(r => r.tipo === 'vista')) return { tipo: 'vista' };
    const nao = partes.filter((p, i) => res[i].tipo === 'nao_vista');
    if (nao.length) return { tipo: 'nao_vista', partes: nao };
    const inc = res.find(r => r.tipo === 'incerta');
    return { tipo: 'incerta', lema: inc.lema };
  }
  const s = semAcento(forma);
  for (const r of vistas.radicais){
    if (s.startsWith(r.radical) && s.length - r.radical.length <= 5) return { tipo: 'incerta', lema: r.lema };
  }
  return { tipo: 'nao_vista', partes: [forma] };
}

// Palavras de `textoFr` que o aluno não viu em `unidadeId` (mapa NOVO), no `contexto` (string ou {tipo, posicao}).
// Devolve { nao_vistas: [forma], incertas: [{palavra, lema}], nomes_proprios: [original] }, sem repetição, na ordem do texto.
// Nome próprio = palavra com maiúscula no meio da frase que o mapa não ensina (ex.: Paris, Tokyo) ou nome da lista
// `nomes_proprios` de formas_extras.json (nome de pessoa no começo da frase, ex.: "Ana est brésilienne."); fica fora do erro.
// Palavra do mapa com maiúscula ("au Portugal" antes do cartão) continua sendo não vista.
function validarTexto(textoFr, contexto, unidadeId, mapa, excecoes, dados){
  const ctx = contextoNormalizado(contexto);
  const d = dadosOuPadrao(dados);
  const vistas = vistasComMemo(mapa, excecoes, unidadeId, ctx, d);
  const conhecidas = indiceDeEnsino(mapa, d);
  const nomesProprios = new Set(((d.formasExtras && d.formasExtras.nomes_proprios) || []).map(n => normalizar(n).toLowerCase()));
  const nao = [], inc = [], nomes = [];
  const ja = new Set();
  for (const t of tokenizar(textoFr)){
    const r = classificar(t.forma, vistas, conhecidas);
    if (r.tipo === 'vista') continue;
    const nomeDaLista = nomesProprios.has(t.forma);
    if (nomeDaLista || (/^[A-ZÀ-ÖØ-Þ]/.test(t.original) && !t.inicioDeFrase && !conhecidas.has(t.forma))){ if (!ja.has('N' + t.original)){ ja.add('N' + t.original); nomes.push(t.original); } continue; }
    if (r.tipo === 'incerta'){ if (!ja.has('I' + t.forma)){ ja.add('I' + t.forma); inc.push({ palavra: t.forma, lema: r.lema }); } continue; }
    // Palavra conhecida do mapa ou com prefixo elidido que falta ("quelqu'un"): mostra o token inteiro; senão, só as partes que faltam.
    const palavra = conhecidas.has(t.forma) || r.partes.some(p => p.endsWith("'")) ? t.forma : r.partes.join(' ');
    if (!ja.has('V' + palavra)){ ja.add('V' + palavra); nao.push(palavra); }
  }
  return { nao_vistas: nao, incertas: inc, nomes_proprios: nomes };
}

// Onde cada forma é ensinada no mapa (primeiro cartão ou nota com aquela forma): para a lista de reescrita dizer "vira cartão em X".
// Formas dos grupos funcionais com `lema` (ex.: "veut") entram na unidade do cartão do lema.
const memoIndice = new WeakMap();
function indiceDeEnsino(mapa, dados){
  const d = dadosOuPadrao(dados);
  if (!memoIndice.has(mapa)) memoIndice.set(mapa, new WeakMap());
  const porDados = memoIndice.get(mapa);
  if (porDados.has(d)) return porDados.get(d);
  const extras = (d.formasExtras || {}).formas || {};
  const funcionais = conjuntoFuncional(d);
  const gruposComLema = ((d.funcionais && d.funcionais.grupos) || []).filter(g => g.lema);
  const idx = new Map();
  const marca = (f, v) => { if (!idx.has(f)) idx.set(f, v); };
  for (const it of M.unidadesEmOrdem(mapa)){
    const u = it.unidade;
    for (const c of u.cartoes || []){
      const v = { unidade: u.id, nome: u.nome, como: 'cartão', palavra: c.palavra };
      for (const f of formasDaPalavra(c.palavra, extras, funcionais).todas) marca(f, v);
      for (const g of gruposComLema) if (alternativas(c.palavra).includes(g.lema)) g.palavras.forEach(f => marca(f.toLowerCase(), v));
    }
    for (const n of M.notasDaUnidade(u)) for (const p of M.palavrasDaNota(n)) for (const f of formasDaPalavra(p, extras, funcionais).todas) marca(f, { unidade: u.id, nome: u.nome, como: 'nota', palavra: p });
  }
  porDados.set(d, idx);
  return idx;
}

module.exports = {
  NOTAS_CONTAM_EM, tokenizar, partesDoToken, alternativas, formasGeradas, radical, formasDaPalavra, carregarDados,
  palavrasVistasAte, validarTexto, indiceDeEnsino, nivelDaUnidade,
};

if (require.main === module){
  if (process.argv[2] === '--relatorio'){
    const { gerarRelatorio } = require('./curriculo_palavras_vistas_relatorio.js');
    const r = gerarRelatorio();
    console.log(r.resumo);
    console.log('gravado em ' + path.relative(ROOT, r.arquivo));
    process.exit(0);
  }
  console.log('Uso: node fr/scripts/curriculo_palavras_vistas.js --relatorio');
}
