// Lote 5c: quase iguais em que só muda a chave de texto (fr.* x zh.*), um valor fixo do idioma ou o jeito de montar o conteúdo.
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => a.split(x).join(y), s);
const same = (from, to) => R([[from, to]]);
// t(LANG_HOOKS.uiKey('x.y')) -> t('<idioma>.x.y')
const keyBack = (lang) => (s) => s.replace(/LANG_HOOKS\.uiKey\('([^']+)'\)/g, (m, k) => `'${lang}.${k}'`);
const toKey = (keys) => (s) => keys.reduce((a, k) => a.split(`'fr.${k}'`).join(`LANG_HOOKS.uiKey('${k}')`), s);
const both = (fn) => ({ fr: fn('fr'), zh: fn('zh') });
module.exports = {
  batch: '5c', file: 'quase-iguais-chaves',
  desc: 'quase iguais em que só muda a chave de texto, um valor fixo do idioma ou o conteúdo montado por idioma',
  functions: {
    audioBtnHTML: { unify: R([["t('fr.audio.listenPronunciation')", "t(LANG_HOOKS.uiKey('audio.listenPronunciation'))"]]),
      reverse: { fr: (s) => keyBack('fr')(s), zh: (s) => keyBack('zh')(s).replace(/\btext\b/g, 'hanziText') } },
    wireDontKnowButton: { unify: toKey(['hint.label', 'hint.retry', 'hint.reveal']), reverse: both(keyBack) },
    maybeSendStudyReminder: { unify: R([["'frances_last_study_notif'", 'LANG_HOOKS.studyNotifKey'], ["t('fr.reminder.title')", "t(LANG_HOOKS.uiKey('reminder.title'))"]]),
      reverse: { fr: (s) => keyBack('fr')(s).split('LANG_HOOKS.studyNotifKey').join("'frances_last_study_notif'"), zh: (s) => keyBack('zh')(s).split('LANG_HOOKS.studyNotifKey').join("'mandarim_last_study_notif'") } },
    // fr escrevia "Pares:" e "Tentativas:" direto; as chaves zh.review.match.pairs/attempts valem 'Pares: {done}/{total}' e 'Tentativas: {n}' em pt-BR (en traduz).
    renderMatchGame: { semantic: true, unify: R([
      ['Pares: ${MATCH_STATE.matchedCount}/${MATCH_STATE.pairs.length}', "${t('zh.review.match.pairs', { done: MATCH_STATE.matchedCount, total: MATCH_STATE.pairs.length })}"],
      ['Tentativas: ${MATCH_STATE.attempts}', "${t('zh.review.match.attempts', { n: MATCH_STATE.attempts })}"]]) },
    // zh soma os cartões de hanzi, tem uma variável allCards sem uso e o aviso de gráfico vazio com classe própria.
    renderProgressLineChart: { semantic: true, unify: R([
      ['const learnedDates = wordLevelFirstLearnedDates(STATE.cards);', 'const learnedDates = LANG_HOOKS.chartLearnedDates();'],
      ["wrap.innerHTML = `<div style=\"text-align:center; padding:30px 20px; color:var(--ink-soft);\"><p>${t('zh.progress.chartEmpty')}</p></div>`;", "wrap.innerHTML = LANG_HOOKS.chartEmptyHTML(t('zh.progress.chartEmpty'));"],
      ["t('fr.progress.chartTotalSuffix')", "t(LANG_HOOKS.uiKey('progress.chartTotalSuffix'))"]]) },
    // zh não tem lições de gramática (u.type === 'grammar'), então a guarda do fr nunca dispara lá.
    buildCardsFromUnits: { semantic: true, unify: same("appKey = 'frances'", 'appKey = LANG_HOOKS.appKey') },
    // só a ordem das chaves do objeto muda; os valores são os mesmos (STATE.xp é só leitura).
    freshAcquisitionState: { from: 'fr', keep: true, semantic: true, unify: (s) => s },
    // fr aceita o 4º argumento `rate`; zh nunca o passa, então `if (rate)` fica falso e nada muda.
    playPregeneratedAudio: { from: 'fr', keep: true, semantic: true, unify: (s) => s },
    flyBlockToSlot: { unify: same('clone.textContent = text;', 'LANG_HOOKS.setFlyContent(clone, text);'),
      reverse: { fr: same('LANG_HOOKS.setFlyContent(clone, text);', 'clone.textContent = text;'), zh: (s) => s.replace('LANG_HOOKS.setFlyContent(clone, text);', 'clone.innerHTML = html;').replace(/\btext\b/g, 'html') } },
    // zh não define velocidade no áudio pré-gravado (PREGEN_AUDIO_RATE é só do fr); voz, idioma e velocidade da fala sintética vêm dos ganchos.
    dlgPlayLine: { semantic: true, unify: R([
      ['a.playbackRate = PREGEN_AUDIO_RATE;', 'if (LANG_HOOKS.pregenRate()) a.playbackRate = LANG_HOOKS.pregenRate();'],
      ['loadFrenchVoice();', 'LANG_HOOKS.loadVoice();'],
      ["u.lang = 'fr-FR';", 'u.lang = LANG_HOOKS.ttsLang;'], ['u.rate = 0.9;', 'u.rate = LANG_HOOKS.ttsRate;']]) },
  },
  hooks: {
    fr: { uiKey: "(k) => 'fr.' + k", studyNotifKey: "'frances_last_study_notif'", appKey: "'frances'",
      chartLearnedDates: '() => wordLevelFirstLearnedDates(STATE.cards)',
      chartEmptyHTML: '(msg) => `<div style="text-align:center; padding:30px 20px; color:var(--ink-soft);"><p>${msg}</p></div>`',
      setFlyContent: '(el, v) => { el.textContent = v; }', pregenRate: '() => PREGEN_AUDIO_RATE', ttsLang: "'fr-FR'", ttsRate: '0.9' },
    zh: { uiKey: "(k) => 'zh.' + k", studyNotifKey: "'mandarim_last_study_notif'", appKey: "'mandarim'",
      chartLearnedDates: '() => [...wordLevelFirstLearnedDates(STATE.cards), ...STATE.hanziCards.filter(c => c.firstLearnedDate).map(c => c.firstLearnedDate)]',
      chartEmptyHTML: '(msg) => `<div class="manual-empty" style="padding:30px 20px;"><p>${msg}</p></div>`',
      setFlyContent: '(el, v) => { el.innerHTML = v; }', pregenRate: '() => 0', ttsLang: "'zh-CN'", ttsRate: '0.85' },
  },
};
