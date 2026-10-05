#!/usr/bin/env node
// Valida docs/i18n/content-<lang>/<unidade>.json contra fr/content.js:
// mesmas dimensões (vocab, frases, linhas do diálogo, conceitos, blocos,
// exemplos, verdadeiro/falso, lições), nenhum campo vazio, e as mesmas tags HTML
// do português em cada texto com HTML. Uso: node scripts/validate-content-overlay.js [en] [A1-2 ...]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const lang = process.argv[2] || 'en';
const only = process.argv.slice(3);
const c = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'fr', 'content.js'), 'utf8') + ';this.UNITS=UNITS;', c);
const dir = path.join(ROOT, 'docs', 'i18n', 'content-' + lang);
let errors = 0;
const err = (u, m) => { errors++; console.log('  ERRO [' + u + ']: ' + m); };
const tags = s => (String(s).match(/<\/?[a-z][^>]*>/gi) || []).map(x => x.toLowerCase()).sort().join('');
function str(u, label, v, ptv){
  if (typeof v !== 'string' || !v.trim()) return err(u, label + ' vazio/ausente');
  if (ptv !== undefined && tags(v) !== tags(ptv)) err(u, label + ': tags HTML diferentes do português (' + tags(ptv) + ' vs ' + tags(v) + ')');
}
fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_meta.json').sort().forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const id = d.unit;
  if (only.length && !only.includes(id)) return;
  const u = c.UNITS.find(x => x.id === id); const e = d[lang];
  if (!u) return err(id, 'unidade inexistente em content.js');
  if (!e) return err(id, 'sem objeto "' + lang + '"');
  str(id, 'title', e.title, u.title); str(id, 'goal', e.goal, u.goal);
  if (u.type === 'grammar'){
    const g = e.grammar || {}, bs = g.blocks || [];
    if (bs.length !== u.grammar.blocks.length) err(id, 'grammar.blocks: ' + bs.length + ' vs ' + u.grammar.blocks.length);
    u.grammar.blocks.forEach((b, bi) => {
      const o = bs[bi] || {}; const L = 'grammar.blocks[' + bi + ']';
      str(id, L + '.title', o.title, b.title); str(id, L + '.body', o.body, b.body);
      const ex = o.examples || [];
      if (ex.length !== (b.examples || []).length) err(id, L + '.examples: ' + ex.length + ' vs ' + (b.examples || []).length);
      (b.examples || []).forEach((x, xi) => str(id, L + '.examples[' + xi + ']', ex[xi], x.t));
      if (b.table){
        const keys = Object.keys(b.table); const tb = o.table || [];
        if (tb.length !== keys.length) err(id, L + '.table: ' + tb.length + ' colunas vs ' + keys.length);
        keys.forEach((k, ci) => { const col = tb[ci] || {}; str(id, L + '.table[' + ci + '].label', col.label, k);
          if ((col.pronouns || []).length !== b.table[k].length) err(id, L + '.table[' + ci + '].pronouns: ' + (col.pronouns || []).length + ' vs ' + b.table[k].length);
          b.table[k].forEach((r, ri) => str(id, L + '.table[' + ci + '].pronouns[' + ri + ']', (col.pronouns || [])[ri], r.pronoun)); });
      } else if (o.table) err(id, L + ' tem table sem original');
    });
    const xs = g.exercises || [];
    if (xs.length !== u.grammar.exercises.length) err(id, 'grammar.exercises: ' + xs.length + ' vs ' + u.grammar.exercises.length);
    u.grammar.exercises.forEach((x, i) => { if (x.hint) str(id, 'grammar.exercises[' + i + '].hint', (xs[i] || {}).hint, x.hint); if ((xs[i] || {}).prompt) str(id, 'grammar.exercises[' + i + '].prompt', xs[i].prompt, x.prompt); });
  }
  (u.lessons || []).forEach(l => str(id, 'lessons.' + l.id, e.lessons && e.lessons[l.id], l.title));
  if ((e.vocab || []).length !== (u.vocab || []).length) err(id, 'vocab: ' + (e.vocab || []).length + ' vs ' + (u.vocab || []).length);
  (u.vocab || []).forEach((v, i) => str(id, 'vocab[' + i + ']', e.vocab && e.vocab[i], v.t));
  if ((e.phrases || []).length !== (u.phrases || []).length) err(id, 'phrases: ' + (e.phrases || []).length + ' vs ' + (u.phrases || []).length);
  (u.phrases || []).forEach((p, i) => { const o = (e.phrases || [])[i] || {}; str(id, 'phrases[' + i + '].t', o.t, p.t); if (p.scenario) str(id, 'phrases[' + i + '].scenario', o.scenario, p.scenario); else if (o.scenario) err(id, 'phrases[' + i + '] tem scenario sem original'); });
  if (u.dialogue){
    str(id, 'dialogue.title', e.dialogue && e.dialogue.title, u.dialogue.title);
    const L = (e.dialogue && e.dialogue.lines) || [];
    if (L.length !== u.dialogue.lines.length) err(id, 'dialogue.lines: ' + L.length + ' vs ' + u.dialogue.lines.length);
    u.dialogue.lines.forEach((l, i) => str(id, 'dialogue.lines[' + i + ']', L[i], l.t));
  }
  (u.concepts || []).forEach(cn => {
    const bs = e.concepts && e.concepts[cn.id];
    if (!bs || bs.length !== cn.blocks.length) return err(id, 'concepts.' + cn.id + ': blocos ' + (bs ? bs.length : 'ausente') + ' vs ' + cn.blocks.length);
    cn.blocks.forEach((b, bi) => {
      str(id, 'concepts.' + cn.id + '[' + bi + '].title', bs[bi].title, b.title); str(id, 'concepts.' + cn.id + '[' + bi + '].body', bs[bi].body, b.body);
      const ex = bs[bi].examples || [];
      if (ex.length !== (b.examples || []).length) err(id, 'concepts.' + cn.id + '[' + bi + '].examples: ' + ex.length + ' vs ' + (b.examples || []).length);
      (b.examples || []).forEach((x, xi) => str(id, 'concepts.' + cn.id + '[' + bi + '].examples[' + xi + ']', ex[xi], x.t));
      const vr = bs[bi].variants || [];
      if (vr.length !== (b.variants || []).length) err(id, 'concepts.' + cn.id + '[' + bi + '].variants: ' + vr.length + ' vs ' + (b.variants || []).length);
      (b.variants || []).forEach((x, vi) => str(id, 'concepts.' + cn.id + '[' + bi + '].variants[' + vi + ']', vr[vi], x.region));
    });
  });
  const tf = e.trueFalse || [];
  if (tf.length !== (u.trueFalseExercises || []).length) err(id, 'trueFalse: ' + tf.length + ' vs ' + (u.trueFalseExercises || []).length);
  (u.trueFalseExercises || []).forEach((x, i) => { str(id, 'trueFalse[' + i + '].claim', tf[i] && tf[i].claim, x.claim); str(id, 'trueFalse[' + i + '].whyNote', tf[i] && tf[i].whyNote, x.whyNote); });
  console.log(id + ': validado');
});
console.log(errors ? errors + ' erro(s)' : 'OK'); process.exit(errors ? 1 : 0);
