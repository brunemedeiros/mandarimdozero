// Paridade: public_note_native (SQL, 061) x nativeNoteEditorStateFromLegacyRow (JS, Fase 6D.8).
// Requer o Postgres local de run.sh (db "pubdeck"). Compara a estrutura semântica (ignora ids de Field).
const vm = require('vm'), cp = require('child_process');
const g = require('../fase-g/harness');
const { read, check, summary } = g;
const { ctx } = g.load('frances', 'u-1');
const psql = (sql) => cp.execFileSync('psql', ['-h', '/tmp/pg', '-p', '54329', '-U', 'pguser', 'pubdeck', '-At', '-c', sql], { encoding: 'utf8' }).trim();
const OWNER = '00000000-0000-0000-0000-0000000000e1';
const fixtures = [
  { n: 'normal fr, front é idioma estudado', r: { language_app_key: 'frances', front: 'bonjour', back_trans: 'olá' } },
  { n: 'normal fr invertido (front é pt)', r: { language_app_key: 'frances', front: 'olá', back_trans: 'bonjour', front_is_target_language: false } },
  { n: 'normal fr com áudio+imagem', r: { language_app_key: 'frances', front: 'chat', back_trans: 'gato', audio_url: 'https://x/a.mp3', image_url: 'https://x/i.png' } },
  { n: 'normal zh com pinyin', r: { language_app_key: 'mandarim', front: '你好', front_pinyin: 'nǐ hǎo', back_trans: 'olá' } },
  { n: 'normal zh sem pinyin', r: { language_app_key: 'mandarim', front: '谢谢', back_trans: 'obrigado' } },
  { n: 'mc fr 2 distratores', r: { language_app_key: 'frances', front: 'maison', back_trans: 'casa', choices: ['carro', 'livro'] } },
  { n: 'mc zh com pinyin + áudio', r: { language_app_key: 'mandarim', front: '水', front_pinyin: 'shuǐ', back_trans: 'água', choices: ['fogo'], audio_url: 'https://x/z.mp3' } },
  { n: 'mc 4 escolhas (corta em 3)', r: { language_app_key: 'frances', front: 'a', back_trans: 'b', choices: ['1', '2', '3', '4'] } },
  { n: 'cloze fr', r: { language_app_key: 'frances', front: null, back_trans: 'Eu sou aqui', cloze_sentence: 'Je ___ ici', cloze_answer: 'suis' } },
  { n: 'cloze zh com pinyin', r: { language_app_key: 'mandarim', front: null, back_trans: 'Eu sou brasileiro', cloze_sentence: '我___巴西人', cloze_answer: '是', cloze_answer_pinyin: 'shì' } },
  { n: 'cloze com chars especiais na resposta', r: { language_app_key: 'frances', front: null, back_trans: 'x', cloze_sentence: 'a ___ b', cloze_answer: 'c\\1&d' } },
  { n: 'portugues normal (sem idioma estudado mapeado)', r: { language_app_key: 'portugues', front: 'a', back_trans: 'b', audio_url: 'https://x/p.mp3' } },
];
const incompat = [
  { n: 'cloze sem ___', r: { language_app_key: 'frances', front: null, back_trans: 'x', cloze_sentence: 'sem', cloze_answer: 'r' } },
  { n: 'cloze com 2 ___', r: { language_app_key: 'frances', front: null, back_trans: 'x', cloze_sentence: 'a ___ b ___', cloze_answer: 'r' } },
  { n: 'mc sem resposta', r: { language_app_key: 'frances', front: 'q', back_trans: '  ', choices: ['a'] } },
];
const norm = (fields, mode) => ({
  mode,
  fields: fields.map(f => {
    const pin = f.pinyinFieldId ? (fields.find(x => x.id === f.pinyinFieldId) || {}).lang || 'BROKEN' : null;
    return { lang: f.lang || null, role: f.role || null, v: (f.content && f.content.value) || '', audio: f.audio ? f.audio.url : null, image: f.image ? f.image.url : null, pin };
  }),
});
(async () => {
  psql(`delete from own_flashcards where owner_id='${OWNER}'`);
  const exist = psql(`select count(*) from auth.users where id='${OWNER}'`);
  if (exist === '0') { console.log('rode run.sh antes (db sem atores)'); process.exit(2); }
  for (const fx of fixtures.concat(incompat)) {
    const r = fx.r, cols = Object.keys(r), q = (v) => v === null ? 'null' : Array.isArray(v) ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb` : typeof v === 'boolean' ? v : `'${String(v).replace(/'/g, "''")}'`;
    const row = Object.assign({ front_is_target_language: true }, r);
    psql(`insert into own_flashcards(owner_id,${Object.keys(row).join(',')}) values ('${OWNER}',${Object.values(row).map(q).join(',')})`);
    const sql = psql(`select public.public_note_native(f)::text from own_flashcards f where id=(select max(id) from own_flashcards)`);
    if (fx.n.indexOf('cloze sem') === 0 || fx.n.startsWith('cloze com 2') || fx.n.startsWith('mc sem')) {
      check('incompatível → NULL no SQL: ' + fx.n, sql === '');
      continue;
    }
    const js = vm.runInContext('(r)=>{const s=nativeNoteEditorStateFromLegacyRow(r);return {mode:s.cardGenerationMode,fields:s.fields}}', ctx)(Object.assign({ id: 1, revision: 0, tags: [] }, row));
    const j = JSON.parse(sql);
    const a = norm(j.fields, j.mode), b = norm(JSON.parse(JSON.stringify(js.fields)), js.mode);
    check('paridade SQL×JS: ' + fx.n, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + '\n  vs\n  ' + JSON.stringify(b));
  }
  // JS também rejeita as incompatíveis (preflight), mesma regra
  const pf = vm.runInContext('legacyFlashcardConversionPreflight', ctx);
  check('preflight JS recusa as mesmas incompatíveis (cloze sem/2 ___, mc sem resposta)', incompat.every(f => pf(f.r).ok === false));
  psql(`delete from own_flashcards where owner_id='${OWNER}'`);
  summary();
})();
