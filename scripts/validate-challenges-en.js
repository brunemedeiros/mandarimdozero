// Valida docs/i18n/challenges-en.json e dictations-en.json contra as fontes.
// Uso: node scripts/validate-challenges-en.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
function load(file, name){
  const s = fs.readFileSync(path.join(root, file), 'utf8') + `\n;globalThis.__x=${name};`;
  const c = {}; vm.runInNewContext(s, c); return c.__x;
}
const sources = load('fr/challenges.js', 'CHALLENGES').map(c => ({ ...c, _src: 'fr/challenges.js' }));
const dir = path.join(root, 'fr/scripts/challenges_import');
for (const f of fs.readdirSync(dir).filter(f => /^lote-.*\.json$/.test(f) && !/content/.test(f))) {
  for (const c of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) sources.push({ ...c, _src: f });
}
const byId = new Map(sources.map(c => [c.id, c]));
const dicts = load('fr/dictations.js', 'DICTATIONS');
const ch = JSON.parse(fs.readFileSync(path.join(root, 'docs/i18n/challenges-en.json'), 'utf8'));
const dc = JSON.parse(fs.readFileSync(path.join(root, 'docs/i18n/dictations-en.json'), 'utf8'));
const errors = [];
const ne = v => typeof v === 'string' && v.trim().length > 0;
const ALLOWED = { expression: ['meaning'], listen_translate: ['referenceTranslations', 'explanation'], accent: ['explanation'] };
for (const [id, e] of Object.entries(ch)) {
  const c = byId.get(id);
  if (!c) { errors.push(`${id}: id não existe nas fontes`); continue; }
  for (const k of Object.keys(e)) if (!ALLOWED[c.type].includes(k)) errors.push(`${id}: campo "${k}" não existe no tipo ${c.type}`);
  if (c.type === 'expression' && !ne(e.meaning)) errors.push(`${id}: meaning vazio`);
  if (c.type === 'accent' && !ne(e.explanation)) errors.push(`${id}: explanation vazio`);
  if (c.type === 'listen_translate') {
    const r = e.referenceTranslations;
    if (!Array.isArray(r) || r.filter(ne).length < 2 || r.some(x => !ne(x))) errors.push(`${id}: referenceTranslations precisa de >=2 itens não vazios`);
    else if (new Set(r.map(x => x.toLowerCase())).size !== r.length) errors.push(`${id}: referenceTranslations com duplicata`);
    if (c.explanation && !ne(e.explanation)) errors.push(`${id}: explanation existe na fonte mas falta em EN`);
    if (!c.explanation && 'explanation' in e) errors.push(`${id}: explanation EN sem equivalente na fonte`);
  }
  for (const [k, v] of Object.entries(e)) if (typeof v === 'string' && /[ãõçáéíóú]/i.test(v) && !/(où|ou|enchantée|brésilienne|brésilien|plaît|à|ô|é|ç|â|û|è|ê|î|Léa|boulangerie|gueule)/.test(v)) errors.push(`${id}: ${k} parece conter português: ${v}`);
}
const missing = sources.filter(c => !ch[c.id]).map(c => c.id);
if (missing.length) errors.push(`faltam ${missing.length} desafios: ${missing.join(', ')}`);
const dmiss = dicts.filter(d => !dc[d.id]).map(d => d.id);
for (const d of dicts) if (dc[d.id] && !ne(dc[d.id].task)) errors.push(`${d.id}: task vazio`);
for (const id of Object.keys(dc)) { if (!dicts.find(d => d.id === id)) errors.push(`${id}: ditado inexistente`); else for (const k of Object.keys(dc[id])) if (k !== 'task') errors.push(`${id}: campo "${k}" não exibido`); }
if (dmiss.length) errors.push(`faltam ${dmiss.length} ditados: ${dmiss.join(', ')}`);
if (errors.length) { console.error('ERROS:\n' + errors.join('\n')); process.exit(1); }
console.log(`OK: ${Object.keys(ch).length}/${sources.length} desafios, ${Object.keys(dc).length}/${dicts.length} ditados`);
