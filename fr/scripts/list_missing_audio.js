// Lista os textos falados do currículo que NÃO têm mp3 no AUDIO_MANIFEST.
// Uso: node fr/scripts/list_missing_audio.js <fr|zh>   -> imprime JSON
const fs = require('fs'), vm = require('vm'), path = require('path');
const lang = process.argv[2] || 'zh';
const key = lang === 'zh' ? 'c' : 'f';
const root = path.join(__dirname, '..', '..');
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, lang, 'content.js'), 'utf8') + ';globalThis.U=UNITS;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, lang, 'audio-manifest.js'), 'utf8') + ';globalThis.M=AUDIO_MANIFEST;', ctx);
const M = ctx.M, out = new Set();
const add = t => { if (t && typeof t === 'string' && !M[t]) out.add(t); };
ctx.U.forEach(u => {
  (u.vocab || []).forEach(v => add(v[key]));
  (u.phrases || []).forEach(p => add(p[key]));
  ((u.dialogue && u.dialogue.lines) || []).forEach(l => add(l[key]));
  (u.concepts || []).forEach(c => (c.blocks || []).forEach(b => (b.examples || []).forEach(e => add(e[key]))));
});
console.log(JSON.stringify([...out], null, 1));
