#!/usr/bin/env node
// Valida docs/i18n/content-<lang>/<unidade>.json contra fr/content.js:
// mesmas dimensões (vocab, frases, linhas do diálogo, conceitos, blocos,
// exemplos, verdadeiro/falso, lições), nenhum campo vazio, e as mesmas tags HTML
// do português em cada texto com HTML. Para o mandarim: SITE=zh node scripts/validate-content-overlay.js en. Uso: node scripts/validate-content-overlay.js [en] [A1-2 ...]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const lang = process.argv[2] || 'en';
const site = process.env.SITE || 'fr';
const only = process.argv.slice(3);
const c = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, site, 'content.js'), 'utf8') + ';this.UNITS=UNITS;', c);
const dir = path.join(ROOT, 'docs', 'i18n', site === 'fr' ? 'content-' + lang : 'content-' + site + '-' + lang);
let errors = 0;
const err = (u, m) => { errors++; console.log('  ERRO [' + u + ']: ' + m); };
const tags = s => (String(s).match(/<\/?[a-z][^>]*>/gi) || []).map(x => x.toLowerCase()).sort().join('');
function str(u, label, v, ptv){
  if (typeof v !== 'string' || !v.trim()) return err(u, label + ' vazio/ausente');
  if (ptv !== undefined && tags(v) !== tags(ptv)) err(u, label + ': tags HTML diferentes do português (' + tags(ptv) + ' vs ' + tags(v) + ')');
}

const SRC_KEYS = ['f', 'c', 'p', 'blocks', 'scenarioEmoji'];
const noSp = s => String(s).replace(/\s+/g, '');
function checkSrcEntry(id, label, o, orig, isPhrase){
  if (!o || typeof o !== 'object') return err(id, label + ' deve ser objeto');
  Object.keys(o).forEach(k => {
    if (!SRC_KEYS.includes(k)) return err(id, label + ': chave desconhecida "' + k + '"');
    if (orig[k] === undefined) return err(id, label + ': "' + k + '" não existe no original');
  });
  ['f', 'c', 'p', 'scenarioEmoji'].forEach(k => { if (o[k] !== undefined && (typeof o[k] !== 'string' || !o[k].trim())) err(id, label + '.' + k + ' vazio'); });
  if (o.blocks !== undefined){
    if (!Array.isArray(o.blocks) || !o.blocks.length) return err(id, label + '.blocks inválido');
    const field = o.c !== undefined || orig.c !== undefined ? 'c' : 'f';
    const txt = o[field] !== undefined ? o[field] : orig[field];
    const joined = o.blocks.map(b => (b && b[field]) || '').join('');
    if (noSp(joined) !== noSp(txt)) err(id, label + '.blocks juntos (' + joined + ') não formam o texto (' + txt + ')');
  } else if (isPhrase && orig.blocks && (o.f !== undefined || o.c !== undefined)) {
    err(id, label + ': mudou o texto da frase mas não os blocks (reordenar quebraria)');
  }
}
function validateSrc(id, src, u){
  Object.keys(src).forEach(k => { if (!['vocab', 'phrases', 'lines', 'concepts', 'grammar'].includes(k)) err(id, 'src: chave desconhecida "' + k + '"'); });
  const each = (map, arr, label, isPhrase) => Object.keys(map || {}).forEach(i => {
    const it = (arr || [])[Number(i)];
    if (!it) return err(id, 'src.' + label + '[' + i + '] fora do intervalo');
    checkSrcEntry(id, 'src.' + label + '[' + i + ']', map[i], it, isPhrase);
  });
  each(src.vocab, u.vocab, 'vocab', false);
  each(src.phrases, u.phrases, 'phrases', true);
  each(src.lines, u.dialogue && u.dialogue.lines, 'lines', false);
  Object.keys(src.concepts || {}).forEach(cid => {
    const cn = (u.concepts || []).find(x => x.id === cid);
    if (!cn) return err(id, 'src.concepts.' + cid + ' inexistente');
    Object.keys(src.concepts[cid]).forEach(bi => {
      const b = cn.blocks[Number(bi)]; if (!b) return err(id, 'src.concepts.' + cid + '[' + bi + '] fora do intervalo');
      each(src.concepts[cid][bi], b.examples, 'concepts.' + cid + '[' + bi + '].examples', false);
    });
  });
  Object.keys(src.grammar || {}).forEach(bi => {
    const b = u.grammar && u.grammar.blocks[Number(bi)]; if (!b) return err(id, 'src.grammar[' + bi + '] fora do intervalo');
    each(src.grammar[bi], b.examples, 'grammar[' + bi + '].examples', false);
  });
}
fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_meta.json' && !f.startsWith('_')).sort().forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const id = d.unit;
  if (only.length && !only.map(String).includes(String(id))) return;
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
  // src: frases do idioma ESTUDADO localizadas para o idioma do site (opcional).
  if (e.src) validateSrc(id, e.src, u);
  console.log(id + ': validado');
});
// Mandarim: histórias e hanzi (arquivos _stories.json / _hanzi.json)
if (site === 'zh' && !only.length){
  const opt = (f) => { const q = path.join(dir, f); return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; };
  const sx = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'zh', 'stories.js'), 'utf8') + ';this.S=STORIES', sx);
  const st = opt('_stories.json');
  if (!st) err('stories', '_stories.json ausente');
  else sx.S.forEach(s0 => {
    const o = st[s0.id]; const L = 'stories.' + s0.id;
    if (!o) return err(L, 'sem tradução');
    str(L, 'title', o.title); str(L, 'subtitle', o.subtitle);
    if ((o.beats || []).length !== s0.beats.length) return err(L, 'beats: ' + (o.beats || []).length + ' vs ' + s0.beats.length);
    s0.beats.forEach((b, bi) => {
      const ob = o.beats[bi];
      if ((ob.lines || []).length !== b.lines.length) err(L, 'beat ' + bi + ' lines: ' + (ob.lines || []).length + ' vs ' + b.lines.length);
      b.lines.forEach((l, li) => str(L, 'beat ' + bi + ' line ' + li, (ob.lines || [])[li], l.t));
      if (b.question){
        str(L, 'beat ' + bi + ' prompt', ob.question && ob.question.prompt, b.question.prompt);
        const oo = (ob.question && ob.question.options) || [];
        if (oo.length !== b.question.options.length) err(L, 'beat ' + bi + ' options: ' + oo.length + ' vs ' + b.question.options.length);
        b.question.options.forEach((x, xi) => str(L, 'beat ' + bi + ' option ' + xi, oo[xi], x));
      } else if (ob.question) err(L, 'beat ' + bi + ' tem question sem original');
    });
  });
  const hx = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'zh', 'hanzi-data.js'), 'utf8') + ';this.L=HANZI_LESSONS', hx);
  const hz = opt('_hanzi.json');
  if (!hz) err('hanzi', '_hanzi.json ausente');
  else hx.L.flat().forEach(h => {
    const o = hz[h.char]; const L = 'hanzi.' + h.char;
    if (!o) return err(L, 'sem tradução');
    str(L, 'meaning', o.meaning, h.meaning);
    if ((o.radicals || []).length !== (h.radicals || []).length) err(L, 'radicals: ' + (o.radicals || []).length + ' vs ' + (h.radicals || []).length);
    (h.radicals || []).forEach((r, ri) => str(L, 'radicals[' + ri + ']', (o.radicals || [])[ri], r.m));
    if (h.mnemonic) str(L, 'mnemonic', o.mnemonic, h.mnemonic); else if (o.mnemonic) err(L, 'mnemonic sem original');
  });
  console.log('stories/hanzi: validados');
}
console.log(errors ? errors + ' erro(s)' : 'OK'); process.exit(errors ? 1 : 0);
