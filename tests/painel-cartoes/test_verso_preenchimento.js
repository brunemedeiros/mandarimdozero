// Etapa 3 (c4, decisão da dona 2026-10-19): o verso de preenchimento gravado no cartão
// ("(múltipla escolha)", "(completar a frase)", "(sem tradução)") aparece no idioma do site
// em Meus cartões e em "Cartões criados" (painel da professora). Só exibição: o DADO gravado
// continua em português, e em pt-BR o texto mostrado é exatamente o de antes.
// Código REAL: shared/flashcard-native-persistence.js e shared/teacher-cards-ui.js, catálogos reais.
// Rodar: node tests/painel-cartoes/test_verso_preenchimento.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

function catalog(lang){
  const sb = {}; sb.window = sb; vm.runInNewContext(read(`shared/i18n/${lang}.js`), sb); return sb.I18N_CATALOG[lang];
}
const CAT = { 'pt-BR': catalog('pt-BR'), en: catalog('en') };
function ctxFor(lang){
  const ctx = vm.createContext({ console, Object, Array, String, JSON });
  ctx.window = ctx;
  ctx.t = (k, p) => { const v = (k in CAT[lang]) ? CAT[lang][k] : CAT['pt-BR'][k]; return v === undefined ? k : String(v).replace(/\{(\w+)\}/g, (m, x) => (p && p[x] !== undefined) ? p[x] : m); };
  ctx.escapeHTML = s => String(s == null ? '' : s);
  vm.runInContext(read('languages/registry.js'), ctx);
  vm.runInContext(read('shared/flashcard-model.js'), ctx);
  vm.runInContext(read('shared/flashcard-editor-state.js'), ctx);
  vm.runInContext(read('shared/flashcard-native-persistence.js'), ctx);
  vm.runInContext(read('shared/teacher-cards-ui.js'), ctx);
  return ctx;
}

const ROWS = [
  { id: 1, front: 'Qual é a cor?', back_trans: '(múltipla escolha)', card_generation_mode: 'multiple_choice', fields: [] },
  { id: 2, front: null, back_trans: '(completar a frase)', card_generation_mode: 'cloze', fields: [] },
  { id: 3, front: 'bonjour', back_trans: '(sem tradução)', card_generation_mode: 'normal', fields: [] },
  { id: 4, front: 'merci', back_trans: 'obrigado', card_generation_mode: 'normal', fields: [] },
  { id: 5, front: 'chat', back_trans: 'gato' }, // legado
  { id: 6, front: 'x', back_trans: null },
  { id: 7, front: null, back_trans: '', cloze_sentence: 'Je ___ ici', cloze_answer: 'suis' },
];
// "Hoje" (antes desta mudança): Meus cartões mostrava escapeHTML(c.back_trans); o painel, c.back_trans || ''.
const before = r => (r.back_trans == null ? '' : r.back_trans) || '';

const pt = ctxFor('pt-BR'), en = ctxFor('en');
ROWS.forEach(r => {
  check(`pt-BR: linha ${r.id} igual a antes (Meus cartões)`, pt.flashcardRowDisplayTexts(r).back === before(r), [pt.flashcardRowDisplayTexts(r).back, before(r)]);
  check(`pt-BR: linha ${r.id} igual a antes (Cartões criados)`, pt.tccSummary(r).back === before(r), [pt.tccSummary(r).back, before(r)]);
  check(`pt-BR e en: frente igual (só o verso de preenchimento muda)`, pt.tccSummary(r).front === en.tccSummary(r).front);
});
const enBack = id => en.flashcardRowDisplayTexts(ROWS.find(r => r.id === id)).back;
check('en: "(múltipla escolha)" -> "(multiple choice)"', enBack(1) === '(multiple choice)', enBack(1));
check('en: "(completar a frase)" -> "(fill in the blank)"', enBack(2) === '(fill in the blank)', enBack(2));
check('en: "(sem tradução)" -> "(no translation)"', enBack(3) === '(no translation)', enBack(3));
check('en: Cartões criados também traduz', en.tccSummary(ROWS[2]).back === '(no translation)');
check('en: verso de verdade não muda', enBack(4) === 'obrigado' && enBack(5) === 'gato');
check('en: nenhum verso de preenchimento em português', ROWS.every(r => !/múltipla|completar|sem tradução/.test(en.flashcardRowDisplayTexts(r).back)));
// o dado gravado continua em português nos dois idiomas
const st = (mode) => ({ cardGenerationMode: mode, fields: mode === 'multiple_choice'
  ? [{ id: 'a', role: 'prompt', content: { value: 'p' } }, { id: 'b', role: 'answer', content: { value: '' } }]
  : [{ id: 'a', role: null, content: { value: 'x' } }, { id: 'b', role: null, content: { value: '' } }] });
[['multiple_choice', '(múltipla escolha)'], ['cloze', '(completar a frase)'], ['normal', '(sem tradução)']].forEach(([m, v]) => {
  check(`gravação (${m}) continua "${v}" com o site em pt-BR`, pt.deriveLegacyMirrorFromNoteEditorState(st(m)).back_trans === v, pt.deriveLegacyMirrorFromNoteEditorState(st(m)));
  check(`gravação (${m}) continua "${v}" com o site em en`, en.deriveLegacyMirrorFromNoteEditorState(st(m)).back_trans === v);
});
// as duas telas usam o helper
check('Meus cartões usa flashcardRowDisplayTexts', /flashcardRowDisplayTexts\(c\)\.back/.test(read('shared/my-flashcards.js')));
check('Cartões criados usa flashcardRowDisplayTexts', /flashcardRowDisplayTexts\(c\)\.back/.test(read('shared/teacher-cards-ui.js')));
console.log(`verso de preenchimento no idioma do site: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
process.exit(failed ? 1 : 0);
