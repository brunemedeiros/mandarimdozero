// Lote 5b: textos de toast/plural (zh tinha literais e tp) e recapitulação com pinyin (zh mostra o pinyin ao lado do hanzi).
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => a.split(x).join(y), s);
const same = (from, to) => R([[from, to]]);
const RECAP_FR = '<div class="lesson-recap-french">${audioBtnHTML(item.f)}<span>${item.f}</span></div>';
const RECAP_UNI = '<div class="lesson-recap-french">${audioBtnHTML(LANG_HOOKS.recapText(item))}<span>${LANG_HOOKS.recapText(item)}</span>${LANG_HOOKS.recapExtra(item)}</div>';
const RECAP_ZH = '<div class="lesson-recap-french">${audioBtnHTML(item.c)}<span>${item.c}</span><span class="lesson-recap-pinyin">${item.p}</span></div>';
const recap = { unify: same(RECAP_FR, RECAP_UNI), reverse: { fr: same(RECAP_UNI, RECAP_FR), zh: same(RECAP_UNI, RECAP_ZH) } };
module.exports = {
  batch: '5b', file: 'quase-iguais-textos',
  desc: 'quase iguais com texto de toast/plural e recapitulação com pinyin',
  functions: {
    // zh escrevia `+${amount} XP` e `+${speedBonus} pts` direto; as chaves toast.xpGain/toast.pointsGain valem '+{amount} XP' e '+{n} pts' em pt-BR e en (mesmo texto).
    addXP: { from: 'fr', keep: true, semantic: true, unify: (s) => s },
    answerSpeedQuestion: { from: 'fr', keep: true, semantic: true, unify: (s) => s },
    // fr usava t(..., {n}) e zh usa tp(...): para n < 1000 o texto é idêntico (a chave não tem .one/.other); a unificada usa tp.
    onMatchTileClick: { semantic: true, unify: same("t('review.match.attempts', { n: MATCH_STATE.attempts })", "tp('review.match.attempts', MATCH_STATE.attempts)") },
    renderLessonCompleteScreen: recap,
    renderUnitCompleteScreen: recap,
  },
  hooks: {
    fr: { recapText: '(i) => i.f', recapExtra: "() => ''" },
    zh: { recapText: '(i) => i.c', recapExtra: '(i) => `<span class="lesson-recap-pinyin">${i.p}</span>`' },
  },
};
