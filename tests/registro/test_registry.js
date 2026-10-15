// E1: registro de idiomas (languages/registry.json) -- unidade + lint de literais em shared/.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FALHOU:', m); } };

const { LanguageRegistry: L, AVAILABLE_LANGUAGES: AL } = require(path.join(root, 'languages/registry.js'));
const json = JSON.parse(fs.readFileSync(path.join(root, 'languages/registry.json'), 'utf8'));

// 1. registry.js em dia com o JSON
ok(cp.spawnSync('node', ['scripts/build-registry.js', '--check'], { cwd: root }).status === 0, 'registry.js desatualizado');

// 2. contrato: campos obrigatórios
const req = ['id','appKey','enabled','family','locale','fieldLang','path','name','nativeName','names','flagSvg','accent','icon','brand','tts','modules','hasLevelTest','siteLanguages','courses'];
for (const l of json.languages) {
  for (const k of req) ok(l[k] !== undefined, `${l.id}: falta campo ${k}`);
  ok(['latin','cjk'].includes(l.family), `${l.id}: family inválida`);
  ok(!l.siteLanguages.includes(l.locale === 'pt-BR' ? 'pt-BR' : '__'), `${l.id}: siteLanguages contém o próprio idioma`);
  ok(l.flagSvg.startsWith('<svg'), `${l.id}: bandeira deve ser SVG`);
  ok(Object.keys(l.courses).every(s => l.siteLanguages.includes(s)), `${l.id}: curso para idioma de site não permitido`);
  ok(Object.values(l.courses).every(c => ['rascunho','beta','publicado'].includes(c.status)), `${l.id}: status inválido`);
}

// 3. valores idênticos aos mapas antigos (nenhuma regressão)
ok(JSON.stringify(L.studyLangMap()) === JSON.stringify({ frances: 'fr', mandarim: 'zh', portugues: 'pt' }), 'studyLangMap');
ok(JSON.stringify(L.langIdMap(true)) === JSON.stringify({ frances: 'fr', mandarim: 'zh' }), 'langIdMap(true)');
ok(JSON.stringify(L.folderMap(true)) === JSON.stringify({ frances: 'fr', mandarim: 'zh' }), 'folderMap(true)');
ok(JSON.stringify(L.spokenRulesVersionByLang()) === JSON.stringify({ fr: 4, zh: 0, pt: 3 }), 'spokenRulesVersionByLang (deve ser igual ao antigo { fr:4, pt:3, zh:0 })');
ok(L.deckLabel('frances') === 'Francês' && L.deckLabel('mandarim') === 'Mandarim' && L.deckLabel('portugues') === 'Português', 'deckLabel');
ok(L.flagEmoji('frances') === '🇫🇷' && L.flagEmoji('mandarim') === '🇨🇳', 'flagEmoji');
ok(L.isCjk('mandarim') && !L.isCjk('frances') && !L.isCjk('portugues') && !L.isCjk('x'), 'isCjk');
ok(L.defaultAppKey() === 'frances', 'defaultAppKey');
ok(L.layerDir('frances@pt-BR') === 'courses/fr-pt-BR' && L.layerDir('portugues@en') === 'courses/pt-en' && L.layerDir('x@en') === null, 'layerDir');
ok(L.courseIdOf('frances', 'en') === 'frances@en', 'courseIdOf');
ok(L.courseStatus('frances', 'en').legacyFallback === 'pt-BR' && L.courseStatus('frances', 'en').notice === false, 'curso fr@en legado');
ok(L.siteLanguagesFor('portugues').join() === 'en', 'pt só aceita en (Q-04)');

// 4. AVAILABLE_LANGUAGES: mesmo formato e mesmos itens de antes; pt oculto
ok(AL.map(x => x.id).join() === 'fr,zh', 'AVAILABLE_LANGUAGES sem pt');
ok(AL.every(x => ['id','appKey','name','nativeName','flagSvg','path','accent','icon','enabled','hasLevelTest'].every(k => x[k] !== undefined)), 'forma de AVAILABLE_LANGUAGES');
ok(AL[0].name === 'Francês' && AL[1].name === 'Chinês' && AL[0].hasLevelTest === true && AL[1].hasLevelTest === false, 'valores de AVAILABLE_LANGUAGES');

// 5. LINT: nenhum literal de appKey em shared/ fora das exceções declaradas (código, sem comentários)
const EXCECOES = {
  // rótulos por chave de i18n (a CHAVE do objeto é o appKey; texto vem do catálogo)
  'admin-notifications.js': 'opções <option> com chave i18n por idioma',
  'admin-reports.js': 'REPORT_LANGUAGE_LABELS (getters i18n)',
  'admin-students.js': 'STUDENT_LANGUAGE_LABELS (getters i18n) e FLASHCARD_DIRECTION_LANGUAGE_LABELS (decisão da autora)',
  'deck-browser.js': 'DECK_BROWSER_LANG_LABELS (getters i18n)',
  'my-flashcards.js': 'myFlashcardLangName: nome em português como lógica (docs/i18n/inventario)',
  'study-trail-model.js': 'tabela de rótulos de tag em português (STUDY_TRAIL_TAG_LABEL_PT)',
  // Código da main (2026-10-12, Banco de Revisão e convite de professora) escrito depois da E1 com os três idiomas fixos; migrar para o registro é item da E4+.
  'review-bank-import.js': 'lista de idiomas fixa (migrar para o registro)',
  'review-bank-model.js': 'lista de idiomas fixa (migrar para o registro)',
  'review-bank.js': 'lista de idiomas fixa (migrar para o registro)',
  'teacher-invites.js': 'lista de idiomas fixa (migrar para o registro)',
};
const dir = path.join(root, 'shared');
const bad = [];
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
  if (EXCECOES[f] || f === 'app-identity.js') continue;
  const code = fs.readFileSync(path.join(dir, f), 'utf8').split('\n')
    .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .map(line => line.replace(/\/\/.*$/, ''));
  code.forEach((line, i) => { if (/\b(frances|mandarim|portugues)\b/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`); });
}
ok(bad.length === 0, 'literais de appKey fora do registro:\n  ' + bad.join('\n  '));

console.log(`registro: ${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
