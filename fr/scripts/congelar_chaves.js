#!/usr/bin/env node
// Etapa 0a (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md, 2.3 item 1): escreve a chave estável `k` em cada item da
// base fr/content.js (vocab, phrases, dialogue.lines), UMA vez, a partir das posições ATUAIS. O valor inicial é exatamente
// o id de cartão de hoje sem o "u": "A1-3-v5", "A1-3-p2", "A1-3-d4". Resultado: nenhum id de cartão muda.
//
// Idempotente: item que já tem `k` não é tocado (mas a chave dele precisa ser única e ter o formato certo).
// Item NOVO (sem `k`) numa unidade que já tem chaves ganha a próxima chave livre do registro
// fr/scripts/item_keys_registry.json (nunca reaproveita número, nem de chave aposentada).
// Também atualiza o registro (maior número já usado por unidade e tipo).
//
// Uso: node fr/scripts/congelar_chaves.js            (escreve)
//      node fr/scripts/congelar_chaves.js --conferir (só confere; sai com 1 se faltar chave ou o registro estiver atrasado)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'fr', 'content.js');
const REGISTRY = path.join(__dirname, 'item_keys_registry.json');
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
        out.push({ key, unitId: unit && unit.id, target, items: v });
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

function readRegistry(){
  if (!fs.existsSync(REGISTRY)) return { units: {} };
  const r = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  if (!r.units) r.units = {};
  return r;
}

function keyNumber(k){ const m = /-([vpd])(\d+)$/.exec(k); return m ? { kind: m[1], n: Number(m[2]), unit: k.slice(0, m.index) } : null; }

function run({ write }){
  const src = fs.readFileSync(CONTENT, 'utf8');
  const units = loadUnits(src);
  const arrays = arraysInOrder(units);
  const registry = readRegistry();

  // 1. chaves já existentes: únicas e no formato
  const seen = new Map();
  const problems = [];
  arrays.filter(a => a.target).forEach(a => a.items.forEach((it, i) => {
    if (it.k === undefined) return;
    if (typeof it.k !== 'string' || !KEY_RE.test(it.k)) problems.push(`chave com formato inválido em ${a.unitId}.${a.key}[${i}]: ${JSON.stringify(it.k)}`);
    if (seen.has(it.k)) problems.push(`chave repetida ${it.k} (${seen.get(it.k)} e ${a.unitId}.${a.key}[${i}])`);
    seen.set(it.k, `${a.unitId}.${a.key}[${i}]`);
  }));
  if (problems.length){ problems.forEach(p => console.error('ERRO:', p)); process.exit(2); }

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
    'Inclui chaves aposentadas: um número nunca é reaproveitado. Mantido por fr/scripts/congelar_chaves.js.', units: {} };
  Object.keys(maxUsed).sort(unitSort).forEach(u => { registryOut.units[u] = {}; ['v', 'p', 'd'].forEach(kd => { if (maxUsed[u][kd] != null) registryOut.units[u][kd] = maxUsed[u][kd]; }); });
  const registryText = JSON.stringify(registryOut, null, 2) + '\n';
  const registryStale = !fs.existsSync(REGISTRY) || fs.readFileSync(REGISTRY, 'utf8') !== registryText;

  if (!write){
    if (plan.length) console.log(`faltam ${plan.length} chaves`);
    if (registryStale) console.log('registro desatualizado');
    if (!plan.length && !registryStale) console.log(`ok: ${seen.size} chaves, registro em dia`);
    process.exit(plan.length || registryStale ? 1 : 0);
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
  fs.writeFileSync(REGISTRY, registryText);
  console.log(`${plan.length} chaves escritas em fr/content.js; ${seen.size} chaves no total; registro atualizado`);
}

function unitSort(a, b){
  const pa = a.split('-'), pb = b.split('-');
  if (pa[0] !== pb[0]) return pa[0] < pb[0] ? -1 : 1;
  return (Number(pa[1]) || 0) - (Number(pb[1]) || 0) || (a < b ? -1 : a > b ? 1 : 0);
}

if (require.main === module) run({ write: !process.argv.includes('--conferir') });
module.exports = { run, arraysInOrder, KEY_RE };
