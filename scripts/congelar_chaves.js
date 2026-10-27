#!/usr/bin/env node
// Chave estável por item (Etapa 0a no fr, docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 item 1; levada a todos os
// sites na Etapa 1 da paridade, docs/auditoria-paridade-fr-zh.md C1): escreve a chave `k` em cada item da base
// <site>/content.js (vocab, phrases, dialogue.lines), UMA vez, a partir das posições ATUAIS. O valor inicial é exatamente
// o id de cartão de hoje sem o "u": "A1-3-v5", "A1-3-p2", "A1-3-d4" (fr), "1-v0", "3-p2", "5-d4" (zh).
// Resultado: nenhum id de cartão muda.
//
// Idempotente: item que já tem `k` não é tocado (mas a chave dele precisa ser única e ter o formato certo).
// Item NOVO (sem `k`) numa unidade que já tem chaves ganha a próxima chave livre do registro
// <site>/scripts/item_keys_registry.json (nunca reaproveita número, nem de chave aposentada).
// Também atualiza o registro (maior número já usado por unidade e tipo).
//
// Uso: node scripts/congelar_chaves.js [fr zh ...]            (escreve; sem site = todos os sites, scripts/lib/sites.js)
//      node scripts/congelar_chaves.js [fr zh ...] --conferir (só confere; sai com 1 se faltar chave ou o registro estiver atrasado)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const contentPath = site => path.join(ROOT, site, 'content.js');
const registryPath = site => path.join(ROOT, site, 'scripts', 'item_keys_registry.json');
const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9-]*-[vpd]\d+$/;
const KIND_OF_ARRAY = { vocab: 'v', phrases: 'p', lines: 'd' };

function loadUnits(src){
  const ctx = vm.createContext({});
  vm.runInContext(src + '\n;this.__U = UNITS;', ctx);
  return JSON.parse(JSON.stringify(ctx.__U));
}

// Todos os arrays "vocab"/"phrases"/"lines" de UNITS, na ORDEM DO TEXTO (a ordem de chaves de um objeto JSON é a do fonte).
// alvo = vocab e phrases filhos diretos da unidade, e lines filho de unit.dialogue.
function arraysInOrder(units){
  const out = [];
  function walk(v, key, parentKey, depth, unit){
    if (Array.isArray(v)){
      if (KIND_OF_ARRAY[key]){
        const target = (key === 'vocab' || key === 'phrases') ? depth === 1 : (key === 'lines' && parentKey === 'dialogue' && depth === 2);
        out.push({ key, unitId: unit && String(unit.id), target, items: v });
      }
      v.forEach(x => walk(x, null, key, depth, unit));
      return;
    }
    if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], k, key, depth + 1, unit));
  }
  units.forEach(u => Object.keys(u).forEach(k => walk(u[k], k, null, 1, u)));
  return out;
}

// Pula string JSON/JS começando em i (aspas em src[i]); devolve o índice logo depois do fechamento.
function skipString(src, i){
  const q = src[i];
  for (let j = i + 1; j < src.length; j++){
    if (src[j] === '\\'){ j++; continue; }
    if (src[j] === q) return j + 1;
  }
  throw new Error('string sem fechamento em ' + i);
}
// Índice do colchete/chave que fecha o aberto em i.
function matchClose(src, i){
  let depth = 0;
  for (let j = i; j < src.length; j++){
    const c = src[j];
    if (c === '"' || c === "'"){ j = skipString(src, j) - 1; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}'){ depth--; if (depth === 0) return j; }
  }
  throw new Error('sem fechamento em ' + i);
}
// Posições dos objetos de primeiro nível dentro do array que abre em `open`.
function topLevelObjects(src, open){
  const close = matchClose(src, open);
  const objs = [];
  for (let j = open + 1; j < close; j++){
    const c = src[j];
    if (c === '"' || c === "'"){ j = skipString(src, j) - 1; continue; }
    if (c === '{'){ const e = matchClose(src, j); objs.push([j, e]); j = e; }
    else if (c === '['){ j = matchClose(src, j); }
  }
  return objs;
}

function readRegistry(REGISTRY){
  if (!fs.existsSync(REGISTRY)) return { units: {} };
  const r = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  if (!r.units) r.units = {};
  return r;
}

function keyNumber(k){ const m = /-([vpd])(\d+)$/.exec(k); return m ? { kind: m[1], n: Number(m[2]), unit: k.slice(0, m.index) } : null; }

// Devolve o código de saída (0 ok; 1 conferência com pendência; 2 chave inválida/repetida).
function run({ site, write }){
  const CONTENT = contentPath(site), REGISTRY = registryPath(site);
  const src = fs.readFileSync(CONTENT, 'utf8');
  const units = loadUnits(src);
  const arrays = arraysInOrder(units);
  const registry = readRegistry(REGISTRY);

  // 1. chaves já existentes: únicas e no formato
  const seen = new Map();
  const problems = [];
  arrays.filter(a => a.target).forEach(a => a.items.forEach((it, i) => {
    if (it.k === undefined) return;
    if (typeof it.k !== 'string' || !KEY_RE.test(it.k)) problems.push(`chave com formato inválido em ${a.unitId}.${a.key}[${i}]: ${JSON.stringify(it.k)}`);
    if (seen.has(it.k)) problems.push(`chave repetida ${it.k} (${seen.get(it.k)} e ${a.unitId}.${a.key}[${i}])`);
    seen.set(it.k, `${a.unitId}.${a.key}[${i}]`);
  }));
  if (problems.length){ problems.forEach(p => console.error(`ERRO (${site}):`, p)); return 2; }

  // maior número usado por unidade/tipo = max(registro, chaves presentes)
  const maxUsed = JSON.parse(JSON.stringify(registry.units));
  const bump = (unit, kind, n) => { maxUsed[unit] = maxUsed[unit] || {}; if (!(maxUsed[unit][kind] >= n)) maxUsed[unit][kind] = n; };
  seen.forEach((_, k) => { const p = keyNumber(k); if (p) bump(p.unit, p.kind, p.n); });

  // 2. chave para cada item sem `k`
  const unitHasKeys = new Set([...seen.keys()].map(k => keyNumber(k).unit));
  const plan = []; // { arrayIdx, itemIdx, k }
  arrays.forEach((a, ai) => {
    if (!a.target) return;
    const kind = KIND_OF_ARRAY[a.key];
    a.items.forEach((it, i) => {
      if (it.k !== undefined) return;
      let k;
      if (!unitHasKeys.has(a.unitId) && !(registry.units[a.unitId] && registry.units[a.unitId][kind] != null)){
        k = `${a.unitId}-${kind}${i}`; // congelamento inicial: posição de hoje
      } else {
        const used = (maxUsed[a.unitId] && maxUsed[a.unitId][kind] != null) ? maxUsed[a.unitId][kind] : -1;
        k = `${a.unitId}-${kind}${used + 1}`; // item novo: próximo número livre, nunca reaproveitado
      }
      if (seen.has(k)) throw new Error('chave calculada já existe: ' + k);
      seen.set(k, `${a.unitId}.${a.key}[${i}]`);
      const p = keyNumber(k); bump(p.unit, p.kind, p.n);
      plan.push({ ai, i, k });
    });
  });
  // unitHasKeys foi calculado ANTES do loop: uma unidade ainda sem chave nenhuma é congelada inteira pela posição de hoje.

  const registryOut = { _doc: 'Maior número de chave já usado por unidade e tipo (v = palavra, p = frase, d = fala do diálogo). ' +
    'Inclui chaves aposentadas: um número nunca é reaproveitado. Mantido por scripts/congelar_chaves.js.', units: {} };
  Object.keys(maxUsed).sort(unitSort).forEach(u => { registryOut.units[u] = {}; ['v', 'p', 'd'].forEach(kd => { if (maxUsed[u][kd] != null) registryOut.units[u][kd] = maxUsed[u][kd]; }); });
  if (registry.hanzi) registryOut.hanzi = registry.hanzi; // chaves dos hanzi (runHanzi): preservadas
  const registryText = JSON.stringify(registryOut, null, 2) + '\n';
  const registryStale = !fs.existsSync(REGISTRY) || fs.readFileSync(REGISTRY, 'utf8') !== registryText;

  if (!write){
    if (plan.length) console.log(`${site}: faltam ${plan.length} chaves`);
    if (registryStale) console.log(`${site}: registro desatualizado`);
    if (!plan.length && !registryStale) console.log(`${site}: ok: ${seen.size} chaves, registro em dia`);
    return plan.length || registryStale ? 1 : 0;
  }

  // 3. escrita textual (preserva a formatação do arquivo): localiza os mesmos arrays no texto, na mesma ordem
  const re = /"(vocab|phrases|lines)"\s*:\s*\[/g;
  const startUnits = src.indexOf('const UNITS');
  const endUnits = matchClose(src, src.indexOf('[', startUnits));
  const textArrays = [];
  let m;
  while ((m = re.exec(src))){
    if (m.index < startUnits || m.index > endUnits) continue;
    // ignora ocorrências dentro de strings: o conteúdo-base não tem essas sequências em texto, conferido pela contagem abaixo
    textArrays.push({ key: m[1], open: m.index + m[0].length - 1 });
  }
  if (textArrays.length !== arrays.length || textArrays.some((t, i) => t.key !== arrays[i].key)){
    throw new Error(`arrays no texto (${textArrays.length}) não batem com a estrutura (${arrays.length})`);
  }
  const inserts = []; // [pos, texto]
  plan.forEach(({ ai, i, k }) => {
    const objs = topLevelObjects(src, textArrays[ai].open);
    if (objs.length !== arrays[ai].items.length) throw new Error(`itens no texto não batem: ${arrays[ai].unitId}.${arrays[ai].key}`);
    const [o] = objs[i];
    const after = src.slice(o + 1, o + 40);
    const nl = /^\s*\n(\s*)/.exec(after);
    if (nl) inserts.push([o + 1, `\n${nl[1]}"k": ${JSON.stringify(k)},`]);
    else inserts.push([o + 1, ` "k": ${JSON.stringify(k)},`]);
  });
  inserts.sort((a, b) => b[0] - a[0]);
  let out = src;
  inserts.forEach(([pos, txt]) => { out = out.slice(0, pos) + txt + out.slice(pos); });

  // 4. conferência: mesma estrutura sem `k`, e cada chave planejada no lugar certo
  const after = loadUnits(out);
  const strip = us => JSON.stringify(us);
  const removeK = us => { arraysInOrder(us).filter(a => a.target).forEach(a => a.items.forEach(it => { delete it.k; })); return us; };
  const before0 = removeK(loadUnits(src)), after0 = removeK(loadUnits(out));
  if (strip(before0) !== strip(after0)) throw new Error('a escrita mudou algo além de `k`');
  const afterArrays = arraysInOrder(after);
  plan.forEach(({ ai, i, k }) => { if (afterArrays[ai].items[i].k !== k) throw new Error('chave fora do lugar: ' + k); });

  if (plan.length) fs.writeFileSync(CONTENT, out);
  fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
  fs.writeFileSync(REGISTRY, registryText);
  console.log(`${site}: ${plan.length} chaves escritas em ${site}/content.js; ${seen.size} chaves no total; registro atualizado`);
  return 0;
}

function unitSort(a, b){
  const pa = a.split('-'), pb = b.split('-');
  const na = Number(pa[0]), nb = Number(pb[0]);
  if (pa[0] !== pb[0]) return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : (pa[0] < pb[0] ? -1 : 1); // zh: unidades 1, 2, ..., 10
  return (Number(pa[1]) || 0) - (Number(pb[1]) || 0) || (a < b ? -1 : a > b ? 1 : 0);
}

// ---------- Hanzi (M1 da revisão do código compartilhado, 2026-10-26) ----------
// Site com <site>/hanzi-data.js (o zh): cada caractere de HANZI_LESSONS ganha a chave `k`, UMA vez. O valor inicial é o
// id de cartão de hoje sem o "h" ("0-c0", "3-c7"): nenhum id muda. Caractere NOVO (sem `k`) ganha
// "<lição atual>-c<próximo número livre da lição>" pelo registro (<site>/scripts/item_keys_registry.json, campo `hanzi`),
// nunca reaproveitado. A chave é opaca: o hanzi que muda de lição continua com a chave antiga.
const HANZI_KEY_RE = /^\d+-c\d+$/;
const hanziPath = site => path.join(ROOT, site, 'hanzi-data.js');
function loadHanzi(src){
  const ctx = vm.createContext({});
  vm.runInContext(src + '\n;this.__H = HANZI_LESSONS;', ctx);
  return JSON.parse(JSON.stringify(ctx.__H));
}
function runHanzi({ site, write }){
  const FILE = hanziPath(site), REGISTRY = registryPath(site);
  if (!fs.existsSync(FILE)) return 0;
  const src = fs.readFileSync(FILE, 'utf8');
  const lessons = loadHanzi(src);
  const registry = readRegistry(REGISTRY);
  const maxUsed = Object.assign({}, registry.hanzi || {});
  const seen = new Map(), problems = [];
  lessons.forEach((lesson, li) => lesson.forEach((h, ci) => {
    if (h.k === undefined) return;
    if (typeof h.k !== 'string' || !HANZI_KEY_RE.test(h.k)) problems.push(`chave de hanzi inválida em [${li}][${ci}]: ${JSON.stringify(h.k)}`);
    if (seen.has(h.k)) problems.push(`chave de hanzi repetida ${h.k}`);
    seen.set(h.k, `[${li}][${ci}]`);
    const m = /^(\d+)-c(\d+)$/.exec(h.k);
    if (m && !(maxUsed[m[1]] >= +m[2])) maxUsed[m[1]] = +m[2];
  }));
  if (problems.length){ problems.forEach(p => console.error(`ERRO (${site}):`, p)); return 2; }
  const frozenBefore = seen.size > 0 || Object.keys(registry.hanzi || {}).length > 0;
  const plan = [];
  lessons.forEach((lesson, li) => lesson.forEach((h, ci) => {
    if (h.k !== undefined) return;
    let k;
    if (!frozenBefore) k = `${li}-c${ci}`; // congelamento inicial: a posição de hoje
    else { const n = maxUsed[li] != null ? maxUsed[li] + 1 : 0; k = `${li}-c${n}`; }
    if (seen.has(k)) throw new Error('chave de hanzi calculada já existe: ' + k);
    seen.set(k, `[${li}][${ci}]`);
    const m = /^(\d+)-c(\d+)$/.exec(k); if (!(maxUsed[m[1]] >= +m[2])) maxUsed[m[1]] = +m[2];
    plan.push({ li, ci, k });
  }));
  const hanziReg = {};
  Object.keys(maxUsed).sort((a, b) => a - b).forEach(l => { hanziReg[l] = maxUsed[l]; });
  const regOut = readRegistry(REGISTRY);
  const regStale = JSON.stringify(regOut.hanzi || {}) !== JSON.stringify(hanziReg);
  if (!write){
    if (plan.length) console.log(`${site}: faltam ${plan.length} chaves de hanzi`);
    if (regStale) console.log(`${site}: registro de hanzi desatualizado`);
    if (!plan.length && !regStale) console.log(`${site}: ok: ${seen.size} chaves de hanzi`);
    return plan.length || regStale ? 1 : 0;
  }
  // escrita textual: cada objeto de caractere começa com `{` seguido de "char" (ordem do texto = ordem de HANZI_LESSONS)
  const re = /\{(\s*)"char"\s*:/g;
  const starts = []; let m;
  while ((m = re.exec(src))) starts.push({ pos: m.index + 1, ws: m[1] });
  const flat = []; lessons.forEach((lesson, li) => lesson.forEach((h, ci) => flat.push({ li, ci })));
  if (starts.length !== flat.length) throw new Error(`objetos de hanzi no texto (${starts.length}) não batem com HANZI_LESSONS (${flat.length})`);
  const byPos = new Map(plan.map(p => [p.li + ':' + p.ci, p.k]));
  let out = src;
  for (let i = starts.length - 1; i >= 0; i--){
    const k = byPos.get(flat[i].li + ':' + flat[i].ci);
    if (k == null) continue;
    const ws = starts[i].ws.includes('\n') ? starts[i].ws : ' ';
    out = out.slice(0, starts[i].pos) + `${ws}"k": ${JSON.stringify(k)},` + out.slice(starts[i].pos);
  }
  const strip = ls => JSON.stringify(ls.map(l => l.map(h => { const c = Object.assign({}, h); delete c.k; return c; })));
  const after = loadHanzi(out);
  if (strip(after) !== strip(lessons)) throw new Error('a escrita dos hanzi mudou algo além de `k`');
  plan.forEach(({ li, ci, k }) => { if (after[li][ci].k !== k) throw new Error('chave de hanzi fora do lugar: ' + k); });
  if (plan.length) fs.writeFileSync(FILE, out);
  regOut.hanzi = hanziReg;
  fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
  fs.writeFileSync(REGISTRY, JSON.stringify(regOut, null, 2) + '\n');
  console.log(`${site}: ${plan.length} chaves de hanzi escritas; ${seen.size} no total`);
  return 0;
}

if (require.main === module){
  const args = process.argv.slice(2);
  const named = args.filter(a => !a.startsWith('--'));
  const sites = named.length ? named : require('./lib/sites.js').discoverSites(ROOT).map(s => s.site);
  const write = !args.includes('--conferir');
  const codes = sites.map(site => Math.max(run({ site, write }), runHanzi({ site, write })));
  process.exit(Math.max(0, ...codes));
}
module.exports = { run, runHanzi, arraysInOrder, KEY_RE, HANZI_KEY_RE };
