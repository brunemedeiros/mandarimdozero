#!/usr/bin/env node
// Livro-razão de ids publicados do francês (Etapa 0a, docs/i18n/curriculo/04-lacunas-e-propostas-fr.md, 2.11 item 2).
//
// fr/published_ids.json guarda TODO id que já foi ao ar: cartões da trilha (palavra A/B e "Na frase"), unidades,
// módulos e lições ("<unidade>/<lição>"). Só cresce (união com o que já estava). O teste
// tests/curriculo-ids/test_ids_publicados.js falha se um id dele sumir do conteúdo sem estar em fr/curriculum-changes.js.
//
// Uso: node fr/scripts/ids_publicados.js            (acrescenta os ids do conteúdo atual ao livro-razão)
//      node fr/scripts/ids_publicados.js --conferir (só confere; sai com 1 se houver id atual fora do livro-razão)
// Rodar a gravação ANTES de publicar qualquer mudança de conteúdo (o script de operações da Etapa 0b chama este).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const LEDGER = path.join(ROOT, 'fr', 'published_ids.json');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Monta os cartões da trilha com os arquivos de PRODUÇÃO (shared/study-trail-model.js + motor), igual ao app.
// contentSource: texto alternativo de fr/content.js (testes com conteúdo v2); omitido = arquivo em disco.
function buildStudyCards(contentSource){
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  const run = (code, file) => vm.runInContext(code, ctx, { filename: file });
  run(read('languages/registry.js'), 'languages/registry.js');
  run(read('shared/flashcard-model.js'), 'shared/flashcard-model.js');
  run(read('shared/study-trail-model.js'), 'shared/study-trail-model.js');
  // flashcardIdForRow mora em shared/core/revisao-decks.js (arquivo que depende do DOM): só a função.
  const core = read('shared/core/revisao-decks.js');
  const m = /function flashcardIdForRow\(prefix, row\)\{[\s\S]*?\n\}/.exec(core);
  if (!m) throw new Error('flashcardIdForRow não encontrada em shared/core/revisao-decks.js');
  run(m[0], 'shared/core/revisao-decks.js#flashcardIdForRow');
  const composed = require(path.join(ROOT, 'scripts/lib/course-content.js')).composedSource('fr');
  const src = contentSource == null ? composed : composed.replace(read('fr/content.js'), () => contentSource);
  run(src + '\n;this.UNITS = UNITS; this.MODULES = MODULES;', 'fr/content.js');
  run(`this.__cards = (function(){
    const cards = [];
    UNITS.forEach(u => { if (u.type === 'grammar') return; (u.vocab || []).forEach((v, i) => buildStudyWordCards(u, v, i, 'frances').forEach(c => cards.push(c))); });
    buildStudyPhraseCards(UNITS, 'frances').forEach(c => cards.push(c));
    return cards;
  })();`, 'build');
  return { cards: ctx.__cards, UNITS: ctx.UNITS, MODULES: ctx.MODULES, ctx };
}

function currentIds(contentSource){
  const { cards, UNITS, MODULES } = buildStudyCards(contentSource);
  return {
    cards: cards.map(c => c.id).sort(),
    units: UNITS.map(u => u.id),
    modules: MODULES.map(mo => mo.id),
    lessons: UNITS.flatMap(u => (u.lessons || []).map(l => u.id + '/' + l.id)),
  };
}

// A garantia (2.11 item 2): todo id do livro-razão existe no conteúdo atual OU está coberto por uma mudança de
// currículo. current: { cards, units, modules, lessons } (arrays); changes: o que fr/curriculum-changes.js exporta.
// Devolve a lista de problemas (vazia = ok).
function checkLedger(ledger, current, changes){
  const ch = changes || {};
  const merges = ch.STUDY_KEY_MERGES || {}, retired = new Set(ch.STUDY_RETIRED_KEYS || []);
  const has = (arr) => { const s = new Set(arr || []); return x => s.has(x); };
  const cur = { cards: has(current.cards), units: has(current.units), modules: has(current.modules), lessons: has(current.lessons) };
  const resolve = (k) => { const seen = new Set(); while (Object.prototype.hasOwnProperty.call(merges, k) && merges[k] && !seen.has(k)){ seen.add(k); k = merges[k]; } return k; };
  const problems = [];
  (ledger.cards || []).forEach(id => {
    if (cur.cards(id)) return;
    const b = /-b$/.test(id), key = id.slice(1, b ? -2 : undefined);
    if (retired.has(key)) return;
    const target = resolve(key);
    if (target !== key){
      if (retired.has(target) || cur.cards('u' + target + (b ? '-b' : ''))) return;
      problems.push(`cartão ${id}: fundido em ${target}, que também não existe`);
      return;
    }
    problems.push(`cartão ${id} sumiu do conteúdo sem estar em STUDY_KEY_MERGES nem em STUDY_RETIRED_KEYS`);
  });
  const unitMerges = ch.UNIT_MERGES || {}, moduleMerges = ch.MODULE_MERGES || {}, retiredLessons = new Set(ch.RETIRED_LESSON_IDS || []);
  (ledger.units || []).forEach(id => { if (!cur.units(id) && !Object.prototype.hasOwnProperty.call(unitMerges, id)) problems.push(`unidade ${id} sumiu sem estar em UNIT_MERGES`); });
  (ledger.modules || []).forEach(id => { if (!cur.modules(id) && !Object.prototype.hasOwnProperty.call(moduleMerges, id)) problems.push(`módulo ${id} sumiu sem estar em MODULE_MERGES`); });
  (ledger.lessons || []).forEach(id => {
    if (cur.lessons(id) || retiredLessons.has(id)) return;
    const [u] = id.split('/');
    if (Object.prototype.hasOwnProperty.call(unitMerges, u)) return; // a unidade inteira saiu/fundiu
    problems.push(`lição ${id} sumiu sem estar em RETIRED_LESSON_IDS`);
  });
  return problems;
}

function readLedger(){
  if (!fs.existsSync(LEDGER)) return { cards: [], units: [], modules: [], lessons: [] };
  return JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
}

function union(a, b){ return Array.from(new Set([...(a || []), ...(b || [])])); }

function ledgerText(ledger){
  const out = {
    _doc: 'Livro-razão de ids publicados do francês. Só cresce. Um id daqui só pode sumir do conteúdo se estiver em ' +
      'fr/curriculum-changes.js (STUDY_KEY_MERGES, STUDY_RETIRED_KEYS, UNIT_MERGES, MODULE_MERGES, RETIRED_LESSON_IDS). ' +
      'Atualizar com: node fr/scripts/ids_publicados.js',
    cards: ledger.cards.slice().sort(),
    units: ledger.units.slice(),
    modules: ledger.modules.slice(),
    lessons: ledger.lessons.slice(),
  };
  // uma linha por id: diffs legíveis
  return JSON.stringify(out, null, 1).replace(/\n {2,}/g, '\n  ') + '\n';
}

if (require.main === module){
  const cur = currentIds();
  const old = readLedger();
  const next = { cards: union(old.cards, cur.cards), units: union(old.units, cur.units), modules: union(old.modules, cur.modules), lessons: union(old.lessons, cur.lessons) };
  const text = ledgerText(next);
  const stale = !fs.existsSync(LEDGER) || fs.readFileSync(LEDGER, 'utf8') !== text;
  const problems = checkLedger(old, cur, require(path.join(ROOT, 'fr', 'curriculum-changes.js')));
  problems.forEach(p => console.error('ERRO:', p));
  if (problems.length) process.exit(2);
  if (process.argv.includes('--conferir')){
    console.log(stale ? 'livro-razão desatualizado: rode node fr/scripts/ids_publicados.js' : `ok: ${next.cards.length} cartões, ${next.units.length} unidades, ${next.modules.length} módulos, ${next.lessons.length} lições`);
    process.exit(stale ? 1 : 0);
  }
  fs.writeFileSync(LEDGER, text);
  console.log(`livro-razão: ${next.cards.length} cartões, ${next.units.length} unidades, ${next.modules.length} módulos, ${next.lessons.length} lições`);
}

module.exports = { buildStudyCards, currentIds, readLedger, checkLedger, LEDGER };
