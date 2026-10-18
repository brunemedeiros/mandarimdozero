// Etapa 0a do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 itens 1 a 3 e 2.6 item 1):
//  - toda palavra/frase/fala do fr/content.js tem chave `k` única e no formato certo;
//  - o congelamento não teve efeito: os cartões montados com as chaves são idênticos (id, texto, tags, tudo) aos
//    montados pela regra antiga de posição (o mesmo conteúdo sem `k`);
//  - id do cartão = u{k} (palavra A, `-b` na B; frase/fala u{k});
//  - o registro de chaves está em dia e o script é idempotente.
// Rodar: node tests/curriculo-ids/test_chaves.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');
const { check, summary } = require('../fase-e/harness');
const { buildStudyCards } = require('../../fr/scripts/ids_publicados.js');
const { arraysInOrder, KEY_RE } = require('../../fr/scripts/congelar_chaves.js');
const L = require('./lib');

const ROOT = L.ROOT;
const src = fs.readFileSync(path.join(ROOT, 'fr/content.js'), 'utf8');
const ctxBase = vm.createContext({}); vm.runInContext(src + ';this.U = UNITS;', ctxBase);
const units = JSON.parse(JSON.stringify(ctxBase.U));
const arrays = arraysInOrder(units).filter(a => a.target);
const items = arrays.flatMap(a => a.items.map((it, i) => ({ unitId: a.unitId, key: a.key, i, k: it.k })));

// --- unicidade e formato ---
const kind = { vocab: 'v', phrases: 'p', lines: 'd' };
check(`todo item tem chave (${items.length} itens: palavras, frases e falas)`, items.every(x => typeof x.k === 'string'), items.filter(x => typeof x.k !== 'string').slice(0, 3));
check('chaves únicas', new Set(items.map(x => x.k)).size === items.length);
check('formato <unidade>-<v|p|d><n>', items.every(x => KEY_RE.test(x.k)));
check('tipo da chave = tipo do item (v palavra, p frase, d fala)', items.every(x => new RegExp('-' + kind[x.key] + '\\d+$').test(x.k)));
check('congelamento inicial: chave = posição de hoje (A1-3-v5 é a 6ª palavra do A1-3)', items.every(x => x.k === `${x.unitId}-${kind[x.key]}${x.i}`));
check('casa com a regex do cron (^(u.+-v(\\d+))(-b)?$) para palavras', items.filter(x => x.key === 'vocab').every(x => /^(u.+-v(\d+))(-b)?$/.test('u' + x.k)));
const nV = items.filter(x => x.key === 'vocab').length, nP = items.filter(x => x.key === 'phrases').length, nD = items.filter(x => x.key === 'lines').length;
console.log(`   ${nV} palavras, ${nP} frases, ${nD} falas`);
let keyLike = 0;
(function walk(o){ if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object'){ if (typeof o.k === 'string' && /-[vpd]\d+$/.test(o.k)) keyLike++; Object.values(o).forEach(walk); } })(units);
check('nenhuma chave de item fora de vocab/phrases/dialogue.lines', keyLike === items.length, [keyLike, items.length]);

// --- congelamento sem efeito: mesmo conteúdo SEM as chaves -> regra antiga -> cartões idênticos ---
const withKeys = buildStudyCards().cards;
const noKeysSrc = src.replace(/"k": "[^"]+-[vpd]\d+", ?(\n\s*)?/g, '');
check('conteúdo sem chave reconstruído (sanidade do teste: as micro-checagens do diálogo, "k": "fill", ficam)', !/"k": "A1-/.test(noKeysSrc) && /"k": "fill"/.test(noKeysSrc));
const withoutKeys = buildStudyCards(noKeysSrc).cards;
const strip = cards => JSON.stringify(cards.map(c => { const o = Object.assign({}, c); delete o.studyKey; return o; }));
check(`mesmos ${withKeys.length} cartões, idênticos campo a campo (id, texto, tags, Note, CardInstance)`, withKeys.length === withoutKeys.length && strip(withKeys) === strip(withoutKeys));
check('item sem chave não ganha studyKey (regra antiga)', withoutKeys.every(c => c.studyKey === undefined));
check('id do cartão = u{k} (A), u{k}-b (B), u{k} (frase/fala)', withKeys.every(c => c.studyKey && (c.id === 'u' + c.studyKey || c.id === 'u' + c.studyKey + '-b')));
// livro-razão gravado ANTES da Etapa 0 (com o código antigo): mesmo conjunto de ids
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/published_ids.json'), 'utf8'));
check('ids de hoje == ids do livro-razão (gravado com o código de antes das chaves)', JSON.stringify(withKeys.map(c => c.id).sort()) === JSON.stringify(ledger.cards.slice().sort()));

// --- script: conferência e idempotência ---
const run = (args) => { try { return { code: 0, out: execFileSync('node', [path.join(ROOT, 'fr/scripts/congelar_chaves.js'), ...args], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; } };
const conf = run(['--conferir']);
check('congelar_chaves.js --conferir: nada a fazer e registro em dia', conf.code === 0, conf.out);
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/item_keys_registry.json'), 'utf8'));
check('registro: maior número por unidade/tipo >= toda chave existente', items.every(x => { const m = /-([vpd])(\d+)$/.exec(x.k); const u = x.k.slice(0, m.index); return reg.units[u] && reg.units[u][m[1]] >= Number(m[2]); }));

// --- item novo: chave nova nunca reaproveitada (simulação numa cópia temporária, o arquivo real não muda) ---
{
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chaves-'));
  fs.mkdirSync(path.join(tmp, 'fr', 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'fr/scripts/congelar_chaves.js'), path.join(tmp, 'fr/scripts/congelar_chaves.js'));
  const r0 = JSON.parse(JSON.stringify(reg)); r0.units['A1-3'].v = 14; // como se A1-3-v10..v14 já tivessem existido (aposentadas)
  fs.writeFileSync(path.join(tmp, 'fr/scripts/item_keys_registry.json'), JSON.stringify(r0, null, 2) + '\n');
  // insere uma palavra sem chave no A1-3, depois de "trois"
  const novo = src.replace('{ "k": "A1-3-v3", "f": "trois" },', '{ "k": "A1-3-v3", "f": "trois" },\n      { "f": "quatre" },');
  check('simulação: palavra nova inserida', novo !== src);
  fs.writeFileSync(path.join(tmp, 'fr/content.js'), novo);
  execFileSync('node', [path.join(tmp, 'fr/scripts/congelar_chaves.js')], { encoding: 'utf8' });
  const after = fs.readFileSync(path.join(tmp, 'fr/content.js'), 'utf8');
  check('item novo ganha a próxima chave livre (A1-3-v15, nunca reaproveita v10..v14)', after.includes('{ "k": "A1-3-v15", "f": "quatre" }'));
  check('nenhuma outra chave mudou', after.replace('{ "k": "A1-3-v15", "f": "quatre" },\n      ', '') === src);
  const r1 = JSON.parse(fs.readFileSync(path.join(tmp, 'fr/scripts/item_keys_registry.json'), 'utf8'));
  check('registro sobe para 15', r1.units['A1-3'].v === 15);
  execFileSync('node', [path.join(tmp, 'fr/scripts/congelar_chaves.js')], { encoding: 'utf8' });
  check('rodar de novo não muda nada (idempotente)', fs.readFileSync(path.join(tmp, 'fr/content.js'), 'utf8') === after);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// --- saves reais (se a dona colocar fixtures/real-*.json): todo id salvo ainda existe ou é órfão já conhecido ---
const reais = L.realSaves();
reais.forEach(({ name, block }) => {
  const ids = new Set(withKeys.map(c => c.id));
  const study = (block.cards || []).filter(c => /^u./.test(String(c.id)) && (c.origin == null || c.origin === 'study'));
  const gone = study.filter(c => !ids.has(c.id)).map(c => c.id);
  console.log(`   [${name}] ${study.length} cartões da trilha; ${gone.length} já não existiam antes da Etapa 0 (vão para o arquivo)`);
  check(`[${name}] congelamento não tirou nenhum id que o save usa`, gone.every(id => !ledger.cards.includes(id)));
});
summary('curriculo-ids chaves');
