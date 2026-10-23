#!/usr/bin/env node
// Mapa do portão de lição do notification-cron (Etapa 0b do currículo, docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.4).
//
// O cron conta "N palavras prontas para revisar" e só pode contar a palavra cuja lição o aluno já fez (espelho de
// isCardLessonCompleted, shared/core/revisao-decks.js). Antes ele tirava unidade e posição do id do cartão por regex e
// usava LESSON_VOCAB_MAP, regerado à mão. Com a chave estável (`k`, fr) o id não diz mais onde a palavra mora, então o
// cron passa a ler STUDY_ITEM_GATE, GERADO aqui a partir do conteúdo:
//
//   STUDY_ITEM_GATE[appKey][id do cartão A da palavra] = [unidade atual, índice da lição que a ensina (-1 = nenhuma)]
//                                                      ou [unidade, lição, id do sobrevivente]  (chave fundida)
//
// - fr: fr/content.js + fr/curriculum-changes.js (aposentados ficam de fora; chave fundida aponta para o sobrevivente,
//   para o cron contar a palavra uma vez só enquanto o aluno não abre o app). zh: zh/content.js + zh/curriculum-changes.js
//   (desde o C1 da paridade o zh também tem a chave `k`, com o mesmo valor do id antigo: o mapa do zh não mudou).
// - "Na frase" não entra: o cron conta palavras (o cartão de frase nunca contou).
// - O trecho entre os marcadores ">>> GERADO: STUDY_ITEM_GATE" e "<<< GERADO: STUDY_ITEM_GATE" é reescrito nos dois arquivos:
//   supabase/functions/notification-cron/index.ts e docs/deploy/notification-cron-para-colar-no-painel.ts.
//
// Uso: node scripts/gerar_mapa_cron.js            (reescreve o trecho)
//      node scripts/gerar_mapa_cron.js --conferir (só confere; sai com 1 se algum dos dois estiver desatualizado)
// Mudou o mapa = a função precisa de novo deploy (passo manual).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TARGETS = ['supabase/functions/notification-cron/index.ts', 'docs/deploy/notification-cron-para-colar-no-painel.ts'];
// Sites descobertos sozinhos (scripts/lib/sites.js); cada um com o seu <site>/curriculum-changes.js (C1 da paridade: o zh
// também tem). Ordem alfabética (fr, zh), a mesma de antes: o trecho gerado não muda.
const LANGS = require('./lib/sites.js').discoverSites(ROOT).map(s => ({
  lang: s.site, appKey: s.appKey,
  changes: fs.existsSync(path.join(ROOT, s.site, 'curriculum-changes.js')) ? s.site + '/curriculum-changes.js' : null,
}));
const BEGIN = '// >>> GERADO: STUDY_ITEM_GATE';
const END = '// <<< GERADO: STUDY_ITEM_GATE';

// Unidades do idioma com o conteúdo de PRODUÇÃO e as funções reais de id e de lição.
// contentSource: texto alternativo de <lang>/content.js (testes com conteúdo v2); omitido = arquivo em disco.
function loadLang(lang, contentSource){
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  const run = (code, file) => vm.runInContext(code, ctx, { filename: file });
  run(read('languages/registry.js'), 'languages/registry.js');
  run(read('shared/flashcard-model.js'), 'shared/flashcard-model.js');
  run(read('shared/study-trail-model.js'), 'shared/study-trail-model.js');
  const core = read('shared/core/exercicios-licao.js');
  const m = /function lessonIndexForVocabIdx\(unit, vocabIdx\)\{[\s\S]*?\n\}/.exec(core);
  if (!m) throw new Error('lessonIndexForVocabIdx não encontrada em shared/core/exercicios-licao.js');
  run(m[0], 'shared/core/exercicios-licao.js#lessonIndexForVocabIdx');
  const composed = require(path.join(ROOT, 'scripts/lib/course-content.js')).composedSource(lang);
  const src = contentSource == null ? composed : composed.replace(read(lang + '/content.js'), () => contentSource);
  run(src + '\n;this.UNITS = UNITS;', lang + '/content.js');
  return ctx;
}

// Mapa de um idioma. units: UNITS; changes: { STUDY_KEY_MERGES, STUDY_RETIRED_KEYS } (fr) ou null;
// fns: { studyWordCardId, lessonIndexForVocabIdx } (as de produção). Puro.
function buildGate(units, changes, fns){
  const retired = new Set((changes && changes.STUDY_RETIRED_KEYS) || []);
  const merges = (changes && changes.STUDY_KEY_MERGES) || {};
  const gate = {};
  (units || []).forEach(u => {
    (u.vocab || []).forEach((v, i) => {
      if (v && typeof v.k === 'string' && retired.has(v.k)) return;
      const id = fns.studyWordCardId(u, i);
      if (Object.prototype.hasOwnProperty.call(gate, id)) throw new Error(`id repetido no conteúdo: ${id}`);
      gate[id] = [String(u.id), fns.lessonIndexForVocabIdx(u, i)];
    });
  });
  // Chave fundida: o save de quem ainda não abriu o app tem o id antigo. Conta pela lição do sobrevivente e como a
  // MESMA palavra (3º elemento), igual ao que o cliente faz no carregamento.
  const resolve = (k) => { const seen = new Set(); while (Object.prototype.hasOwnProperty.call(merges, k) && merges[k] && !seen.has(k)){ seen.add(k); k = merges[k]; } return k; };
  Object.keys(merges).sort().forEach(oldKey => {
    const target = resolve(oldKey);
    const oldId = 'u' + oldKey, targetId = 'u' + target;
    if (retired.has(target) || !gate[targetId] || gate[oldId]) return;
    gate[oldId] = [gate[targetId][0], gate[targetId][1], targetId];
  });
  return gate;
}

function gateForLang(spec, contentSource, changesOverride){
  const ctx = loadLang(spec.lang, contentSource);
  const changes = changesOverride !== undefined ? changesOverride
    : (spec.changes ? require(path.join(ROOT, spec.changes)) : null);
  return buildGate(ctx.UNITS, changes, { studyWordCardId: ctx.studyWordCardId, lessonIndexForVocabIdx: ctx.lessonIndexForVocabIdx });
}

// Texto TS do trecho gerado: uma linha por unidade (diff legível).
function gateText(gates){
  const lines = [
    BEGIN + ' (scripts/gerar_mapa_cron.js, a partir de fr/content.js, fr/curriculum-changes.js e zh/content.js; NÃO editar à mão)',
    '// [unidade atual, índice da lição que ensina a palavra (-1 = nenhuma)] ou, chave fundida, [unidade, lição, id do sobrevivente].',
    'const STUDY_ITEM_GATE: Record<string, Record<string, [string, number, string?]>> = {',
  ];
  Object.keys(gates).forEach(appKey => {
    lines.push(`  ${appKey}: {`);
    const byUnit = new Map();
    Object.entries(gates[appKey]).forEach(([id, e]) => {
      if (!byUnit.has(e[0])) byUnit.set(e[0], []);
      byUnit.get(e[0]).push(JSON.stringify(id) + ': ' + JSON.stringify(e).replace(/,/g, ', '));
    });
    byUnit.forEach(entries => lines.push('    ' + entries.join(', ') + ','));
    lines.push('  },');
  });
  lines.push('};', END);
  return lines.join('\n');
}

function currentText(){
  const gates = {};
  LANGS.forEach(spec => { gates[spec.appKey] = gateForLang(spec); });
  return gateText(gates);
}

function replaceBlock(src, block, file){
  const a = src.indexOf(BEGIN), b = src.indexOf(END);
  if (a < 0 || b < a) throw new Error(`marcadores do trecho gerado não encontrados em ${file}`);
  return src.slice(0, a) + block + src.slice(b + END.length);
}

if (require.main === module){
  const block = currentText();
  const check = process.argv.includes('--conferir');
  let stale = 0;
  TARGETS.forEach(file => {
    const src = read(file);
    const next = replaceBlock(src, block, file);
    if (next === src){ console.log(`ok: ${file}`); return; }
    stale++;
    if (check) console.log(`desatualizado: ${file} (rode node scripts/gerar_mapa_cron.js)`);
    else { fs.writeFileSync(path.join(ROOT, file), next); console.log(`reescrito: ${file} (precisa de novo deploy do notification-cron)`); }
  });
  if (check && stale) process.exit(1);
}

module.exports = { loadLang, buildGate, gateForLang, gateText, currentText, replaceBlock, LANGS, TARGETS, BEGIN, END };
