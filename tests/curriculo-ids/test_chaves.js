// Etapa 0a do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 itens 1 a 3 e 2.6 item 1), em TODOS os sites
// (descobertos sozinhos; o zh entrou no C1 da paridade, docs/auditoria-paridade-fr-zh.md):
//  - toda palavra/frase/fala do <site>/content.js tem chave `k` única e no formato certo;
//  - o congelamento não teve efeito: os cartões montados com as chaves são idênticos (id, texto, tags, tudo) aos
//    montados pela regra antiga de posição (o mesmo conteúdo sem `k`);
//  - id do cartão = u{k} (palavra A, `-b` na B; frase/fala u{k});
//  - o registro de chaves está em dia e o script é idempotente.
// Rodar: node tests/curriculo-ids/test_chaves.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');
const { check, summary } = require('../fase-e/harness');
const { buildStudyCards, discoverSites } = require('../../scripts/ids_publicados.js');
const { arraysInOrder, KEY_RE } = require('../../scripts/congelar_chaves.js');
const L = require('./lib');

const ROOT = L.ROOT;
const SCRIPT = path.join(ROOT, 'scripts/congelar_chaves.js');
const sites = discoverSites().map(s => s.site);
check('sites descobertos (pasta com index.html e app.js): fr e zh pelo menos', sites.includes('fr') && sites.includes('zh'), sites);
const kind = { vocab: 'v', phrases: 'p', lines: 'd' };
const withKeysBySite = {}, ledgerBySite = {};

sites.forEach(site => {
  const tag = `[${site}]`;
  const src = fs.readFileSync(path.join(ROOT, site, 'content.js'), 'utf8');
  const ctxBase = vm.createContext({}); vm.runInContext(src + ';this.U = UNITS;', ctxBase);
  const units = JSON.parse(JSON.stringify(ctxBase.U));
  const arrays = arraysInOrder(units).filter(a => a.target);
  const items = arrays.flatMap(a => a.items.map((it, i) => ({ unitId: a.unitId, key: a.key, i, k: it.k })));

  // --- unicidade e formato ---
  check(`${tag} todo item tem chave (${items.length} itens: palavras, frases e falas)`, items.length > 0 && items.every(x => typeof x.k === 'string'), items.filter(x => typeof x.k !== 'string').slice(0, 3));
  check(`${tag} chaves únicas`, new Set(items.map(x => x.k)).size === items.length);
  check(`${tag} formato <unidade>-<v|p|d><n>`, items.every(x => KEY_RE.test(x.k)));
  check(`${tag} tipo da chave = tipo do item (v palavra, p frase, d fala)`, items.every(x => new RegExp('-' + kind[x.key] + '\\d+$').test(x.k)));
  check(`${tag} congelamento inicial: chave = posição de hoje (<unidade>-v5 é a 6ª palavra da unidade)`, items.every(x => x.k === `${x.unitId}-${kind[x.key]}${x.i}`));
  check(`${tag} casa com a regex do cron (^(u.+-v(\\d+))(-b)?$) para palavras`, items.filter(x => x.key === 'vocab').every(x => /^(u.+-v(\d+))(-b)?$/.test('u' + x.k)));
  const nV = items.filter(x => x.key === 'vocab').length, nP = items.filter(x => x.key === 'phrases').length, nD = items.filter(x => x.key === 'lines').length;
  console.log(`   ${tag} ${nV} palavras, ${nP} frases, ${nD} falas`);
  let keyLike = 0;
  (function walk(o){ if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object'){ if (typeof o.k === 'string' && /-[vpd]\d+$/.test(o.k)) keyLike++; Object.values(o).forEach(walk); } })(units);
  check(`${tag} nenhuma chave de item fora de vocab/phrases/dialogue.lines`, keyLike === items.length, [keyLike, items.length]);

  // --- congelamento sem efeito: mesmo conteúdo SEM as chaves -> regra antiga -> cartões idênticos ---
  const withKeys = buildStudyCards(site).cards;
  withKeysBySite[site] = withKeys;
  const noKeysSrc = src.replace(/"k": "[^"]+-[vpd]\d+", ?(\n\s*)?/g, '');
  check(`${tag} conteúdo sem chave reconstruído (sanidade do teste: as micro-checagens do diálogo, "k": "fill", ficam)`, !/"k": "[^"]+-[vpd]\d+"/.test(noKeysSrc) && /"k": "fill"/.test(noKeysSrc));
  const withoutKeys = buildStudyCards(site, noKeysSrc).cards;
  const strip = cards => JSON.stringify(cards.map(c => { const o = Object.assign({}, c); delete o.studyKey; return o; }));
  check(`${tag} mesmos ${withKeys.length} cartões, idênticos campo a campo (id, texto, tags, Note, CardInstance)`, withKeys.length > 0 && withKeys.length === withoutKeys.length && strip(withKeys) === strip(withoutKeys));
  check(`${tag} item sem chave não ganha studyKey (regra antiga)`, withoutKeys.every(c => c.studyKey === undefined));
  check(`${tag} id do cartão = u{k} (A), u{k}-b (B), u{k} (frase/fala)`, withKeys.every(c => c.studyKey && (c.id === 'u' + c.studyKey || c.id === 'u' + c.studyKey + '-b')));
  // livro-razão gravado com o código de ANTES das chaves (fr: Etapa 0a; zh: conferido contra a origin/main no C1)
  const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, site, 'published_ids.json'), 'utf8'));
  ledgerBySite[site] = ledger;
  check(`${tag} ids de hoje == ids do livro-razão (gravado com o código de antes das chaves)`, JSON.stringify(withKeys.map(c => c.id).sort()) === JSON.stringify(ledger.cards.slice().sort()));

  // --- registro ---
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, site, 'scripts/item_keys_registry.json'), 'utf8'));
  check(`${tag} registro: maior número por unidade/tipo >= toda chave existente`, items.every(x => { const m = /-([vpd])(\d+)$/.exec(x.k); const u = x.k.slice(0, m.index); return reg.units[u] && reg.units[u][m[1]] >= Number(m[2]); }));
});

// --- script: conferência e idempotência (todos os sites) ---
const run = (args) => { try { return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; } };
const conf = run(['--conferir']);
check('congelar_chaves.js --conferir (todos os sites): nada a fazer e registro em dia', conf.code === 0 && sites.every(s => conf.out.includes(s + ': ok')), conf.out);

// --- item novo: chave nova nunca reaproveitada (simulação numa cópia temporária, o arquivo real não muda) ---
function simulate(site, unitKey, kindKey, usedMax, anchor, novoItem, expected){
  const os = require('os');
  const tag = `[${site}]`;
  const src = fs.readFileSync(path.join(ROOT, site, 'content.js'), 'utf8');
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, site, 'scripts/item_keys_registry.json'), 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chaves-'));
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(tmp, site, 'scripts'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(tmp, 'scripts/congelar_chaves.js'));
  const r0 = JSON.parse(JSON.stringify(reg)); r0.units[unitKey][kindKey] = usedMax; // como se números acima do atual já tivessem existido (aposentados)
  fs.writeFileSync(path.join(tmp, site, 'scripts/item_keys_registry.json'), JSON.stringify(r0, null, 2) + '\n');
  const novo = src.replace(anchor, anchor + '\n      ' + novoItem + ',');
  check(`${tag} simulação: item novo inserido`, novo !== src);
  fs.writeFileSync(path.join(tmp, site, 'content.js'), novo);
  execFileSync('node', [path.join(tmp, 'scripts/congelar_chaves.js'), site], { encoding: 'utf8' });
  const after = fs.readFileSync(path.join(tmp, site, 'content.js'), 'utf8');
  const withKey = novoItem.replace('{ ', `{ "k": "${expected}", `);
  check(`${tag} item novo ganha a próxima chave livre (${expected}, nunca reaproveita os números já usados)`, after.includes(withKey), after.slice(after.indexOf(anchor), after.indexOf(anchor) + 200));
  check(`${tag} nenhuma outra chave mudou`, after.replace('\n      ' + withKey + ',', '') === src);
  const r1 = JSON.parse(fs.readFileSync(path.join(tmp, site, 'scripts/item_keys_registry.json'), 'utf8'));
  check(`${tag} registro sobe para ${usedMax + 1}`, r1.units[unitKey][kindKey] === usedMax + 1);
  execFileSync('node', [path.join(tmp, 'scripts/congelar_chaves.js'), site], { encoding: 'utf8' });
  check(`${tag} rodar de novo não muda nada (idempotente)`, fs.readFileSync(path.join(tmp, site, 'content.js'), 'utf8') === after);
  fs.rmSync(tmp, { recursive: true, force: true });
}
simulate('fr', 'A1-3', 'v', 14, '{ "k": "A1-3-v3", "f": "trois" },', '{ "f": "quatre" }', 'A1-3-v15');
// zh: unidade com id numérico (3), o registro guarda "3" como texto
simulate('zh', '3', 'v', 14, '{ "k": "3-v0", "p": "líng", "c": "零" },', '{ "p": "bǎi", "c": "百" }', '3-v15');

// --- saves reais (se a dona colocar fixtures/real-*.json): todo id salvo ainda existe ou é órfão já conhecido ---
const reais = L.realSaves();
const withKeys = withKeysBySite.fr, ledger = ledgerBySite.fr; // os saves reais de fixtures/ são do fr
reais.forEach(({ name, block }) => {
  const ids = new Set(withKeys.map(c => c.id));
  const study = (block.cards || []).filter(c => /^u./.test(String(c.id)) && (c.origin == null || c.origin === 'study'));
  const gone = study.filter(c => !ids.has(c.id)).map(c => c.id);
  console.log(`   [${name}] ${study.length} cartões da trilha; ${gone.length} já não existiam antes da Etapa 0 (vão para o arquivo)`);
  check(`[${name}] congelamento não tirou nenhum id que o save usa`, gone.every(id => !ledger.cards.includes(id)));
});
summary('curriculo-ids chaves');
