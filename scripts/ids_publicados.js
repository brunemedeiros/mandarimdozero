#!/usr/bin/env node
// Livro-razão de ids publicados, POR SITE (Etapa 0a no fr, docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.11 item 2;
// levado a todos os sites na Etapa 1 da paridade, docs/auditoria-paridade-fr-zh.md C1).
//
// <site>/published_ids.json guarda TODO id que já foi ao ar: cartões da trilha (palavra A/B e "Na frase"), unidades,
// módulos, lições ("<unidade>/<lição>") e, no site com hanzi-data.js (zh), os cartões de hanzi ("h<chave>"). Só cresce (união com o que já estava). O teste
// tests/curriculo-ids/test_ids_publicados.js falha se um id dele sumir do conteúdo sem estar em <site>/curriculum-changes.js.
// Os sites são descobertos sozinhos (scripts/lib/sites.js: pasta com index.html e app.js).
//
// Uso: node scripts/ids_publicados.js [fr zh ...]            (acrescenta os ids do conteúdo atual ao livro-razão; sem site = todos)
//      node scripts/ids_publicados.js [fr zh ...] --conferir (só confere; sai com 1 se houver id atual fora do livro-razão)
// Rodar a gravação ANTES de publicar qualquer mudança de conteúdo.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const { discoverSites } = require('./lib/sites.js');
const ledgerPath = site => path.join(ROOT, site, 'published_ids.json');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const appKeyOf = site => { const s = discoverSites(ROOT).find(x => x.site === site); if (!s) throw new Error('site desconhecido: ' + site); return s.appKey; };

// Monta os cartões da trilha com os arquivos de PRODUÇÃO (shared/study-trail-model.js + motor), igual ao app.
// contentSource: texto alternativo de <site>/content.js (testes com conteúdo v2); omitido = arquivo em disco.
function buildStudyCards(site, contentSource){
  const appKey = appKeyOf(site);
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
  const composed = require(path.join(ROOT, 'scripts/lib/course-content.js')).composedSource(site);
  const src = contentSource == null ? composed : composed.replace(read(site + '/content.js'), () => contentSource);
  // site sem módulos (zh hoje): MODULES = []
  run(src + '\n;this.UNITS = UNITS; this.MODULES = typeof MODULES !== "undefined" ? MODULES : [];', site + '/content.js');
  run(`this.__cards = (function(){
    const cards = [];
    UNITS.forEach(u => { if (u.type === 'grammar') return; (u.vocab || []).forEach((v, i) => buildStudyWordCards(u, v, i, ${JSON.stringify(appKey)}).forEach(c => cards.push(c))); });
    buildStudyPhraseCards(UNITS, ${JSON.stringify(appKey)}).forEach(c => cards.push(c));
    return cards;
  })();`, 'build');
  return { cards: ctx.__cards, UNITS: ctx.UNITS, MODULES: ctx.MODULES, ctx };
}

// Cartões de hanzi (site com <site>/hanzi-data.js, o zh; M1 da revisão do código compartilhado): ids montados com as
// funções de PRODUÇÃO hanziCardId/buildHanziCards de <site>/app.js. hanziSource: texto alternativo do hanzi-data.js (testes).
function buildHanziIds(site, hanziSource){
  const file = path.join(ROOT, site, 'hanzi-data.js');
  if (!fs.existsSync(file)) return [];
  const app = read(site + '/app.js');
  const pick = name => { const m = new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}').exec(app); if (!m) throw new Error(name + ' não encontrada em ' + site + '/app.js'); return m[0]; };
  const ctx = vm.createContext({});
  vm.runInContext((hanziSource == null ? fs.readFileSync(file, 'utf8') : hanziSource) + '\n' + pick('hanziCardId') + '\n' + pick('buildHanziCards') +
    '\n;this.__ids = buildHanziCards(HANZI_LESSONS).map(c => c.id);', ctx, { filename: site + '/hanzi-data.js' });
  return Array.from(ctx.__ids);
}

function currentIds(site, contentSource, hanziSource){
  const { cards, UNITS, MODULES } = buildStudyCards(site, contentSource);
  return {
    cards: cards.map(c => c.id).sort(),
    units: UNITS.map(u => String(u.id)),
    modules: MODULES.map(mo => String(mo.id)),
    lessons: UNITS.flatMap(u => (u.lessons || []).map(l => u.id + '/' + l.id)),
    hanzi: buildHanziIds(site, hanziSource),
  };
}

// A garantia (2.11 item 2): todo id do livro-razão existe no conteúdo atual OU está coberto por uma mudança de
// currículo. current: { cards, units, modules, lessons } (arrays); changes: o que <site>/curriculum-changes.js exporta.
// Devolve a lista de problemas (vazia = ok).
function checkLedger(ledger, current, changes){
  const ch = changes || {};
  const merges = ch.STUDY_KEY_MERGES || {}, retired = new Set(ch.STUDY_RETIRED_KEYS || []);
  const has = (arr) => { const s = new Set(arr || []); return x => s.has(x); };
  const cur = { cards: has(current.cards), units: has(current.units), modules: has(current.modules), lessons: has(current.lessons), hanzi: has(current.hanzi) };
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
  // hanzi (zh): id "h" + chave; só pode sumir se a chave estiver em HANZI_RETIRED_KEYS
  const retiredHanzi = new Set(ch.HANZI_RETIRED_KEYS || []);
  (ledger.hanzi || []).forEach(id => { if (!cur.hanzi(id) && !retiredHanzi.has(id.slice(1))) problems.push(`hanzi ${id} sumiu do conteúdo sem estar em HANZI_RETIRED_KEYS`); });
  return problems;
}

function readLedger(site){
  const LEDGER = ledgerPath(site);
  if (!fs.existsSync(LEDGER)) return { cards: [], units: [], modules: [], lessons: [] };
  return JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
}
function readChanges(site){
  const p = path.join(ROOT, site, 'curriculum-changes.js');
  return fs.existsSync(p) ? require(p) : {};
}

// h<lição>-c<n> em ordem numérica (h2-c0 antes de h10-c0)
function hanziSort(a, b){
  const pa = /^h(\d+)-c(\d+)$/.exec(a), pb = /^h(\d+)-c(\d+)$/.exec(b);
  if (pa && pb) return (+pa[1] - +pb[1]) || (+pa[2] - +pb[2]);
  return a < b ? -1 : a > b ? 1 : 0;
}

function union(a, b){ return Array.from(new Set([...(a || []), ...(b || [])])); }

function ledgerText(site, ledger){
  const out = {
    _doc: `Livro-razão de ids publicados do site ${site}/. Só cresce. Um id daqui só pode sumir do conteúdo se estiver em ` +
      `${site}/curriculum-changes.js (STUDY_KEY_MERGES, STUDY_RETIRED_KEYS, UNIT_MERGES, MODULE_MERGES, RETIRED_LESSON_IDS). ` +
      `Atualizar com: node scripts/ids_publicados.js ${site}`,
    cards: ledger.cards.slice().sort(),
    units: ledger.units.slice(),
    modules: ledger.modules.slice(),
    lessons: ledger.lessons.slice(),
  };
  if ((ledger.hanzi || []).length) out.hanzi = ledger.hanzi.slice().sort(hanziSort); // só o site com hanzi (zh)
  // uma linha por id: diffs legíveis
  return JSON.stringify(out, null, 1).replace(/\n {2,}/g, '\n  ') + '\n';
}

// Grava (ou só confere) o livro-razão de um site. Devolve o código de saída (0 ok, 1 desatualizado, 2 id perdido).
function runSite(site, conferir){
  const LEDGER = ledgerPath(site);
  const cur = currentIds(site);
  const old = readLedger(site);
  const next = { cards: union(old.cards, cur.cards), units: union(old.units, cur.units), modules: union(old.modules, cur.modules), lessons: union(old.lessons, cur.lessons), hanzi: union(old.hanzi, cur.hanzi) };
  const text = ledgerText(site, next);
  const stale = !fs.existsSync(LEDGER) || fs.readFileSync(LEDGER, 'utf8') !== text;
  const problems = checkLedger(old, cur, readChanges(site));
  problems.forEach(p => console.error(`ERRO (${site}):`, p));
  if (problems.length) return 2;
  const resumo = `${next.cards.length} cartões, ${next.units.length} unidades, ${next.modules.length} módulos, ${next.lessons.length} lições` +
    (next.hanzi.length ? `, ${next.hanzi.length} hanzi` : '');
  if (conferir){
    console.log(stale ? `${site}: livro-razão desatualizado: rode node scripts/ids_publicados.js ${site}` : `${site}: ok: ${resumo}`);
    return stale ? 1 : 0;
  }
  fs.writeFileSync(LEDGER, text);
  console.log(`${site}: livro-razão: ${resumo}`);
  return 0;
}

if (require.main === module){
  const args = process.argv.slice(2);
  const named = args.filter(a => !a.startsWith('--'));
  const sites = named.length ? named : discoverSites(ROOT).map(s => s.site);
  const codes = sites.map(site => runSite(site, args.includes('--conferir')));
  process.exit(Math.max(0, ...codes));
}

module.exports = { buildStudyCards, buildHanziIds, currentIds, readLedger, readChanges, checkLedger, ledgerPath, runSite, discoverSites: () => discoverSites(ROOT) };
