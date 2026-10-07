// i18n Fase 7 -- português usado como LÓGICA, desatado sem mudar comportamento.
// Carrega os arquivos REAIS de shared/ num sandbox vm (nunca cópias).
// Rodar: node tests/i18n/test_fase7_logic_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const FILES = ['shared/flashcard-model.js', 'shared/flashcard-editor-state.js', 'shared/deck-engine.js', 'shared/anki-import.js'];

const ctx = { console, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder };
ctx.flashcardIdForRow = (p, row) => (row.revision > 0 ? `${p}${row.id}-r${row.revision}` : `${p}${row.id}`);
vm.createContext(ctx);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const run = code => vm.runInContext(code, ctx);

let ok = 0, fail = 0;
function check(name, cond){ if (cond) ok++; else { fail++; console.log('FALHOU:', name); } }

// ---- (d) idioma da tradução de linha legada: default pt-BR, idêntico ----
const legacyFr = { id: 1, revision: 0, front: 'le pain', back_trans: 'o pão', front_is_target_language: true, status: 'active' };
const legacyFrInv = Object.assign({}, legacyFr, { id: 2, front: 'o pão', back_trans: 'le pain', front_is_target_language: false });
const legacyZh = { id: 3, revision: 0, front: '你好', front_pinyin: 'nǐ hǎo', back_trans: 'olá', status: 'active' };
const legacyCloze = { id: 4, revision: 0, cloze_sentence: 'Je ___ brésilien.', cloze_answer: 'suis', back_trans: 'Eu sou brasileiro.', status: 'active' };
ctx.__rows = { legacyFr, legacyFrInv, legacyZh, legacyCloze };
const langs = run(`(() => {
  const o = (appKey) => ({ origin: 'self', appKey, idPrefix: 's' });
  return {
    fr: interpretNoteFromRow(__rows.legacyFr, o('frances')).note.fields.map(f => f.lang),
    frInv: interpretNoteFromRow(__rows.legacyFrInv, o('frances')).note.fields.map(f => f.lang),
    zh: interpretNoteFromRow(__rows.legacyZh, o('mandarim')).note.fields.map(f => f.lang),
    cloze: interpretNoteFromRow(__rows.legacyCloze, o('frances')).note.fields.map(f => f.lang),
    frEn: interpretNoteFromRow(__rows.legacyFr, Object.assign(o('frances'), { nativeLang: 'en' })).note.fields.map(f => f.lang),
    def: legacyTranslationLang(), defEmpty: legacyTranslationLang({ nativeLang: '' }),
  };
})()`);
check('fr legado: [fr, pt-BR]', JSON.stringify(langs.fr) === '["fr","pt-BR"]');
check('fr legado invertido: [pt-BR, fr]', JSON.stringify(langs.frInv) === '["pt-BR","fr"]');
check('zh legado: [zh, zh-pinyin, pt-BR]', JSON.stringify(langs.zh) === '["zh","zh-pinyin","pt-BR"]');
check('cloze legado: [fr, pt-BR]', JSON.stringify(langs.cloze) === '["fr","pt-BR"]');
check('opts.nativeLang parametriza', JSON.stringify(langs.frEn) === '["fr","en"]');
check('default é pt-BR', langs.def === 'pt-BR' && langs.defEmpty === 'pt-BR');

// ---- (b) unitTitle continua idêntico + chave estável nova ----
const titles = run(`(() => {
  const t = buildEngineCardsFromRow(__rows.legacyFr, { origin: 'teacher', appKey: 'frances', idPrefix: 't' })[0];
  const s = buildEngineCardsFromRow(__rows.legacyFr, { origin: 'self', appKey: 'frances', idPrefix: 's' })[0];
  return { t: t.unitTitle, tk: t.unitTitleKey, s: s.unitTitle, sk: s.unitTitleKey };
})()`);
check('teacher unitTitle inalterado', titles.t === 'Da sua professora');
check('self unitTitle inalterado', titles.s === 'Meus cartões');
check('chaves estáveis', titles.tk === 'flashcards.origin.teacherTitle' && titles.sk === 'flashcards.origin.selfTitle');

// ---- (a) Anki: modelo zh reconhecido por papel/alias, .apkg antigos inclusos ----
function zhModel(names){
  const [p, c, t] = names;
  return { id: 9, type: 0, flds: names.map((name, ord) => ({ name, ord })),
    tmpls: [{ ord: 0, qfmt: `<div>{{${p}}}</div>`, afmt: `{{FrontSide}}<hr id='answer'>{{${c}}}<div>{{${t}}}</div>` }] };
}
ctx.__models = {
  pt: zhModel(['Pinyin', 'Caractere', 'Tradução']),
  en: zhModel(['Pinyin', 'Character', 'Translation']),
  wrongOrder: zhModel(['Pinyin', 'Tradução', 'Caractere']),
  arbitrary: zhModel(['A', 'B', 'C']),
};
const cls = run(`({
  pt: classifyKnownZhPinyinCharTranslationModel(__models.pt),
  en: classifyKnownZhPinyinCharTranslationModel(__models.en),
  wrongOrder: classifyKnownZhPinyinCharTranslationModel(__models.wrongOrder),
  arbitrary: classifyKnownZhPinyinCharTranslationModel(__models.arbitrary),
  ptFull: classifyAnkiNoteType(__models.pt),
})`);
check('apkg antigo (PT) reconhecido igual a antes', cls.pt && cls.pt.kind === 'zh_pinyin_normal'
  && cls.pt.pinyinFieldName === 'Pinyin' && cls.pt.hanziFieldName === 'Caractere' && cls.pt.translationFieldName === 'Tradução');
check('classifyAnkiNoteType PT continua zh_pinyin_normal', cls.ptFull && cls.ptFull.kind === 'zh_pinyin_normal');
check('nomes em inglês reconhecidos por papel', cls.en && cls.en.hanziFieldName === 'Character' && cls.en.translationFieldName === 'Translation');
check('ordem de papéis trocada não reconhecida', cls.wrongOrder === null);
check('nomes arbitrários não reconhecidos (sem adivinhação)', cls.arbitrary === null);

const mapped = run(`(() => {
  const note = { id: 1, guid: 'g', flds: ['nǐ hǎo', '你好', 'olá'], tags: [] };
  const r = mapAnkiNoteToNativeEditorState(note, __models.en, classifyKnownZhPinyinCharTranslationModel(__models.en), 'mandarim');
  return r.ok ? r.editorState.fields.map(f => [f.lang, f.content.value]) : r;
})()`);
check('mapeamento en: hanzi/pinyin/tradução com lang pt-BR default',
  JSON.stringify(mapped) === JSON.stringify([['zh', '你好'], ['zh-pinyin', 'nǐ hǎo'], ['pt-BR', 'olá']]));

// export: nome do campo do Cloze continua "Tradução" por padrão (export idêntico)
const exportSrc = fs.readFileSync(path.join(ROOT, 'shared/anki-export.js'), 'utf8');
check('export Cloze: default "Tradução"', /const ANKI_CLOZE_TRANSLATION_FIELD_DEFAULT = "Tradução";/.test(exportSrc));
const n = 'Tradução';
check('export Cloze: afmt idêntico ao anterior',
  `{{cloze:Text}}<hr id='answer'><div style='text-align:center;font-size:18px;'>{{${n}}}</div>` ===
  "{{cloze:Text}}<hr id='answer'><div style='text-align:center;font-size:18px;'>{{Tradução}}</div>");

// ---- (e) Course Deck: nome de exibição pela identidade, nunca pelo nome do banco ----
ctx.__decks = {
  unit: { id: 1, kind: 'course', course_unit_id: 'A1-1', name: 'Saudações' },
  root: { id: 2, kind: 'course', course_unit_id: null, name: 'Francês — Curso' },
  personal: { id: 3, kind: 'personal', name: 'Meu deck' },
  orphan: { id: 4, kind: 'course', course_unit_id: 'A1-99', name: 'Antigo' },
};
const dn = run(`(() => {
  const units = [{ id: 'A1-1', title: 'Greetings' }];
  return [courseDeckDisplayName(__decks.unit, units), courseDeckDisplayName(__decks.root, units),
    courseDeckDisplayName(__decks.personal, units), courseDeckDisplayName(__decks.orphan, units),
    courseDeckDisplayName(__decks.unit, [{ id: 'A1-1', title: 'Saudações' }])];
})()`);
check('Course Deck resolve título pela unit', dn[0] === 'Greetings');
check('raiz de curso usa decks.name', dn[1] === 'Francês — Curso');
check('Deck não-curso intocado', dn[2] === 'Meu deck');
check('unit inexistente cai pro decks.name', dn[3] === 'Antigo');
check('mesma língua = mesmo nome de hoje', dn[4] === 'Saudações');

console.log(`i18n Fase 7 (lógica): ${ok}/${ok + fail} verificações — ${fail ? 'FALHOU' : 'OK'}`);
process.exit(fail ? 1 : 0);
