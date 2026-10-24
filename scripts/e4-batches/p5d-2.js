// Paridade 5d, parte 2 (docs/historico/30-paridade-quase-iguais.md): diálogo da lição (falas, áudio em sequência, palavras
// destacadas) e o "Você entendeu?". Base: o texto do fr. Uso:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/p5d-2.js
// O que é do idioma vem de LANG_HOOKS: texto falado da fala (dlgLineText), marcação da fala (dlgLineHTML: fr texto; zh pinyin em
// cima do hanzi), lado do balão (dlgSide: fr põe B à direita; zh põe à direita quem não abriu o diálogo), aviso da palavra
// destacada (dlgWordToast), balão do "Você entendeu?" (dlgBubbleHTML) e texto das opções (dlgOptionHTML).
// Equivalências usadas (semântica, provadas no navegador por tests/paridade-sites/test_quase_iguais.js):
//  - falante sem `speakers`: fr usava { A: {n:'A'}, B: {n:'B'} } e, para outro nome, { n: nome }; o comum usa { n: nome } para
//    qualquer um (mesmo resultado para A e B);
//  - emoji ausente: o fr mostrava o nome do falante inteiro e o zh a 1ª letra; no fr todo falante é "A" ou "B" (1 letra), então
//    `l.spk.slice(0, 1)` dá o mesmo;
//  - opções: o fr guardava { t: texto } e escrevia escapeHTML(t); o comum guarda { o: fala ou opção ruim } e escreve
//    LANG_HOOKS.dlgOptionHTML(o) (fr: escapeHTML do texto); a resposta certa sai igual (já escapada).
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => { if (!a.includes(x)) throw new Error('não achei: ' + x.slice(0, 80)); return a.split(x).join(y); }, s);
const SP = ["  const sp = dlg.speakers || { A: { n: 'A', e: '' }, B: { n: 'B', e: '' } };", "  const sp = dlg.speakers || {};\n  const who = k => sp[k] || { n: k, e: '' };"];
module.exports = {
  batch: 'paridade 5d-2', file: 'licao-dialogo',
  desc: 'diálogo da lição e "Você entendeu?" (paridade 5d, parte 2)',
  functions: {
    renderDialogueStep: { semantic: true, unify: R([SP,
      ["    const side = l.spk === 'B' ? 'b' : 'a';\n    const who = sp[l.spk] || { n: l.spk, e: '' };", '    const side = LANG_HOOKS.dlgSide(dlg, l.spk);\n    const w = who(l.spk);'],
      ["{ name: who.n }", "{ name: w.n }"],
      ['${who.e || escapeHTML(l.spk)}</span><span class="dlg-name">${escapeHTML(who.n)}</span>', '${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span>'],
      ['          <div class="dlg-fr">${dlgHighlight(l.f, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>', '          ${LANG_HOOKS.dlgLineHTML(l, terms)}'],
      ['dlgPlayLine(dlg.lines[i].f)', 'dlgPlayLine(LANG_HOOKS.dlgLineText(dlg.lines[i]))'],
      ['if (w.dataset.tr) showToast(`“${w.dataset.w}” = ${w.dataset.tr}`);', 'if (w.dataset.tr) showToast(LANG_HOOKS.dlgWordToast(w.dataset));'],
      ['dlg.lines.some(l => canSpeakFrench(l.f))', 'dlg.lines.some(l => LANG_HOOKS.canSpeak(LANG_HOOKS.dlgLineText(l)))']]) },
    renderDialogueCheckStep: { semantic: true, unify: R([SP, ['renderDialogueCheck(u, dlg, sp, checks, nextBtn, []);', 'renderDialogueCheck(u, dlg, who, checks, nextBtn, []);']]) },
    renderDialogueCheck: { semantic: true, unify: R([
      ['function renderDialogueCheck(u, dlg, sp, checks, nextBtn, rows){', 'function renderDialogueCheck(u, dlg, who, checks, nextBtn, rows){'],
      ["  const bubble = (idx, text, blank) => {\n    const l = L[idx];\n    const side = l.spk === 'B' ? 'b' : 'a';\n    const who = sp[l.spk] || { n: l.spk, e: '' };\n    return `<div class=\"dlg-row ${side} static\"><div class=\"dlg-avatar\"><span class=\"dlg-emoji\" aria-hidden=\"true\">${who.e || escapeHTML(l.spk)}</span><span class=\"dlg-name\">${escapeHTML(who.n)}</span></div>\n      <div class=\"dlg-bubble\"><div class=\"dlg-fr\">${blank ? '<span class=\"dlg-blank\">· · · · ·</span>' : escapeHTML(text)}</div></div></div>`;",
       "  const bubble = (idx, blank) => {\n    const l = L[idx];\n    const side = LANG_HOOKS.dlgSide(dlg, l.spk);\n    const w = who(l.spk);\n    return `<div class=\"dlg-row ${side} static\"><div class=\"dlg-avatar\"><span class=\"dlg-emoji\" aria-hidden=\"true\">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class=\"dlg-name\">${escapeHTML(w.n)}</span></div>\n      <div class=\"dlg-bubble\">${LANG_HOOKS.dlgBubbleHTML(l, blank)}</div></div>`;"],
      ['${bubble(q.line - 1, L[q.line - 1].f, false)}${bubble(q.line, \'\', true)}', '${bubble(q.line - 1, false)}${bubble(q.line, true)}'],
      ['opts = dlgShuffle([{ t: L[q.line].f, ok: true }, ...q.bad.map(t => ({ t, ok: false }))]);', 'opts = dlgShuffle([{ o: L[q.line], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);'],
      ['opts = dlgShuffle([{ t: L[q.line + 1].f, ok: true }, ...q.bad.map(t => ({ t, ok: false }))]);', 'opts = dlgShuffle([{ o: L[q.line + 1], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);'],
      ['    const dots = checks.map(', "    const optHTML = o => ('o' in o) ? LANG_HOOKS.dlgOptionHTML(o.o) : escapeHTML(o.t);\n    const dots = checks.map("],
      ['<button class="dlg-opt" data-i="${i}">${escapeHTML(o.t)}</button>', '<button class="dlg-opt" data-i="${i}">${optHTML(o)}</button>'],
      ["      const line = L[q.line].f;\n      a.addEventListener('click', () => speakFrench(line, a));\n      if (canSpeakFrench(line)) speakFrench(line, a, true);",
       "      const line = LANG_HOOKS.dlgLineText(L[q.line]);\n      a.addEventListener('click', () => LANG_HOOKS.speak(line, a));\n      if (LANG_HOOKS.canSpeak(line)) LANG_HOOKS.speak(line, a, true);"],
      ['const right = opts.find(x => x.ok).t;', 'const right = optHTML(opts.find(x => x.ok));'],
      ['<div class="dlg-fb-right">${escapeHTML(right)}</div>', '<div class="dlg-fb-right">${right}</div>']]) },
  },
  hooks: {
    fr: {
      dlgLineText: '(l) => l.f',
      dlgLineHTML: '(l, terms) => `<div class="dlg-fr">${dlgHighlight(l.f, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>`',
      dlgSide: "(dlg, spk) => spk === 'B' ? 'b' : 'a'",
      dlgWordToast: '(d) => `“${d.w}” = ${d.tr}`',
      dlgBubbleHTML: "(l, blank) => `<div class=\"dlg-fr\">${blank ? '<span class=\"dlg-blank\">· · · · ·</span>' : escapeHTML(l.f)}</div>`",
      dlgOptionHTML: "(o) => escapeHTML(typeof o === 'string' ? o : o.f)",
    },
    zh: {
      dlgLineText: '(l) => l.c',
      dlgLineHTML: '(l, terms) => `<div class="dlg-py">${dlgHighlightPinyin(l.c, l.p, terms)}</div>\n          <div class="dlg-hz">${dlgHighlight(l.c, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>`',
      dlgSide: '(dlg, spk) => dlgSpeakerSide(dlg, spk)',
      dlgWordToast: "(d) => `${d.w}${d.py ? ' (' + d.py + ')' : ''} = ${d.tr}`",
      dlgBubbleHTML: "(l, blank) => blank ? '<div class=\"dlg-hz\"><span class=\"dlg-blank\">· · · · ·</span></div>' : `<div class=\"dlg-py\">${escapeHTML(l.p)}</div><div class=\"dlg-hz\">${escapeHTML(l.c)}</div>`",
      dlgOptionHTML: '(o) => `<span class="dlg-py">${escapeHTML(o.p)}</span><span class="dlg-hz">${escapeHTML(o.c)}</span>`',
    },
  },
};
