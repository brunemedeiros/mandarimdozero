// Validador curricular (AVISO, nunca erro) -- Fase 4 da trilha, 06/10/2026.
// Regra: a gramática sistematiza o que o aluno JÁ ouviu/leu. Para cada unidade
// de gramática do A1, conta quantas vezes as formas-alvo (grammar_input_map.json)
// aparecem nas unidades que vêm ANTES na trilha (ordem real de MODULES) e nas
// que vêm depois. Avisa quando: falta entrada no mapa; há menos de
// `minInputBefore` ocorrências antes; ou o input só aparece depois.
// Heurística de triagem para a professora, não verdade pedagógica.
// Uso: node fr/scripts/check_grammar_input.js [--strict]   (--strict: sai com 1 se houver aviso)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

function loadContent(){
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'fr/content.js'), 'utf8') + ';this.UNITS=UNITS;this.MODULES=MODULES;', ctx);
  return { UNITS: ctx.UNITS, MODULES: ctx.MODULES };
}

function unitText(u){ return JSON.stringify(u); }
function countMatches(text, reSrc){
  const re = new RegExp(reSrc, 'gi');
  const m = text.match(re); return m ? m.length : 0;
}

// Devolve [{ unitId, structure, before, after, warnings:[...] }]
function analyze(content, map){
  const order = content.MODULES.flatMap(m => m.unitIds);
  const byId = Object.fromEntries(content.UNITS.map(u => [u.id, u]));
  const min = map.minInputBefore || 3;
  const out = [];
  content.UNITS.filter(u => u.type === 'grammar').forEach(g => {
    const entry = map.units[g.id];
    const pos = order.indexOf(g.id);
    const res = { unitId: g.id, structure: entry ? entry.structure : '?', before: null, after: null, warnings: [] };
    if (pos < 0){ res.warnings.push('unidade fora da ordem dos módulos'); out.push(res); return; }
    if (!entry){ res.warnings.push('sem entrada em grammar_input_map.json'); out.push(res); return; }
    const forms = (entry.forms || []).concat(Object.values(entry.extraForms || {}));
    const textBefore = order.slice(0, pos).map(id => byId[id]).filter(u => u && u.type !== 'grammar').map(unitText).join('\n');
    const textAfter = order.slice(pos + 1).map(id => byId[id]).filter(u => u && u.type !== 'grammar').map(unitText).join('\n');
    const per = (t) => (entry.forms || []).map(f => countMatches(t, f));
    const beforeByForm = per(textBefore), afterByForm = per(textAfter);
    res.before = beforeByForm.reduce((a, b) => a + b, 0);
    res.after = afterByForm.reduce((a, b) => a + b, 0);
    if (res.before === 0 && res.after > 0) res.warnings.push(`o input só aparece DEPOIS desta unidade (${res.after} ocorrências)`);
    else if (res.before < min) res.warnings.push(`pouco input antes (${res.before} < ${min})`);
    if (Object.keys(entry.extraForms || {}).length){
      Object.entries(entry.extraForms).forEach(([label, re]) => {
        const n = countMatches(textBefore, re);
        if (n === 0) res.warnings.push(`"${label}": 0 ocorrências antes (sistematiza forma que o aluno nunca viu)`);
      });
    }
    // formas individuais sem nenhuma ocorrência antes (ex.: savoir, il faut)
    (entry.forms || []).forEach((f, i) => { if (beforeByForm.length > 1 && beforeByForm[i] === 0) res.warnings.push(`uma das formas-alvo tem 0 ocorrências antes: /${f.slice(0, 40)}…/`); });
    out.push(res);
  });
  return out;
}

if (require.main === module){
  const content = loadContent();
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'grammar_input_map.json'), 'utf8'));
  const rows = analyze(content, map);
  let nWarn = 0;
  console.log('Validador curricular -- gramática do A1 (aviso, não erro)\n');
  rows.forEach(r => {
    const flag = r.warnings.length ? '⚠️ ' : '✅ ';
    console.log(`${flag}${r.unitId.padEnd(7)} ${r.structure}  [antes: ${r.before} · depois: ${r.after}]`);
    r.warnings.forEach(w => { nWarn++; console.log(`      - ${w}`); });
  });
  console.log(`\n${rows.length} unidades de gramática, ${nWarn} avisos.`);
  if (process.argv.includes('--strict') && nWarn) process.exit(1);
}
module.exports = { analyze, loadContent };
