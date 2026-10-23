// Etapa 0a do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.11 item 2): GARANTIA PERMANENTE, em TODOS os
// sites (descobertos sozinhos: pasta com index.html e app.js; o zh entrou no C1 da paridade).
// Falha (e bloqueia o merge) se um id já publicado em <site>/published_ids.json sumir do conteúdo sem estar em
// <site>/curriculum-changes.js (STUDY_KEY_MERGES, STUDY_RETIRED_KEYS, UNIT_MERGES, MODULE_MERGES, RETIRED_LESSON_IDS).
// Vale para cartões, unidades, módulos e lições. Também prova que o próprio guarda funciona (conteúdo v2 de teste do fr).
// Rodar: node tests/curriculo-ids/test_ids_publicados.js
const fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-e/harness');
const ids = require('../../scripts/ids_publicados.js');
const L = require('./lib');

const sites = ids.discoverSites().map(s => s.site);
check('sites descobertos: fr e zh pelo menos', sites.includes('fr') && sites.includes('zh'), sites);
const bySite = {};
sites.forEach(site => {
  const tag = `[${site}]`;
  check(`${tag} tem ${site}/published_ids.json e ${site}/curriculum-changes.js`, fs.existsSync(ids.ledgerPath(site)) && fs.existsSync(path.join(L.ROOT, site, 'curriculum-changes.js')));
  const ledger = ids.readLedger(site);
  const cur = ids.currentIds(site);
  const changes = ids.readChanges(site);
  bySite[site] = { ledger, cur, changes };
  // --- a garantia em si (conteúdo de verdade) ---
  const problems = ids.checkLedger(ledger, cur, changes);
  problems.slice(0, 20).forEach(p => console.log('   ' + tag + ' ' + p));
  check(`${tag} nenhum id publicado sumiu (${ledger.cards.length} cartões, ${ledger.units.length} unidades, ${ledger.modules.length} módulos, ${ledger.lessons.length} lições)`, ledger.cards.length > 0 && problems.length === 0, problems.length);
  const missingFromLedger = cur.cards.filter(id => !ledger.cards.includes(id)).concat(cur.units.filter(id => !ledger.units.includes(id)), cur.modules.filter(id => !ledger.modules.includes(id)), cur.lessons.filter(id => !ledger.lessons.includes(id)));
  check(`${tag} livro-razão em dia (todo id atual está nele; senão: node scripts/ids_publicados.js ${site})`, missingFromLedger.length === 0, missingFromLedger.slice(0, 5));
  check(`${tag} livro-razão sem repetição`, new Set(ledger.cards).size === ledger.cards.length && new Set(ledger.lessons).size === ledger.lessons.length);
  check(`${tag} curriculum-changes.js: formatos`, typeof changes.STUDY_KEY_MERGES === 'object' && Array.isArray(changes.STUDY_RETIRED_KEYS) && typeof changes.UNIT_MERGES === 'object' && typeof changes.MODULE_MERGES === 'object' && Array.isArray(changes.RETIRED_LESSON_IDS) && Number.isInteger(changes.CURRICULUM_VERSION));
  check(`${tag} fusão nunca aponta para chave aposentada nem para si mesma`, Object.keys(changes.STUDY_KEY_MERGES).every(k => changes.STUDY_KEY_MERGES[k] !== k && !changes.STUDY_RETIRED_KEYS.includes(changes.STUDY_KEY_MERGES[k])));
});
// zh: unidade apagada sem UNIT_MERGES também é acusada (unidades numéricas gravadas como texto)
{
  const { ledger, cur, changes } = bySite.zh;
  const sem3 = Object.assign({}, cur, { units: cur.units.filter(u => u !== '3'), lessons: cur.lessons.filter(l => !l.startsWith('3/')) });
  check('[zh] unidade 3 apagada sem UNIT_MERGES: acusa', ids.checkLedger(ledger, sem3, changes).some(p => p.includes('unidade 3 ')));
  check('[zh] unidade 3 apagada com UNIT_MERGES { "3": null }: passa', ids.checkLedger(ledger, sem3, Object.assign({}, changes, { UNIT_MERGES: { 3: null } })).length === 0);
  const semCartao = Object.assign({}, cur, { cards: cur.cards.filter(id => id !== 'u1-v0' && id !== 'u1-v0-b') });
  check('[zh] palavra 1-v0 apagada sem STUDY_RETIRED_KEYS: acusa', ids.checkLedger(ledger, semCartao, changes).some(p => p.includes('u1-v0 ')));
  check('[zh] palavra 1-v0 com STUDY_RETIRED_KEYS: passa', ids.checkLedger(ledger, semCartao, Object.assign({}, changes, { STUDY_RETIRED_KEYS: ['1-v0'] })).length === 0);
}
const { ledger, cur, changes } = bySite.fr;

// --- o guarda funciona: conteúdo v2 de TESTE (operações reais da seção 5) ---
const c2 = L.frContext();
const ops = L.applyV2(c2);
const cur2 = {
  cards: c2.STATE.cards.map(c => c.id),
  units: c2.UNITS.map(u => u.id),
  modules: c2.MODULES_REF.map(m => m.id),
  lessons: c2.UNITS.flatMap(u => (u.lessons || []).map(l => u.id + '/' + l.id)),
};
const sem = ids.checkLedger(ledger, cur2, {});
check('v2 SEM registrar as mudanças: o guarda acusa (fusão, aposentado e lições somem)', sem.some(p => p.includes('uA1-9-v0 ')) && sem.some(p => p.includes('uA1-20-v9 ')) && sem.some(p => p.includes('A1-10/numeros-30-50')), sem.slice(0, 3));
// frases que deixaram de ser exemplo também somem (o progresso vai para o arquivo): precisam ir para STUDY_RETIRED_KEYS
const vanishedPhrases = sem.filter(p => /cartão u.+-[pd]\d+ sumiu/.test(p)).map(p => p.split(' ')[1].slice(1));
const com = ids.checkLedger(ledger, cur2, { STUDY_KEY_MERGES: ops.merges, STUDY_RETIRED_KEYS: ops.retired.concat(vanishedPhrases), RETIRED_LESSON_IDS: ops.retiredLessons });
check('v2 COM as mudanças registradas: o guarda passa', com.length === 0, com.slice(0, 5));
const fusaoQuebrada = ids.checkLedger(ledger, cur2, { STUDY_KEY_MERGES: Object.assign({}, ops.merges, { 'A1-9-v0': 'A1-99-v0' }), STUDY_RETIRED_KEYS: ops.retired.concat(vanishedPhrases), RETIRED_LESSON_IDS: ops.retiredLessons });
check('fusão para uma chave que não existe: acusa', fusaoQuebrada.some(p => p.includes('fundido em A1-99-v0')));
const semUnidade = ids.checkLedger(ledger, Object.assign({}, cur, { units: cur.units.filter(u => u !== 'A1-5'), lessons: cur.lessons.filter(l => !l.startsWith('A1-5/')) }), changes);
check('unidade apagada sem UNIT_MERGES: acusa', semUnidade.some(p => p.includes('unidade A1-5')));
check('unidade apagada com UNIT_MERGES: passa', ids.checkLedger(ledger, Object.assign({}, cur, { units: cur.units.filter(u => u !== 'A1-5'), lessons: cur.lessons.filter(l => !l.startsWith('A1-5/')) }), Object.assign({}, changes, { UNIT_MERGES: { 'A1-5': null } })).length === 0);
check('módulo apagado sem MODULE_MERGES: acusa', ids.checkLedger(ledger, Object.assign({}, cur, { modules: cur.modules.slice(1) }), changes).some(p => p.startsWith('módulo')));

// --- o script em modo conferência concorda ---
const { execFileSync } = require('child_process');
let out = '', code = 0;
try { out = execFileSync('node', [path.join(L.ROOT, 'scripts/ids_publicados.js'), '--conferir'], { encoding: 'utf8' }); } catch (e) { code = e.status; out = String(e.stdout) + String(e.stderr); }
check('node scripts/ids_publicados.js --conferir (todos os sites): ok', code === 0 && sites.every(s => out.includes(s + ': ok')), out);
summary('curriculo-ids livro-razão');
