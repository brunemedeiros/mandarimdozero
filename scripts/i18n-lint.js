#!/usr/bin/env node
// Linter de i18n (sem dependências). Uso: node scripts/i18n-lint.js
// 1) chaves de pt-BR faltando em en (erro) e em es (só AVISO: espanhol está
//    CONGELADO por decisão da autora -- foco só em inglês);
// 2) chaves em en/es que não existem em pt-BR (órfãs);
// 3) chaves usadas no código (t('...'), tp('...'), reportT('...'),
//    data-i18n="...", data-i18n-html="...", data-i18n-attr="attr:chave")
//    que não existem em pt-BR.
// Sai com código 1 se houver qualquer problema.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'shared', 'i18n');
const LANGS = ['pt-BR', 'en', 'es'];
const FROZEN_LANGS = ['es']; // faltantes viram aviso, não erro

function loadCatalog(lang){
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(I18N_DIR, lang + '.js'), 'utf8'), sandbox);
  return (sandbox.window.I18N_CATALOG || {})[lang] || {};
}

function walk(dir, out){
  for (const name of fs.readdirSync(dir)){
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()){
      if (['tests', 'docs', 'supabase'].includes(name) && dir === ROOT) continue;
      walk(p, out);
    } else if (/\.(js|html)$/.test(name) && !p.startsWith(I18N_DIR) && !p.endsWith(path.join('scripts', 'i18n-lint.js'))){
      out.push(p);
    }
  }
  return out;
}

function usedKeys(){
  const used = new Map();
  const add = (k, f) => { if (!used.has(k)) used.set(k, new Set()); used.get(k).add(path.relative(ROOT, f)); };
  for (const f of walk(ROOT, [])){
    const s = fs.readFileSync(f, 'utf8');
    let m;
    const reCall = /\b(?:t|tp|reportT)\(\s*['"]([a-zA-Z0-9_.-]+\.[a-zA-Z0-9_.-]+)['"]/g;
    while ((m = reCall.exec(s))) add(m[1], f);
    const reAttr = /data-i18n(?:-html)?="([^"]+)"/g;
    while ((m = reAttr.exec(s))) add(m[1].trim(), f);
    const reAttrMap = /data-i18n-attr="([^"]+)"/g;
    while ((m = reAttrMap.exec(s))){
      m[1].split(';').forEach(pair => { const i = pair.indexOf(':'); if (i > 0) add(pair.slice(i + 1).trim(), f); });
    }
    // labelKey: 'report.category.x' (catálogos de opções montados em JS)
    const reLabelKey = /labelKey:\s*['"]([^'"]+)['"]/g;
    while ((m = reLabelKey.exec(s))) add(m[1], f);
  }
  return used;
}

function main(){
  const cats = {};
  LANGS.forEach(l => { cats[l] = loadCatalog(l); });
  const base = Object.keys(cats['pt-BR']);
  let problems = 0;
  console.log(`pt-BR: ${base.length} chaves`);
  for (const l of LANGS.slice(1)){
    const keys = Object.keys(cats[l]);
    const missing = base.filter(k => !(k in cats[l]));
    const orphan = keys.filter(k => !(k in cats['pt-BR']));
    const empty = keys.filter(k => cats[l][k] === '' || cats[l][k] == null);
    const frozen = FROZEN_LANGS.includes(l);
    console.log(`${l}: ${keys.length} chaves; faltando ${missing.length}${frozen ? ' (aviso: ' + l + ' congelado)' : ''}; órfãs ${orphan.length}; vazias ${empty.length}`);
    if (frozen){
      if (missing.length) console.log(`  [${l}] (aviso, ${l} congelado) ${missing.length} chave(s) sem tradução -- caem em pt-BR`);
    } else {
      missing.forEach(k => console.log(`  [${l}] faltando: ${k}`));
      problems += missing.length;
    }
    orphan.forEach(k => console.log(`  [${l}] órfã: ${k}`));
    empty.forEach(k => console.log(`  [${l}] vazia: ${k}`));
    problems += orphan.length + empty.length;
  }
  const used = usedKeys();
  const unknown = [...used.keys()].filter(k => !(k in cats['pt-BR']));
  console.log(`chaves usadas no código: ${used.size}; inexistentes em pt-BR: ${unknown.length}`);
  unknown.forEach(k => console.log(`  inexistente: ${k} (${[...used.get(k)].join(', ')})`));
  problems += unknown.length;
  const unused = base.filter(k => !used.has(k));
  if (unused.length) console.log(`(info) chaves de pt-BR sem uso detectado: ${unused.join(', ')}`);
  console.log(problems ? `FALHOU: ${problems} problema(s)` : 'OK: nenhum problema');
  process.exit(problems ? 1 : 0);
}

main();
