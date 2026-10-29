// M1 da revisão do código compartilhado (docs/revisao-codigo-compartilhado-erros.md, 2026-10-26): cartões de hanzi do zh
// com chave estável `k` (zh/hanzi-data.js), id = "h" + k (zh/app.js hanziCardId), no livro-razão zh/published_ids.json.
// Prova, com os arquivos de PRODUÇÃO:
//   1. todo hanzi tem chave única no formato, e o registro está em dia (scripts/congelar_chaves.js --conferir);
//   2. id do cartão = "h" + k, e todo id publicado (livro-razão, campo hanzi) continua existindo;
//   3. ida e volta do progresso: save -> cartões novos -> mergeSavedHanziCards devolve o FSRS de cada hanzi;
//   4. save ANTIGO (ids pela posição, o formato de antes) carrega inteiro (todo id do save casa com um cartão);
//   5. inserir um hanzi novo no começo da lição e reordenar a lição: o progresso continua no MESMO caractere
//      (com o id pela posição, o de antes, ele passaria para o vizinho: o teste mostra isso também);
//   6. o guarda do livro-razão acusa hanzi apagado sem HANZI_RETIRED_KEYS e aceita com ele.
// REPO_BASE=<worktree de antes> (opcional): compara os ids com os gerados pelo código de antes (mesma ordem).
// Rodar: node tests/curriculo-ids/test_hanzi_chaves.js
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const { check, summary } = require('../fase-e/harness');
const ids = require('../../scripts/ids_publicados.js');
const L = require('./lib');

const read = p => fs.readFileSync(path.join(L.ROOT, p), 'utf8');
const app = read('zh/app.js');
const pick = (src, name) => { const m = new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}').exec(src); if (!m) throw new Error(name); return m[0]; };

// contexto com o motor da trilha (STUDY_PROGRESS_FIELDS, mergeSavedHanziCards) + hanzi-data + funções do zh/app.js
function ctxWith(hanziSrc){
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  ['languages/registry.js', 'shared/flashcard-model.js', 'shared/study-trail-model.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  vm.runInContext(hanziSrc.replace('const HANZI_LESSONS', 'var HANZI_LESSONS').replace('const HANZI_ALL', 'var HANZI_ALL') + '\n' + pick(app, 'hanziCardId') + '\n' + pick(app, 'buildHanziCards'), ctx);
  return ctx;
}
const SRC = read('zh/hanzi-data.js');
const ctx = ctxWith(SRC);
const lessons = JSON.parse(JSON.stringify(ctx.HANZI_LESSONS));
const flat = lessons.flatMap((l, li) => l.map((h, ci) => ({ h, li, ci })));

// 1. chaves
const conf = cp.spawnSync(process.execPath, [path.join(L.ROOT, 'scripts/congelar_chaves.js'), 'zh', '--conferir'], { encoding: 'utf8' });
check('congelar_chaves zh --conferir: chaves de hanzi e registro em dia', conf.status === 0 && /ok: \d+ chaves de hanzi/.test(conf.stdout), conf.stdout + conf.stderr);
const keys = flat.map(x => x.h.k);
check(`todo hanzi tem chave (${flat.length})`, flat.length > 0 && keys.every(k => typeof k === 'string' && /^\d+-c\d+$/.test(k)));
check('chaves únicas', new Set(keys).size === keys.length);

// 2. ids e livro-razão
const cards = ctx.buildHanziCards(ctx.HANZI_LESSONS);
check('id do cartão = "h" + k', cards.length === flat.length && cards.every((c, i) => c.id === 'h' + flat[i].h.k));
const ledger = ids.readLedger('zh');
const curIds = new Set(cards.map(c => c.id));
check(`livro-razão tem os hanzi (${(ledger.hanzi || []).length}) e todos existem`, (ledger.hanzi || []).length >= flat.length && ledger.hanzi.every(id => curIds.has(id)));
check('todo id atual está no livro-razão', cards.every(c => ledger.hanzi.includes(c.id)));
if (process.env.REPO_BASE){
  const baseApp = fs.readFileSync(path.join(process.env.REPO_BASE, 'zh/app.js'), 'utf8');
  const bctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(process.env.REPO_BASE, 'zh/hanzi-data.js'), 'utf8') + '\n' + pick(baseApp, 'buildHanziCards') + ';this.__c = buildHanziCards(HANZI_LESSONS);', bctx);
  const strip = c => JSON.stringify(c);
  check(`REPO_BASE: mesmos ids na mesma ordem (${bctx.__c.length}) e cartões iguais campo a campo`, bctx.__c.length === cards.length && bctx.__c.every((c, i) => strip(c) === strip(cards[i])));
}

// 3. ida e volta
const rnd = L.rng(1310);
const fields = Array.from(vm.runInContext("STUDY_PROGRESS_FIELDS", ctx));
function studiedCopy(cs){
  return cs.map(c => Object.assign({}, c, { stability: +(rnd() * 50).toFixed(3), difficulty: +(1 + rnd() * 9).toFixed(3), reps: 1 + Math.floor(rnd() * 9), fsrsReps: 1 + Math.floor(rnd() * 9), lapses: Math.floor(rnd() * 3), state: 'review', due: 1700000000000 + Math.floor(rnd() * 1e9), lastReview: 1690000000000 + Math.floor(rnd() * 1e9), interval: Math.floor(rnd() * 60), fsrsMigrated: true }));
}
const saved = JSON.parse(JSON.stringify(studiedCopy(cards))); // o save grava o objeto inteiro (estado-salvar.js)
const fresh = ctx.buildHanziCards(ctx.HANZI_LESSONS);
ctx.mergeSavedHanziCards(fresh, saved);
const prog = c => JSON.stringify(fields.map(k => c[k]));
check(`ida e volta: progresso de todos os ${fresh.length} hanzi volta igual`, fresh.every((c, i) => prog(c) === prog(saved[i])));

// 4. save antigo (ids pela posição: h<lição>-c<índice>)
const oldSave = flat.map((x, i) => Object.assign({}, saved[i], { id: `h${x.li}-c${x.ci}` }));
const fresh2 = ctx.buildHanziCards(ctx.HANZI_LESSONS);
ctx.mergeSavedHanziCards(fresh2, oldSave);
check('save antigo (ids pela posição): todo id casa e o progresso volta', oldSave.every(s => curIds.has(s.id)) && fresh2.every((c, i) => prog(c) === prog(saved[i])));

// 5. inserir hanzi novo no começo da lição 0 e inverter a lição 1: o progresso segue o caractere
function editedSource(withKeys){
  const l2 = JSON.parse(JSON.stringify(lessons));
  if (!withKeys) l2.forEach(l => l.forEach(h => { delete h.k; }));
  l2[0].unshift(withKeys ? { k: '0-c' + (Math.max(...lessons[0].map(h => +h.k.split('-c')[1])) + 1), char: '新', pinyin: 'xīn', radicals: [] } : { char: '新', pinyin: 'xīn', radicals: [] });
  l2[1].reverse();
  return 'const HANZI_LESSONS = ' + JSON.stringify(l2) + ';\nconst HANZI_ALL = HANZI_LESSONS.flat();';
}
function followsChar(src){
  const c2 = ctxWith(src);
  const cs = c2.buildHanziCards(c2.HANZI_LESSONS);
  c2.mergeSavedHanziCards(cs, saved);
  const byChar = {}; cards.forEach((c, i) => { byChar[c.char] = saved[i]; });
  const novo = cs.find(c => c.char === '新');
  const old = cs.filter(c => c.char !== '新');
  return { ok: old.every(c => prog(c) === prog(byChar[c.char])), novoNew: novo && novo.state === 'new' && !novo.reps, moved: old.filter(c => prog(c) !== prog(byChar[c.char])).length };
}
const comChave = followsChar(editedSource(true));
check('hanzi novo + lição reordenada (com chave): progresso continua em cada caractere; o novo nasce New', comChave.ok && comChave.novoNew, comChave);
const semChave = followsChar(editedSource(false));
check(`controle (id pela posição, o de antes): a mesma edição passaria o progresso de ${semChave.moved} hanzi para o vizinho`, semChave.moved > 0, semChave);

// 6. guarda do livro-razão
const changes = ids.readChanges('zh');
const curAll = ids.currentIds('zh');
check('livro-razão do zh sem problema com o conteúdo de hoje', ids.checkLedger(ledger, curAll, changes).length === 0);
const sem = Object.assign({}, curAll, { hanzi: curAll.hanzi.filter(id => id !== 'h0-c2') });
check('hanzi h0-c2 apagado sem HANZI_RETIRED_KEYS: acusa', ids.checkLedger(ledger, sem, changes).some(p => p.includes('hanzi h0-c2 ')));
check('hanzi h0-c2 apagado com HANZI_RETIRED_KEYS ["0-c2"]: passa', ids.checkLedger(ledger, sem, Object.assign({}, changes, { HANZI_RETIRED_KEYS: ['0-c2'] })).length === 0);
check('curriculum-changes.js do zh exporta HANZI_RETIRED_KEYS (lista)', Array.isArray(changes.HANZI_RETIRED_KEYS));

summary("tests/curriculo-ids/test_hanzi_chaves (M1)");
