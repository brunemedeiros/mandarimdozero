#!/usr/bin/env node
// Contas do mapa do currículo em dados (decisões 228, 232 e 259 do docs/i18n/curriculo/12-decisoes-apos-maquete-m1.md).
//
// Fonte única: docs/i18n/curriculo/dados/mapa.json (mapa A1 e A2 aprovado e congelado) e dados/excecoes.json.
// Aqui ficam só funções puras sobre esses dados (cartões, A/B, lições, tempo, notas, conferências das regras 13, 14 e 12)
// e a saída de terminal. Ninguém digita total: o 08 e os relatórios usam o que sai daqui.
//
// Uso: node fr/scripts/curriculo_mapa.js --tabela     (contas por módulo e por nível)
//      node fr/scripts/curriculo_mapa.js --conferir   (regras 12, 13, 14, teto de tempo e títulos; sai com 1 se algo falhar)
// Teste: node tests/curriculo/test_mapa_totais.js
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DADOS = path.join(ROOT, 'docs', 'i18n', 'curriculo', 'dados');

// Regras numéricas do 08 (seção 1 e seção 2.1). Mudou uma regra? Muda aqui e no 15, nunca no meio do código.
const REGRAS = {
  limitePalavras: { A1: 12, A2: 12 },          // regra 13 (decisões 139 e 231)
  palavrasAte3Licoes: 10,                     // até 10 palavras: 3 lições + Revisão; acima: 4 lições + Revisão (regra 13)
  tetoModuloMin: 230,                         // regra 16: 3h50 por módulo (decisão 257); o último módulo de cada nível é exceção
  tempoA2: { vocabularioMin: 40, gramaticaMin: 25 }, // 08 seção 1, linha "A2: tempo de trilha" (confiança baixa)
};

function carregarJson(nome, dir){ return JSON.parse(fs.readFileSync(path.join(dir || DADOS, nome), 'utf8')); }
function carregarMapa(dir){ return carregarJson('mapa.json', dir); }
function carregarExcecoes(dir){ return carregarJson('excecoes.json', dir); }

// Todas as unidades na ordem da trilha, com nível, módulo e rótulo de posição gerado ("M1.1"; decisão 229).
function unidadesEmOrdem(mapa){
  const lista = [];
  for (const nivel of mapa.niveis){
    for (const mod of nivel.modulos){
      for (const u of mod.unidades){
        lista.push({ nivel: nivel.id, modulo: mod.id, posicao: `M${mod.ordem}.${u.ordem}`, ordemGlobal: lista.length, unidade: u });
      }
    }
  }
  return lista;
}
function indicePorId(mapa){
  const idx = {};
  for (const item of unidadesEmOrdem(mapa)) idx[item.unidade.id] = item;
  return idx;
}

// Palavras da unidade = cartões fora da lição de pronúncia (os cartões do alfabeto contam como cartão, não como palavra).
function palavrasDaUnidade(u){ return (u.cartoes || []).filter(c => c.licao !== 'pronuncia'); }
function cartoesDaUnidade(u){ return (u.cartoes || []).length; }
// A/B: dois cartões por palavra, um só para os de reconhecimento (decisão 218; regra 12).
function cartoesAB(u){ return (u.cartoes || []).reduce((s, c) => s + (c.reconhecimento_so ? 1 : 2), 0); }

// Lições da trilha numa unidade de vocabulário, já com a Revisão da unidade. Gramática não entra na conta (08 seção 1).
// `licoes_08` só existe quando o 08 dá um número diferente da regra (ex.: lição de pronúncia do alfabeto).
function licoesDaUnidade(u){
  if (u.tipo !== 'vocabulario') return 0;
  if (typeof u.licoes_08 === 'number') return u.licoes_08;
  return licoesPelaRegra(u);
}
function licoesPelaRegra(u){
  if (u.tipo !== 'vocabulario') return 0;
  const n = palavrasDaUnidade(u).length;
  return (n > REGRAS.palavrasAte3Licoes ? 4 : 3) + (u.licao_pronuncia ? 1 : 0) + 1;
}

// Notas que contam: todas menos as cortadas e as que só entram "se couber" (o 08 diz "~76, 77 com le château").
// "candidata" e "proposta" contam, como na recontagem do 08 (decisão 202).
const STATUS_FORA_DA_CONTA = ['cortada', 'se couber'];
function notaConta(n){ return !STATUS_FORA_DA_CONTA.includes(n.status); }
function notasDaUnidade(u){ return (u.notas || []).filter(notaConta); }
function notasCondicionais(u){ return (u.notas || []).filter(n => n.status === 'se couber'); }

// Tempo do módulo em minutos. A2: regra do 08 (40 min por unidade de vocabulário de até 12 palavras, 25 por gramática).
// A1: o 08 só dá regras de diferença (+5 min por palavra, +10 min pela 4ª lição) sobre estimativas feitas à mão;
// sem regra absoluta, vale o valor do 08 (tempo_08_min). Ver docs/i18n/curriculo/dados/ACHADOS.md.
function tempoDoModulo(nivelId, mod){
  if (nivelId === 'A2'){
    const vocab = mod.unidades.filter(u => u.tipo === 'vocabulario').length;
    const gram = mod.unidades.filter(u => u.tipo === 'gramatica').length;
    return { min: vocab * REGRAS.tempoA2.vocabularioMin + gram * REGRAS.tempoA2.gramaticaMin, regra: 'A2: 40 min por vocabulário, 25 por gramática' };
  }
  return { min: mod.tempo_08_min, regra: 'A1: estimativa do 08 (sem regra absoluta)' };
}
function formatarTempo(min){ return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`; }

function contasDoModulo(nivelId, mod){
  const us = mod.unidades;
  const vocab = us.filter(u => u.tipo === 'vocabulario');
  const cartoes = us.flatMap(u => u.cartoes || []);
  return {
    id: mod.id, nome: mod.nome, ordem: mod.ordem,
    unidades: us.length, vocabulario: vocab.length, gramatica: us.length - vocab.length,
    cartoes: cartoes.length, ab: us.reduce((s, u) => s + cartoesAB(u), 0),
    publicados: cartoes.filter(c => c.origem === 'publicado').length, novos: cartoes.filter(c => c.origem === 'novo').length,
    licoes: us.reduce((s, u) => s + licoesDaUnidade(u), 0),
    notas: us.reduce((s, u) => s + notasDaUnidade(u).length, 0),
    notasCondicionais: us.reduce((s, u) => s + notasCondicionais(u).length, 0),
    tempo: tempoDoModulo(nivelId, mod).min,
  };
}
function contasDoNivel(nivel){
  const modulos = nivel.modulos.map(m => contasDoModulo(nivel.id, m));
  const soma = (k) => modulos.reduce((s, m) => s + m[k], 0);
  return {
    id: nivel.id, modulos: modulos.length,
    unidades: soma('unidades'), vocabulario: soma('vocabulario'), gramatica: soma('gramatica'),
    cartoes: soma('cartoes'), ab: soma('ab'), publicados: soma('publicados'), novos: soma('novos'),
    licoes: soma('licoes'), notas: soma('notas'), notasCondicionais: soma('notasCondicionais'), tempo: soma('tempo'),
    porModulo: modulos,
  };
}
function contas(mapa){ return mapa.niveis.map(contasDoNivel); }

// ---------------------------------------------------------------- conferências (cada uma devolve a lista de problemas)

// Regra 13: palavras por unidade de vocabulário; conjunto fechado só passa se estiver em excecoes.json.
function conferirLimitePalavras(mapa, excecoes){
  const liberadas = new Set((excecoes.unidades_acima_do_limite || []).map(e => e.unidade));
  const problemas = [];
  for (const it of unidadesEmOrdem(mapa)){
    const u = it.unidade;
    if (u.tipo !== 'vocabulario') continue;
    const n = palavrasDaUnidade(u).length, limite = REGRAS.limitePalavras[it.nivel];
    if (n > limite && !liberadas.has(u.id)) problemas.push({ unidade: u.id, nome: u.nome, palavras: n, limite });
  }
  return problemas;
}

// Regra 14: uma palavra, um cartão (também entre A1 e A2). Repetição só se estiver em excecoes.json.
function normalizarPalavra(p){ return p.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '); }
function conferirRegra14(mapa, excecoes){
  const aceitas = new Set((excecoes.regra14_repeticoes_aceitas || []).map(e => normalizarPalavra(e.palavra || e)));
  const onde = {};
  for (const it of unidadesEmOrdem(mapa)){
    for (const c of it.unidade.cartoes || []){
      const k = normalizarPalavra(c.palavra);
      (onde[k] = onde[k] || []).push(it.unidade.id);
    }
  }
  return Object.entries(onde).filter(([k, us]) => us.length > 1 && !aceitas.has(k)).map(([palavra, unidades]) => ({ palavra, unidades }));
}

// Chaves: nenhuma chave repetida; nenhuma chave "publicada" fora do livro-razão.
function conferirChaves(mapa, idsPublicados){
  const vistas = {}, problemas = [];
  const publicados = idsPublicados ? new Set(idsPublicados.cards || []) : null;
  for (const it of unidadesEmOrdem(mapa)){
    for (const c of it.unidade.cartoes || []){
      for (const k of [c.chave].concat(c.chaves_fundidas || [])){
        if (k === 'nova') continue;
        if (vistas[k]) problemas.push({ chave: k, problema: 'repetida', unidades: [vistas[k], it.unidade.id] });
        vistas[k] = it.unidade.id;
        if (publicados && !publicados.has('u' + k)) problemas.push({ chave: k, problema: 'fora do livro-razão', unidade: it.unidade.id });
      }
      if ((c.chave === 'nova') !== (c.origem === 'novo')) problemas.push({ chave: c.chave, palavra: c.palavra, problema: 'origem não bate com a chave' });
    }
  }
  return problemas;
}
// Cartões de palavra publicados (chave -vN sem -b) que não aparecem no mapa (nem como chave, nem como fundida).
function chavesPublicadasForaDoMapa(mapa, idsPublicados){
  const noMapa = new Set();
  for (const it of unidadesEmOrdem(mapa)) for (const c of it.unidade.cartoes || []) [c.chave].concat(c.chaves_fundidas || []).forEach(k => noMapa.add(k));
  return (idsPublicados.cards || []).map(id => id.slice(1)).filter(k => /^A[12]-[0-9]+-v[0-9]+$/.test(k) && !noMapa.has(k));
}

// Regra 12: cada gramática tem versão grátis em unidades ANTERIORES a ela na trilha (A1 antes de A2).
function conferirVersaoGratis(mapa){
  const idx = indicePorId(mapa), problemas = [];
  for (const it of unidadesEmOrdem(mapa)){
    const u = it.unidade;
    if (u.tipo !== 'gramatica') continue;
    const em = u.versao_gratis_em || [];
    if (!em.length) { problemas.push({ gramatica: u.id, problema: 'sem versao_gratis_em' }); continue; }
    for (const id of em){
      if (!idx[id]) problemas.push({ gramatica: u.id, problema: 'unidade inexistente', unidade: id });
      else if (idx[id].ordemGlobal >= it.ordemGlobal) problemas.push({ gramatica: u.id, problema: 'versão grátis não vem antes', unidade: id });
      else if (idx[id].unidade.tipo === 'gramatica') problemas.push({ gramatica: u.id, problema: 'versão grátis numa gramática (Premium)', unidade: id });
    }
  }
  return problemas;
}
// A versão grátis tem um lugar só: "versao_gratis_em" na linha da gramática (decisão 260). A unidade de vocabulário não repete a ligação;
// quem precisa saber o que uma unidade abriga usa esta função derivada.
function gramaticasAbrigadasPor(mapa){
  const abriga = {};
  for (const it of unidadesEmOrdem(mapa)){
    if (it.unidade.tipo !== 'gramatica') continue;
    for (const id of it.unidade.versao_gratis_em || []) (abriga[id] = abriga[id] || []).push(it.unidade.id);
  }
  return abriga;
}

// Regra 16: teto de tempo por módulo, menos o último módulo de cada nível.
function conferirTetoTempo(mapa){
  const problemas = [];
  for (const nivel of mapa.niveis){
    nivel.modulos.forEach((m, i) => {
      const ultimo = i === nivel.modulos.length - 1;
      const t = tempoDoModulo(nivel.id, m).min;
      if (!ultimo && t > REGRAS.tetoModuloMin) problemas.push({ modulo: m.id, nome: m.nome, tempo: formatarTempo(t), teto: formatarTempo(REGRAS.tetoModuloMin) });
    });
  }
  return problemas;
}

// Decisão 246: nota de vocabulário = "Outras palavras de/em/sobre ..." (lista da mesma categoria) ou "Mais sobre ...".
const TITULO_NOTA_VOCAB = /^(Outras palavras (de|em|sobre) |Mais sobre )\S/;
function conferirTitulosNotasVocab(mapa){
  const problemas = [];
  for (const it of unidadesEmOrdem(mapa)){
    for (const n of it.unidade.notas || []){
      if (n.tipo === 'Vocab' && !TITULO_NOTA_VOCAB.test(n.titulo)) problemas.push({ unidade: it.unidade.id, titulo: n.titulo });
    }
  }
  return problemas;
}

// id_funcao (decisão 238): único, kebab-case, independente do idioma estudado.
function conferirIdFuncao(mapa){
  const vistos = {}, problemas = [];
  for (const it of unidadesEmOrdem(mapa)){
    const f = it.unidade.id_funcao;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f || '')) problemas.push({ unidade: it.unidade.id, id_funcao: f, problema: 'formato' });
    if (vistos[f]) problemas.push({ unidade: it.unidade.id, id_funcao: f, problema: 'repetido', com: vistos[f] });
    vistos[f] = it.unidade.id;
  }
  return problemas;
}

// Exceções: toda unidade citada em excecoes.json existe no mapa.
function conferirExcecoes(mapa, excecoes){
  const idx = indicePorId(mapa), problemas = [];
  for (const e of excecoes.palavras_antes_do_cartao || []){
    for (const id of e.unidades || []) if (!idx[id]) problemas.push({ expressao: e.expressao, unidade: id });
    for (const c of e.cartao_em || []) if (!idx[c.unidade]) problemas.push({ expressao: e.expressao, unidade: c.unidade });
  }
  for (const e of excecoes.unidades_acima_do_limite || []) if (!idx[e.unidade]) problemas.push({ unidade: e.unidade });
  return problemas;
}

function conferirTudo(mapa, excecoes, idsPublicados){
  return {
    limitePalavras: conferirLimitePalavras(mapa, excecoes),
    regra14: conferirRegra14(mapa, excecoes),
    chaves: conferirChaves(mapa, idsPublicados),
    versaoGratis: conferirVersaoGratis(mapa),
    tetoTempo: conferirTetoTempo(mapa),
    titulosNotasVocab: conferirTitulosNotasVocab(mapa),
    idFuncao: conferirIdFuncao(mapa),
    excecoes: conferirExcecoes(mapa, excecoes),
  };
}

// ---------------------------------------------------------------- saída de terminal
function tabela(mapa){
  const linhas = [];
  for (const n of contas(mapa)){
    linhas.push(`\n${n.id}: ${n.modulos} módulos, ${n.unidades} unidades (${n.vocabulario} vocabulário + ${n.gramatica} gramática), ` +
      `${n.cartoes} cartões (${n.ab} A/B; ${n.novos} novos + ${n.publicados} publicados), ~${n.licoes} lições, ${n.notas} notas` +
      (n.notasCondicionais ? ` (+${n.notasCondicionais} condicionais)` : '') + `, ~${formatarTempo(n.tempo)}`);
    linhas.push('  mód  id        unid voc gram cart  A/B lições notas tempo  nome');
    for (const m of n.porModulo){
      linhas.push(`  M${String(m.ordem).padEnd(3)} ${m.id.padEnd(9)} ${String(m.unidades).padStart(4)} ${String(m.vocabulario).padStart(3)} ` +
        `${String(m.gramatica).padStart(4)} ${String(m.cartoes).padStart(4)} ${String(m.ab).padStart(4)} ${String(m.licoes).padStart(6)} ` +
        `${String(m.notas).padStart(5)} ${formatarTempo(m.tempo).padStart(5)}  ${m.nome}`);
    }
  }
  return linhas.join('\n');
}

module.exports = {
  REGRAS, carregarMapa, carregarExcecoes, unidadesEmOrdem, indicePorId, palavrasDaUnidade, cartoesDaUnidade, cartoesAB,
  licoesDaUnidade, licoesPelaRegra, notasDaUnidade, tempoDoModulo, formatarTempo, contasDoModulo, contasDoNivel, contas,
  conferirLimitePalavras, conferirRegra14, conferirChaves, chavesPublicadasForaDoMapa, conferirVersaoGratis,
  gramaticasAbrigadasPor, conferirTetoTempo, conferirTitulosNotasVocab, conferirIdFuncao, conferirExcecoes, conferirTudo, tabela,
  TITULO_NOTA_VOCAB,
};

if (require.main === module){
  const arg = process.argv[2];
  const mapa = carregarMapa();
  if (arg === '--tabela'){ console.log(tabela(mapa)); process.exit(0); }
  if (arg === '--conferir'){
    const ids = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr', 'published_ids.json'), 'utf8'));
    const r = conferirTudo(mapa, carregarExcecoes(), ids);
    let falhas = 0;
    for (const [nome, lista] of Object.entries(r)){ console.log(`${nome}: ${lista.length ? lista.length + ' problema(s)' : 'ok'}`); lista.forEach(p => console.log('  ' + JSON.stringify(p))); falhas += lista.length; }
    const fora = chavesPublicadasForaDoMapa(mapa, ids);
    console.log(`cartões publicados fora do mapa: ${fora.length ? fora.join(', ') : 'nenhum'}`);
    process.exit(falhas + fora.length ? 1 : 0);
  }
  console.log('Uso: node fr/scripts/curriculo_mapa.js --tabela | --conferir');
}
