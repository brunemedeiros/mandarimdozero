# E4, fase das quase iguais: diferença por função

Gerado por `scripts/e4-diff-near.js`. Ordem: menos linhas diferentes primeiro. `-` = só no francês, `+` = só no mandarim.

| # | Função | Linhas fr/zh | Linhas diferentes |
|---:|---|---:|---:|
| 1 | `onMatchTileClick` | 1/1 | 0 |
| 2 | `renderLessonCompleteScreen` | 1/1 | 0 |
| 3 | `renderUnitCompleteScreen` | 1/1 | 0 |
| 4 | `answerSpeedQuestion` | 1/1 | 0 |
| 5 | `addXP` | 1/1 | 0 |
| 6 | `noteOrConceptReviewHTML` | 13/14 | 3 |
| 7 | `findEnterAdvanceTarget` | 15/12 | 3 |
| 8 | `renderConceptStep` | 40/41 | 3 |
| 9 | `assignTodaysMissions` | 7/7 | 4 |
| 10 | `buildCardsFromUnits` | 12/10 | 4 |
| 11 | `renderMatchGame` | 21/21 | 4 |
| 12 | `flyBlockToSlot` | 24/24 | 4 |
| 13 | `freshAcquisitionState` | 29/29 | 4 |
| 14 | `playPregeneratedAudio` | 30/28 | 4 |
| 15 | `showAnswerPanel` | 40/40 | 4 |
| 16 | `freshDailyBucket` | 10/9 | 5 |
| 17 | `renderDialogueCheckStep` | 16/17 | 5 |
| 18 | `mapUnitDescribe` | 29/28 | 5 |
| 19 | `finishCurrentLesson` | 39/38 | 5 |
| 20 | `audioBtnHTML` | 4/4 | 6 |
| 21 | `maybeSendStudyReminder` | 22/22 | 6 |
| 22 | `wireDontKnowButton` | 37/37 | 6 |
| 23 | `currentStepDefs` | 20/17 | 7 |
| 24 | `dlgPlayLine` | 43/42 | 7 |
| 25 | `renderProgressLineChart` | 44/45 | 7 |
| 26 | `renderExerciseStep` | 52/51 | 7 |
| 27 | `renderMultipleChoiceCard` | 56/57 | 7 |
| 28 | `renderTrueFalseExercise` | 57/58 | 7 |
| 29 | `buildReorderDistractors` | 24/24 | 8 |
| 30 | `serializeState` | 34/30 | 10 |
| 31 | `renderBlockIntroCard` | 38/41 | 11 |
| 32 | `renderSpeedReview` | 115/116 | 11 |
| 33 | `renderStepProgress` | 33/27 | 12 |
| 34 | `buildUnitBlock` | 95/90 | 13 |
| 35 | `renderReviewView` | 108/102 | 14 |
| 36 | `renderMultipleChoiceExercise` | 74/75 | 19 |
| 37 | `renderDialogueStep` | 126/128 | 20 |
| 38 | `renderClozeCard` | 53/58 | 25 |
| 39 | `renderTypeAnswerCard` | 58/61 | 25 |
| 40 | `renderVocabTypeExercise` | 62/64 | 30 |
| 41 | `renderReorderExercise` | 110/109 | 31 |
| 42 | `renderDialogueCheck` | 95/97 | 34 |
| 43 | `renderClozeExercise` | 105/117 | 42 |

## `onMatchTileClick` (0 linhas diferentes)

```diff
```

## `renderLessonCompleteScreen` (0 linhas diferentes)

```diff
```

## `renderUnitCompleteScreen` (0 linhas diferentes)

```diff
```

## `answerSpeedQuestion` (0 linhas diferentes)

```diff
```

## `addXP` (0 linhas diferentes)

```diff
```

## `noteOrConceptReviewHTML` (3 linhas diferentes)

```diff
...
- function noteOrConceptReviewHTML(u, vocabIdx, requireVocabMatch) {
+ function noteOrConceptReviewHTML(vocabIdx, requireVocabMatch) {
+     const u = UNITS.find(x => x.id === STATE.currentUnitId);
      if (!u.concepts || !u.concepts.length)
```

## `findEnterAdvanceTarget` (3 linhas diferentes)

```diff
...
          return correctContinueBtn;
-     const queueContinueBtn = document.getElementById('queue-continue-btn');
-     if (queueContinueBtn)
-         return queueContinueBtn;
      const stepNextBtn = document.getElementById('step-next-btn');
```

## `renderConceptStep` (3 linhas diferentes)

```diff
...
          <div class="gram-block-example">
-           <div class="french">${ex.f} ${audioBtnHTML(ex.f)}</div>
+           <div class="hanzi">${ex.c} ${audioBtnHTML(ex.c)}</div>
+           <div class="pinyin">${ex.p}</div>
            <div class="trans">${ex.t}</div>
```

## `assignTodaysMissions` (4 linhas diferentes)

```diff
...
      const easy = pickDailyFromPool(EASY_CHALLENGES, 'easy');
-     const pickedRevisao = pickDailyFromPool(REVISAO_CONJ_CHALLENGES, 'revcon');
-     const revisao = resolveRevisaoMission(pickedRevisao, REVISAO_CONJ_CHALLENGES, 'conj1');
+     const pickedRevisao = pickDailyFromPool(REVISAO_HANZI_CHALLENGES, 'revcon');
+     const revisao = resolveRevisaoMission(pickedRevisao, REVISAO_HANZI_CHALLENGES, 'hanzi1');
      const general = pickDailyFromPool(GENERAL_CHALLENGES, 'general');
```

## `buildCardsFromUnits` (4 linhas diferentes)

```diff
...
- function buildCardsFromUnits(units, appKey = 'frances') {
+ function buildCardsFromUnits(units, appKey = 'mandarim') {
      const cards = [];
      units.forEach(u => {
-         if (u.type === 'grammar')
-             return;
          u.vocab.forEach((v, idx) => {
```

## `renderMatchGame` (4 linhas diferentes)

```diff
...
      <div class="match-header">
-       <span class="match-pairs">Pares: ${MATCH_STATE.matchedCount}/${MATCH_STATE.pairs.length}</span>
-       <span class="match-attempts">Tentativas: ${MATCH_STATE.attempts}</span>
+       <span class="match-pairs">${t('zh.review.match.pairs', { done: MATCH_STATE.matchedCount, total: MATCH_STATE.pairs.length })}</span>
+       <span class="match-attempts">${t('zh.review.match.attempts', { n: MATCH_STATE.attempts })}</span>
      </div>
```

## `flyBlockToSlot` (4 linhas diferentes)

```diff
...
- function flyBlockToSlot(sourceRect, text, targetSlotEl) {
+ function flyBlockToSlot(sourceRect, html, targetSlotEl) {
      if (!targetSlotEl || prefersReducedMotion())
...
      clone.className = 'reorder-fly-clone';
-     clone.textContent = text;
+     clone.innerHTML = html;
      clone.style.left = `${sourceRect.left}px`;
```

## `freshAcquisitionState` (4 linhas diferentes)

```diff
...
          introIdx: 0,
+         xpAtLessonStart: STATE.xp,
          wordMisses: {},
-         introduced: {},
-         xpAtLessonStart: STATE.xp
+         introduced: {}
      };
```

## `playPregeneratedAudio` (4 linhas diferentes)

```diff
...
- function playPregeneratedAudio(file, btnEl, isAutoplay, rate) {
+ function playPregeneratedAudio(file, btnEl, isAutoplay) {
      stopExerciseAudio();
      const audio = new Audio('audio/' + file);
-     if (rate)
-         audio.playbackRate = rate;
      exerciseAudioEl = audio;
```

## `showAnswerPanel` (4 linhas diferentes)

```diff
...
      <div class="feedback-card-body">
-       <div class="wrong-feedback-header">${revealed ? t('feedback.header.revealed') : t('feedback.header.notThisTime')}</div>
+       <div class="wrong-feedback-header">${revealed ? t('feedback.header.revealed') : (opts.toneOnly ? (opts.toneOnly === 'wrong' ? t('feedback.tone.wrong') : t('feedback.tone.missing')) : t('feedback.header.notThisTime'))}</div>
        ${opts.attemptHTML ? `
...
          <div class="wrong-feedback-why">
-           <div class="wrong-feedback-why-label">${ex && ex.format === 'cloze' ? t('feedback.label.fullSentence') : (revealed ? t('feedback.label.answer') : t('feedback.label.whyNot'))}</div>
+           <div class="wrong-feedback-why-label">${ex && (ex.format === 'cloze' || ex.format === 'fullsentence') ? (ex.format === 'cloze' ? t('feedback.label.fullSentence') : t('feedback.label.correctAnswer')) : (revealed ? t('feedback.label.answer') : t('feedback.label.whyNot'))}</div>
            <div class="feedback-inner-box">${explanation}</div>
```

## `freshDailyBucket` (5 linhas diferentes)

```diff
...
      return {
-         date: today, xp: 0, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
-         grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0,
-         conjugationTenses: [], reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0,
+         date: today, xp: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
+         hanziLessons: 0, reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0,
          lessonsForGoal: 0, goalCountedLessonKeys: [], exerciseFormatsSeen: [],
```

## `renderDialogueCheckStep` (5 linhas diferentes)

```diff
...
      stopExerciseAudio();
-     const sp = dlg.speakers || { A: { n: 'A', e: '' }, B: { n: 'B', e: '' } };
+     const sp = dlg.speakers || {};
+     const who = k => sp[k] || { n: k, e: '' };
      const checks = Array.isArray(dlg.check) ? dlg.check : [];
...
      nextBtn.style.display = 'none';
-     renderDialogueCheck(u, dlg, sp, checks, nextBtn, []);
+     renderDialogueCheck(u, dlg, who, checks, nextBtn, []);
  }
```

## `mapUnitDescribe` (5 linhas diferentes)

```diff
...
          lines.push('Complete a unidade anterior para liberar esta.');
-         const modOpen = moduleId && moduleUnlocked(MODULES.find(m => m.id === moduleId));
-         if (modOpen && trailSkipAllowed())
+         if (moduleId && trailSkipAllowed())
              actions.push({ label: 'Fazer Ponto de verificação para pular', primary: false, onClick: () => openCheckpoint(moduleId) });
-         else if (modOpen)
+         else if (moduleId)
              lines.push('Pular unidades é do plano Premium (ou de alunos da professora).');
```

## `finishCurrentLesson` (5 linhas diferentes)

```diff
...
      }
-     const total = u.type === 'grammar' ? u.grammar.exercises.length : STEP_STATE.exerciseList.length;
-     const correct = u.type === 'grammar' ? STEP_STATE.gramExerciseScore : STEP_STATE.exerciseScore;
-     const scorePct = total ? Math.round((correct / total) * 100) : 100;
+     const total = STEP_STATE.exerciseList.length;
+     const scorePct = total ? Math.round((STEP_STATE.exerciseScore / total) * 100) : 100;
      const xpBeforeUnitBonus = STATE.xp;
```

## `audioBtnHTML` (6 linhas diferentes)

```diff
...
- function audioBtnHTML(text, extraClass) {
-     const safe = text.replace(/"/g, '&quot;');
-     return `<button class="audio-btn ${extraClass || ''}" data-speak="${safe}" aria-label="${t('fr.audio.listenPronunciation')}" title="${t('fr.audio.listenPronunciation')}">🔊</button>`;
+ function audioBtnHTML(hanziText, extraClass) {
+     const safe = hanziText.replace(/"/g, '&quot;');
+     return `<button class="audio-btn ${extraClass || ''}" data-speak="${safe}" aria-label="${t('zh.audio.listenPronunciation')}" title="${t('zh.audio.listenPronunciation')}">🔊</button>`;
  }
```

## `maybeSendStudyReminder` (6 linhas diferentes)

```diff
...
          return;
-     if (localStorageSafeGet('frances_last_study_notif') === todayStr())
+     if (localStorageSafeGet('mandarim_last_study_notif') === todayStr())
          return;
-     new Notification(t('fr.reminder.title'), {
+     new Notification(t('zh.reminder.title'), {
          body: tp('zh.reminder.body', goal.dailyLessonsGoal),
...
      });
-     localStorageSafeSet('frances_last_study_notif', todayStr());
+     localStorageSafeSet('mandarim_last_study_notif', todayStr());
  }
```

## `wireDontKnowButton` (6 linhas diferentes)

```diff
...
          ${hintText ? `
-           <div class="inline-hint-label">${t('fr.hint.label')}</div>
+           <div class="inline-hint-label">${t('zh.hint.label')}</div>
            <p class="inline-hint-text">${hintText}</p>
...
          <div class="inline-hint-actions">
-           <button class="btn btn-secondary inline-hint-retry-btn" id="inline-hint-retry-btn">${t('fr.hint.retry')}</button>
-           <button class="btn btn-secondary exercise-reveal-btn" id="exercise-reveal-btn">${t('fr.hint.reveal')}</button>
+           <button class="btn btn-secondary inline-hint-retry-btn" id="inline-hint-retry-btn">${t('zh.hint.retry')}</button>
+           <button class="btn btn-secondary exercise-reveal-btn" id="exercise-reveal-btn">${t('zh.hint.reveal')}</button>
          </div>
```

## `currentStepDefs` (7 linhas diferentes)

```diff
...
- function currentStepDefs() {
-     const u = UNITS.find(x => x.id === STATE.currentUnitId);
-     if (u && u.type === 'grammar')
-         return getStepDefsGrammar();
+ function currentStepDefs(u) {
      if (isLessonUnit(u)) {
...
      }
-     return getStepDefs().filter(s => (s.key !== 'usage' || (u && u.usageNote)) && (s.key !== 'dialogueCheck' || (u && u.dialogue && Array.isArray(u.dialogue.check) && u.dialogue.check.length)));
+     return STEP_DEFS.filter(s => (s.key !== 'usage' || (u && u.usageNote)) && (s.key !== 'dialogueCheck' || (u && u.dialogue && Array.isArray(u.dialogue.check) && u.dialogue.check.length)));
  }
```

## `dlgPlayLine` (7 linhas diferentes)

```diff
...
              const a = new Audio('audio/' + file);
-             a.playbackRate = PREGEN_AUDIO_RATE;
              exerciseAudioEl = a;
...
          if (!TTS.voice)
-             loadFrenchVoice();
+             loadChineseVoice();
          if (!TTS.voice)
...
          const u = new SpeechSynthesisUtterance(text);
-         u.lang = 'fr-FR';
+         u.lang = 'zh-CN';
          u.voice = TTS.voice;
-         u.rate = 0.9;
+         u.rate = 0.85;
          let started = false, done = false;
```

## `renderProgressLineChart` (7 linhas diferentes)

```diff
...
          return;
-     const learnedDates = wordLevelFirstLearnedDates(STATE.cards);
+     const allCards = [...STATE.cards, ...STATE.hanziCards];
+     const learnedDates = [...wordLevelFirstLearnedDates(STATE.cards), ...STATE.hanziCards.filter(c => c.firstLearnedDate).map(c => c.firstLearnedDate)];
      if (!learnedDates.length) {
-         wrap.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--ink-soft);"><p>${t('zh.progress.chartEmpty')}</p></div>`;
+         wrap.innerHTML = `<div class="manual-empty" style="padding:30px 20px;"><p>${t('zh.progress.chartEmpty')}</p></div>`;
          return;
...
      </svg>
-     <div class="chart-total">${t('zh.progress.chartTotal')} <strong>${maxVal}</strong> ${t('fr.progress.chartTotalSuffix')}</div>
+     <div class="chart-total">${t('zh.progress.chartTotal')} <strong>${maxVal}</strong> ${t('zh.progress.chartTotalSuffix')}</div>
    `;
```

## `renderExerciseStep` (7 linhas diferentes)

```diff
...
      if (STEP_STATE.exerciseIndex >= total) {
-         const exhaustedKey = currentStepDefs()[STEP_STATE.currentStep].key;
+         const exhaustedKey = currentStepDefs(u)[STEP_STATE.currentStep].key;
          if (exhaustedKey === 'vocab') {
...
      STEP_STATE.exerciseAnswered = false;
-     nextBtn.style.display = 'none';
      if (ex.format === 'reorder') {
...
      }
-     else if (ex.format === 'scenario') {
-         renderScenarioExercise(ex, contentEl, nextBtn, total);
+     else if (ex.format === 'fullsentence') {
+         renderFullSentenceExercise(ex, contentEl, nextBtn, total);
      }
```

## `renderMultipleChoiceCard` (7 linhas diferentes)

```diff
...
        ${promptImageUrl ? `<img src="${promptImageUrl}" class="flashcard-image" alt="">` : ''}
-       <div class="flashcard-french">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${customAudioUrl ? customAudioBtnHTML(customAudioUrl) : ''}</div>
+       <div class="flashcard-hanzi">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${customAudioUrl ? customAudioBtnHTML(customAudioUrl) : ''}</div>
+       <div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || '')}</div>
      </div>
...
      wireCustomAudioButtons(mountEl);
-     if (!card.__isPreviewCard && promptSpeakable && canSpeakFrench(view.prompt.text))
-         speakFrench(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);
+     if (!card.__isPreviewCard && promptSpeakable && canSpeakChinese(view.prompt.text))
+         speakChinese(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);
      if (!answered) {
```

## `renderTrueFalseExercise` (7 linhas diferentes)

```diff
...
      <div class="exercise-wrap">
-       <div class="exercise-counter">${t('fr.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
+       <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
        <div class="tf-scene">
...
          <div class="tf-subject">${ex.subject}</div>
+         <div class="tf-pinyin">${ex.pinyin || ''}</div>
          ${audioBtnHTML(ex.subject)}
...
        <div class="tf-options">
-         <button class="tf-option" data-val="true">${t('fr.exercise.true')}</button>
-         <button class="tf-option" data-val="false">${t('fr.exercise.false')}</button>
+         <button class="tf-option" data-val="true">${t('zh.exercise.true')}</button>
+         <button class="tf-option" data-val="false">${t('zh.exercise.false')}</button>
        </div>
```

## `buildReorderDistractors` (8 linhas diferentes)

```diff
...
          return [];
-     const correctTexts = new Set(correctBlocks.map(b => b.f));
+     const correctTexts = new Set(correctBlocks.map(b => b.c));
      const dedupeAndExclude = (blocks, excludeTexts) => {
...
          return blocks.filter(b => {
-             if (correctTexts.has(b.f) || seen.has(b.f))
+             if (correctTexts.has(b.c) || seen.has(b.c))
                  return false;
-             seen.add(b.f);
+             seen.add(b.c);
              return true;
...
      if (picked.length < count) {
-         const globalPool = shuffle(dedupeAndExclude(UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || [])), picked.map(b => b.f)));
+         const globalPool = shuffle(dedupeAndExclude(UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || [])), picked.map(b => b.c)));
          picked.push(...globalPool.slice(0, count - picked.length));
```

## `serializeState` (10 linhas diferentes)

```diff
...
          cards: serializeCardsForSave(STATE.cards),
+         hanziCards: STATE.hanziCards,
          cardVariants: STATE.cardVariants,
...
          dailyLessonsLog: STATE.dailyLessonsLog,
+         hanziLessonProgress: STATE.hanziLessonProgress,
          totalReviews: STATE.totalReviews,
...
          modesUsed: STATE.modesUsed,
-         dictationsAced: STATE.dictationsAced,
          periodXp: STATE.periodXp,
          daily: STATE.daily,
-         checkpointProgress: STATE.checkpointProgress,
-         reviewMilestones: STATE.reviewMilestones,
-         levelTestProgress: STATE.levelTestProgress,
-         completedChallenges: STATE.completedChallenges,
-         dictations: STATE.dictations,
-         challengeReviews: STATE.challengeReviews,
+         storyProgress: STATE.storyProgress,
          progressSummary: computeProgressSummary()
```

## `renderBlockIntroCard` (11 linhas diferentes)

```diff
...
        <div class="vocab-phrase-label">${t('fr.blockIntro.inPhrase')}</div>
-       <div class="vocab-phrase-french">${matchingPhrase.f} ${audioBtnHTML(matchingPhrase.f)}</div>
+       <div class="vocab-phrase-pinyin">${matchingPhrase.p}</div>
+       <div class="vocab-phrase-hanzi">${matchingPhrase.c} ${audioBtnHTML(matchingPhrase.c)}</div>
        <div class="vocab-phrase-trans">${matchingPhrase.t}</div>
...
      <div class="vocab-card">
-       <div class="vocab-card-word">${v.f} ${audioBtnHTML(v.f)}</div>
+       <div class="vocab-card-pinyin">${v.p}</div>
+       <div class="vocab-card-hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>
        <div class="vocab-card-trans">${v.t}</div>
...
      wireAudioButtons(contentEl);
+     wireStrokeButtons(contentEl);
      wireKnowButtons(contentEl);
-     if (canSpeakFrench(v.f)) {
+     if (canSpeakChinese(v.c)) {
          const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
-         speakFrench(v.f, mainAudioBtn, true);
+         speakChinese(v.c, mainAudioBtn, true);
      }
```

## `renderSpeedReview` (11 linhas diferentes)

```diff
...
        <div class="review-empty">
-         <div class="big-emoji">☕</div>
+         <div class="big-emoji">🍵</div>
          <h3>${t('review.empty.upToDateTitle')}</h3>
...
          <h3>${t('review.speed.gameOver')}</h3>
-         <div class="score-num">${t('review.speed.points', { n: SPEED_STATE.score })}</div>
-         <p>${t('review.speed.answered', { n: SPEED_STATE.index })}</p>
+         <div class="score-num">${SPEED_STATE.score} pts</div>
+         <p>${tp('review.speed.answered', SPEED_STATE.index)}</p>
          <p class="review-record-line">${speedIsRecord ? `${t('review.records.newRecord')} ${speedRecordText(reviewRecords())}` : t('review.records.yourRecord', { record: speedRecordText(reviewRecords()) })}</p>
...
          <h3>${t('review.complete.title')}</h3>
-         <div class="score-num">${t('review.speed.points', { n: SPEED_STATE.score })}</div>
+         <div class="score-num">${SPEED_STATE.score} pts</div>
          <p class="review-record-line">${speedIsRecord2 || speedStreakRecord2 ? `${t('review.records.newRecord')} ${speedRecordText(reviewRecords())}` : t('review.records.yourRecord', { record: speedRecordText(reviewRecords()) })}</p>
...
      <div class="speed-prompt">
-       <div class="french">${cardPromptText(card)}</div>
+       <div class="hanzi">${cardPromptText(card)}</div>
+       <div class="pinyin">${cardPromptPinyinText(card)}</div>
      </div>
```

## `renderStepProgress` (12 linhas diferentes)

```diff
...
      const fillEl = document.getElementById('step-progress-fill');
-     const defs = currentStepDefs();
-     const stepCount = defs.length;
-     const stepKey = defs[STEP_STATE.currentStep].key;
      const u = UNITS.find(x => x.id === STATE.currentUnitId);
+     const stepDefs = currentStepDefs(u);
+     const stepCount = stepDefs.length;
+     const stepKey = stepDefs[STEP_STATE.currentStep].key;
      let intraStepFraction = 0;
...
      }
-     else if (stepKey === 'explanation' && u && u.grammar) {
-         intraStepFraction = u.grammar.blocks.length ? STEP_STATE.explanationIndex / u.grammar.blocks.length : 0;
-     }
-     else if (stepKey === 'gramExercises' && u && u.grammar) {
-         intraStepFraction = u.grammar.exercises.length ? STEP_STATE.gramExerciseIndex / u.grammar.exercises.length : 0;
-     }
      const pct = ((STEP_STATE.currentStep + intraStepFraction) / stepCount) * 100;
```

## `buildUnitBlock` (13 linhas diferentes)

```diff
...
      const isFinished = state === 'done' || state === 'skipped';
-     const isGrammar = unitTypeOf(u) === 'grammar';
      const hasLessons = isLessonUnit(u) && u.lessons.length > 1;
...
      let fracLabel;
-     if (isGrammar)
-         fracLabel = state === 'done' ? t('trail.unit.done') : (state === 'skipped' ? t('trail.unit.skipped') : '');
-     else if (hasLessons) {
+     if (hasLessons) {
          const doneLessons = isFinished ? u.lessons.length : currentLessonIdx(u.id);
...
      block.className = 'unit-block'
-         + (isGrammar ? ' grammar' : '')
          + (state === 'locked' ? ' locked' : '')
...
      const badgeHTML = state === 'done' ? `<span class="ub-badge">✓</span>`
-         : state === 'skipped' ? `<span class="ub-badge ub-badge-skipped" title="${t('trail.unit.skippedTitle')}">${t('trail.unit.skippedBadge')}</span>` : '';
-     const typeChipHTML = isGrammar ? `<span class="ub-type-chip grammar">${t('trail.unit.grammarChip')}</span>` : '';
-     const chevronHTML = hasLessons ? `<button class="ub-chevron" type="button" aria-label="${t('fr.trail.expandLessons')}">▾</button>` : '';
+         : state === 'skipped' ? `<span class="ub-badge ub-badge-skipped" title="${t('trail.unit.skippedTitle')}">⏭ 跳过</span>` : '';
+     const chevronHTML = hasLessons ? `<button class="ub-chevron" type="button" aria-label="${t('zh.path.unit.expandLessons')}">▾</button>` : '';
      const lessonsHTML = hasLessons ? `
...
        <div class="ub-info">
-         <div class="ub-title-row"><span class="ub-title">${u.title}</span>${typeChipHTML}${badgeHTML}</div>
+         <div class="ub-title-row"><span class="ub-title">${u.title}</span>${badgeHTML}</div>
          ${u.goal ? `<div class="ub-goal">${u.goal}</div>` : ''}
```

## `renderReviewView` (14 linhas diferentes)

```diff
...
        <div class="review-empty">
-         <div class="big-emoji">☕</div>
+         <div class="big-emoji">🍵</div>
          <h3>${STATE.reviewSessionClassReview ? t('review.session.classEmptyTitle') : activeReviewTagFilter().length ? t('review.session.tagsEmptyTitle') : STATE.reviewSessionDeckId ? t('review.session.deckEmptyTitle') : (STATE.reviewSessionUnitFilter ? t('review.session.unitEmptyTitle') : t('review.session.allDoneTitle'))}</h3>
-         <p>${allDue > 0 ? t('review.session.pendingOverall', { n: allDue }) : t('review.session.comeBackLater')}</p>
+         <p>${allDue > 0 ? tp('review.session.pendingOverall', allDue) : t('review.session.comeBackLater')}</p>
          ${allDue > 0 ? `<button class="btn btn-primary" id="review-start-all">${t('review.session.reviewAllAvailable')}</button>` : ''}
...
                  STATE.reviewSessionDeckId = null;
-                 STATE.reviewSessionMilestone = null;
                  startReviewSession();
...
          maybeShowStreakCelebration();
-         const msMeta = STATE.reviewSessionMilestone;
-         if (msMeta)
-             recordModuleReviewDone(msMeta.moduleId, STATE.reviewQueue.length);
-         trackEvent('lesson_complete', 'flashcard_review', Object.assign({ count: STATE.reviewQueue.length }, msMeta ? { moduleId: msMeta.moduleId, unitIds: msMeta.unitIds } : {}, STATE.reviewSessionUnitFilter ? { unitId: STATE.reviewSessionUnitFilter } : {}));
+         trackEvent('lesson_complete', 'flashcard_review', { count: STATE.reviewQueue.length });
          el.innerHTML = `
...
          <h3>${t('review.complete.title')}</h3>
-         <p>${t('review.complete.reviewed', { n: STATE.reviewQueue.length })}</p>
+         <p>${tp('review.complete.reviewed', STATE.reviewQueue.length)}</p>
          <div class="review-complete-actions">
...
              STATE.reviewSessionDeckId = null;
-             STATE.reviewSessionMilestone = null;
              switchTab('path');
...
              STATE.reviewSessionDeckId = null;
-             STATE.reviewSessionMilestone = null;
              backToReviewModeSelect();
```

## `renderMultipleChoiceExercise` (19 linhas diferentes)

```diff
...
          promptHTML = `
-       <div class="exercise-prompt-label">${t('fr.exercise.whatMeans')}</div>
+       <div class="exercise-prompt-label">${t('zh.exercise.whatMeans')}</div>
        <div class="exercise-prompt">
-         <div class="prompt-french">${ex.item.f}</div>
-         ${audioBtnHTML(ex.item.f)}
+         <div class="prompt-hanzi">${ex.item.c}</div>
+         <div class="prompt-pinyin">${ex.item.p}</div>
+         ${audioBtnHTML(ex.item.c)}
        </div>
...
          promptHTML = `
-       <div class="exercise-prompt-label">${t('fr.exercise.listenChooseMeaning')}</div>
+       <div class="exercise-prompt-label">${t('zh.exercise.listenChoose')}</div>
        <div class="exercise-prompt">
-         ${audioBtnHTML(ex.item.f, 'audio-btn-lg')}
-         <div class="prompt-audio-hint">${t('fr.exercise.tapToHearAgain')}</div>
+         ${audioBtnHTML(ex.item.c, 'audio-btn-lg')}
+         <div class="prompt-audio-hint">${t('zh.exercise.tapToListenAgain')}</div>
        </div>
...
      <div class="exercise-wrap">
-       <div class="exercise-counter">${t('fr.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
+       <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
        ${promptHTML}
...
      wireAudioButtons(contentEl);
-     if ((ex.format === 'listen' || ex.format === 'meaning') && canSpeakFrench(ex.item.f)) {
+     if ((ex.format === 'listen' || ex.format === 'meaning') && canSpeakChinese(ex.item.c)) {
          const audioEl = contentEl.querySelector(ex.format === 'listen' ? '.audio-btn-lg' : '.audio-btn');
-         speakFrench(ex.item.f, audioEl, true);
+         speakChinese(ex.item.c, audioEl, true);
      }
```

## `renderDialogueStep` (20 linhas diferentes)

```diff
...
      const token = ++DLG.run;
-     const sp = dlg.speakers || { A: { n: 'A', e: '' }, B: { n: 'B', e: '' } };
+     const sp = dlg.speakers || {};
+     const who = k => sp[k] || { n: k, e: '' };
      const terms = dlgVocabTerms(u);
...
      const rowsHTML = dlg.lines.map((l, i) => {
-         const side = l.spk === 'B' ? 'b' : 'a';
-         const who = sp[l.spk] || { n: l.spk, e: '' };
+         const side = dlgSpeakerSide(dlg, l.spk);
+         const w = who(l.spk);
          return `
-       <div class="dlg-row ${side}" data-i="${i}" role="button" tabindex="0" aria-label="${escapeHTML(who.n)}: ouvir a partir desta fala">
-         <div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${who.e || escapeHTML(l.spk)}</span><span class="dlg-name">${escapeHTML(who.n)}</span></div>
+       <div class="dlg-row ${side}" data-i="${i}" role="button" tabindex="0" aria-label="${escapeHTML(w.n)}: ouvir a partir desta fala">
+         <div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span></div>
          <div class="dlg-bubble">
-           <div class="dlg-fr">${dlgHighlight(l.f, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>
+           <div class="dlg-py">${dlgHighlightPinyin(l.c, l.p, terms)}</div>
+           <div class="dlg-hz">${dlgHighlight(l.c, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>
            <div class="dlg-tr">${escapeHTML(l.t)}</div>
...
              rows[i].scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
-             const res = await dlgPlayLine(dlg.lines[i].f);
+             const res = await dlgPlayLine(dlg.lines[i].c);
              if (!alive())
...
          if (w.dataset.tr)
-             showToast(`“${w.dataset.w}” = ${w.dataset.tr}`);
+             showToast(`${w.dataset.w}${w.dataset.py ? ' (' + w.dataset.py + ')' : ''} = ${w.dataset.tr}`);
      }));
...
      nextBtn.style.display = 'flex';
-     const canHear = dlg.lines.some(l => canSpeakFrench(l.f));
+     const canHear = dlg.lines.some(l => canSpeakChinese(l.c));
      if (!canHear)
```

## `renderClozeCard` (25 linhas diferentes)

```diff
...
        ${clozeImageUrl ? `<img src="${clozeImageUrl}" class="flashcard-image" alt="">` : ''}
-       <div class="cloze-sentence">${sentenceHTML}</div>
+       <div class="cloze-sentence">
+         <div class="cloze-hanzi">${sentenceHTML}</div>
+         ${answered ? `<div class="cloze-pinyin pinyin">${escapeHTML(view.compareAnswerText)}</div>` : ''}
+       </div>
        ${view.audioUrl ? customAudioBtnHTML(view.audioUrl) : ''}
-       ${answered ? `<div class="cloze-trans">${view.translation.text}</div>` : ''}
+       ${answered ? `<div class="cloze-trans">${escapeHTML(view.translation.text)}</div>` : ''}
      </div>
...
        <div class="cloze-type-wrap">
-         <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('review.cloze.placeholder')}">
-         ${frAccentPickerHTML()}
+         <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.review.cloze.placeholder')}">
+         ${pinyinTonePickerHTML()}
          <button class="btn btn-primary btn-block" id="cloze-review-verify-btn">${t('common.verify')}</button>
        </div>
-     ` : `${reviewAlmostHTML(localState)}${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${t('common.continue')}</button>`}
+     ` : `${toneHintHTML(localState)}${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${t('common.continue')}</button>`}
    `;
...
          inputEl.focus();
-         wireFrAccentPicker(mountEl.querySelector('.fr-accent-picker'), inputEl);
+         wirePinyinTonePicker(mountEl.querySelector('.pinyin-tone-picker'), inputEl);
+         const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
          function verify() {
...
              mountEl.querySelector('#cloze-review-verify-btn').disabled = true;
+             const typed = strip(inputEl.value);
              localState.typedAnswer = inputEl.value;
              localState.answered = true;
-             const verdict = typedAnswerVerdict(inputEl.value, acceptedForms(view.compareAnswerText));
-             localState.wasCorrect = verdict !== 'errou';
-             localState.almost = verdict === 'quase';
+             const forms = acceptedForms(view.compareAnswerText);
+             localState.wasCorrect = forms.some(form => strip(form) === typed);
+             localState.toneOnly = localState.wasCorrect ? false : isToneOnlyMiss(typed, forms, strip);
              renderClozeCard(mountEl, card, localState, callbacks);
...
          mountEl.querySelector('#cloze-continue-btn').addEventListener('click', () => {
-             callbacks.onAnswered(localState.wasCorrect, typedAnswerGrade(localState.almost ? 'quase' : localState.wasCorrect ? 'ok' : 'errou'));
+             callbacks.onAnswered(localState.wasCorrect, localState.wasCorrect ? 2 : 0);
          });
```

## `renderTypeAnswerCard` (25 linhas diferentes)

```diff
...
        ${promptImageUrl ? `<img src="${promptImageUrl}" class="flashcard-image" alt="">` : ''}
-       <div class="flashcard-french">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${view.prompt.audioUrl ? customAudioBtnHTML(view.prompt.audioUrl) : ''}</div>
+       <div class="flashcard-hanzi">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${view.prompt.audioUrl ? customAudioBtnHTML(view.prompt.audioUrl) : ''}</div>
+       <div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || '')}</div>
        ${answered ? `
...
        <div class="cloze-type-wrap">
-         <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('review.typeAnswer.placeholder')}">
-         ${frAccentPickerHTML()}
+         <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.review.typeAnswer.placeholder')}">
+         ${pinyinTonePickerHTML()}
          <button class="btn btn-primary btn-block" id="cloze-review-verify-btn">${t('common.verify')}</button>
        </div>
-     ` : `${reviewAlmostHTML(localState)}${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${t('common.continue')}</button>`}
+     ` : `${toneHintHTML(localState)}${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${t('common.continue')}</button>`}
    `;
...
      wireCustomAudioButtons(mountEl);
-     if (!card.__isPreviewCard && promptSpeakable && canSpeakFrench(view.prompt.text))
-         speakFrench(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);
+     if (!card.__isPreviewCard && promptSpeakable && canSpeakChinese(view.prompt.text))
+         speakChinese(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);
      if (!answered) {
...
          inputEl.focus();
-         wireFrAccentPicker(mountEl.querySelector('.fr-accent-picker'), inputEl);
+         wirePinyinTonePicker(mountEl.querySelector('.pinyin-tone-picker'), inputEl);
+         const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
          function verify() {
...
              mountEl.querySelector('#cloze-review-verify-btn').disabled = true;
+             const typed = strip(inputEl.value);
              localState.typedAnswer = inputEl.value;
              localState.answered = true;
-             const verdict = typedAnswerVerdict(inputEl.value, acceptedForms(view.compareAnswerText));
-             localState.wasCorrect = verdict !== 'errou';
-             localState.almost = verdict === 'quase';
+             const forms = acceptedForms(view.compareAnswerText);
+             localState.wasCorrect = forms.some(form => strip(form) === typed);
+             localState.toneOnly = localState.wasCorrect ? false : isToneOnlyMiss(typed, forms, strip);
              renderTypeAnswerCard(mountEl, card, localState, callbacks);
...
          mountEl.querySelector('#cloze-continue-btn').addEventListener('click', () => {
-             callbacks.onAnswered(localState.wasCorrect, typedAnswerGrade(localState.almost ? 'quase' : localState.wasCorrect ? 'ok' : 'errou'));
+             callbacks.onAnswered(localState.wasCorrect, localState.wasCorrect ? 2 : 0);
          });
```

## `renderVocabTypeExercise` (30 linhas diferentes)

```diff
...
      <div class="exercise-wrap">
-       <div class="exercise-counter">${t('fr.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
-       <div class="exercise-prompt-label">${t('fr.exercise.typeWhatYouHeard')}</div>
+       <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
+       <div class="exercise-prompt-label">${t('zh.exercise.typePinyinHeard')}</div>
        <div class="exercise-prompt">
-         ${audioBtnHTML(ex.item.f, 'audio-btn-lg')}
-         <div class="prompt-audio-hint">${t('fr.exercise.tapToHearAgain')}</div>
+         ${audioBtnHTML(ex.item.c, 'audio-btn-lg')}
+         <div class="prompt-audio-hint">${t('zh.exercise.tapToListenAgain')}</div>
        </div>
        <div class="cloze-type-wrap">
-         <input type="text" id="vocab-type-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('fr.exercise.typeInFrench')}">
-         ${frAccentPickerHTML()}
+         <input type="text" id="vocab-type-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.exercise.typePinyinPlaceholder')}">
+         ${pinyinTonePickerHTML()}
          <button class="btn btn-primary btn-block" id="vocab-type-verify-btn">${t('common.verify')}</button>
...
      wireAudioButtons(contentEl);
-     if (canSpeakFrench(ex.item.f))
-         speakFrench(ex.item.f, contentEl.querySelector('.audio-btn-lg'), true);
+     if (canSpeakChinese(ex.item.c))
+         speakChinese(ex.item.c, contentEl.querySelector('.audio-btn-lg'), true);
      nextBtn.style.display = 'none';
...
      inputEl.focus();
-     wireFrAccentPicker(contentEl.querySelector('.fr-accent-picker'), inputEl);
-     const strip = s => normalizeLoose(s).replace(/[.,!?;:'"’]/g, '').trim();
+     wirePinyinTonePicker(contentEl.querySelector('.pinyin-tone-picker'), inputEl);
+     const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
      function lockInputs() {
...
      }
-     function finish(isCorrect) {
+     function finish(isCorrect, toneOnly) {
          STEP_STATE.exerciseAnswered = true;
...
              addStudyMinutes();
-             setTimeout(() => showCorrectFeedbackPanel(contentEl, `<strong>${ex.item.f}</strong> ${audioBtnHTML(ex.item.f)}`), 500);
+             setTimeout(() => showCorrectFeedbackPanel(contentEl, `<strong>${ex.item.c}</strong> ${audioBtnHTML(ex.item.c)}`), 500);
          }
          else {
-             showWrongAnswerPanel(contentEl, ex);
+             showWrongAnswerPanel(contentEl, ex, { toneOnly });
          }
...
          const typed = strip(inputEl.value);
-         finish(acceptedForms(ex.item.f).some(form => strip(form) === typed));
+         const forms = acceptedForms(ex.item.p);
+         const ok = forms.some(form => strip(form) === typed);
+         finish(ok, !ok && isToneOnlyMiss(typed, forms, strip));
      });
```

## `renderReorderExercise` (31 linhas diferentes)

```diff
...
      const isTranslate = ex.mode === 'translate';
+     const phraseZh = phraseForExercise(ex.phrase);
      contentEl.innerHTML = `
      <div class="exercise-wrap">
-       <div class="exercise-counter">${t('fr.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
-       <div class="exercise-prompt-label">${isTranslate ? t('fr.exercise.translateToFrench') : t('fr.exercise.orderSentence')}</div>
+       <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
+       <div class="exercise-prompt-label">${isTranslate ? t('zh.exercise.translateToChinese') : t('zh.exercise.orderSentence')}</div>
        ${isTranslate ? `
...
            <div class="prompt-translation">${ex.phrase.t}</div>
-           ${audioBtnHTML(ex.phrase.f, 'audio-btn-lg')}
+           ${audioBtnHTML(phraseZh.c, 'audio-btn-lg')}
          </div>
-         <div class="reorder-wrap-hint">Toque nas palavras na ordem certa. Toque numa já colocada para devolvê-la.</div>
+         <div class="reorder-wrap-hint">${t('zh.reorder.tapHint')}</div>
        `}
...
              const block = ex.shuffledBlocks[chosenBlockIdx];
-             return `<div class="reorder-slot filled" data-seq-pos="${i}"><div class="french">${block.f}</div></div>`;
+             return `<div class="reorder-slot filled" data-seq-pos="${i}"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`;
          }).join('');
...
              return `<button class="reorder-block ${alreadyChosen ? 'used' : ''}" data-block-idx="${i}" ${alreadyChosen ? 'disabled' : ''}>
-         ${block.f}
+         <div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div>
        </button>`;
...
                  const sourceRect = btn.getBoundingClientRect();
-                 const sourceText = btn.textContent.trim();
+                 const sourceHTML = btn.innerHTML;
                  const blockIdx = parseInt(btn.dataset.blockIdx);
...
                  const targetSlot = slotsEl.querySelector(`.reorder-slot[data-seq-pos="${seqPos}"]`);
-                 flyBlockToSlot(sourceRect, sourceText, targetSlot);
+                 flyBlockToSlot(sourceRect, sourceHTML, targetSlot);
                  if (chosenSequence.length === correctOrder.length) {
...
          playFeedbackSound(isCorrect);
-         slotsEl.querySelectorAll('.reorder-slot').forEach((slot, pos) => {
-             const here = ex.shuffledBlocks[chosenSequence[pos]] === correctOrder[pos];
-             slot.classList.add(isCorrect || here ? 'correct' : 'incorrect');
+         slotsEl.querySelectorAll('.reorder-slot').forEach(slot => {
+             slot.classList.add(isCorrect ? 'correct' : 'incorrect');
          });
...
              addStudyMinutes();
-             const detail = `<div class="reorder-final"><div class="reorder-final-fr">${ex.phrase.f} ${audioBtnHTML(ex.phrase.f)}</div><div class="reorder-final-tr">${ex.phrase.t}</div></div>`;
-             setTimeout(() => showCorrectFeedbackPanel(contentEl, detail), 500);
+             setTimeout(() => showCorrectFeedbackPanel(contentEl, phraseFeedbackDetailHTML(ex.phrase, ex.phrase.t)), 500);
          }
...
                  const cls = block === correctOrder[pos] ? 'ok' : (correctOrder.includes(block) ? 'near' : 'bad');
-                 return `<span class="reorder-attempt-w ${cls}">${block.f}</span>`;
-             }).join(' ')}</div>`;
+                 return `<span class="reorder-attempt-w ${cls}"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></span>`;
+             }).join('')}</div>`;
              setTimeout(() => showWrongAnswerPanel(contentEl, ex, { attemptHTML }), 500);
...
          STEP_STATE.exerciseAnswered = true;
-         slotsEl.innerHTML = correctOrder.map(block => `<div class="reorder-slot filled correct"><div class="french">${block.f}</div></div>`).join('');
+         slotsEl.innerHTML = correctOrder.map(block => `<div class="reorder-slot filled correct"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`).join('');
          blocksEl.querySelectorAll('.reorder-block').forEach(b => b.classList.add('disabled'));
```

## `renderDialogueCheck` (34 linhas diferentes)

```diff
...
- function renderDialogueCheck(u, dlg, sp, checks, nextBtn, rows) {
+ function renderDialogueCheck(u, dlg, who, checks, nextBtn, rows) {
      const box = document.getElementById('dlg-check');
...
      const L = dlg.lines;
-     const bubble = (idx, text, blank) => {
+     const zhOpt = o => `<span class="dlg-py">${escapeHTML(o.p)}</span><span class="dlg-hz">${escapeHTML(o.c)}</span>`;
+     const bubble = (idx, blank) => {
          const l = L[idx];
-         const side = l.spk === 'B' ? 'b' : 'a';
-         const who = sp[l.spk] || { n: l.spk, e: '' };
-         return `<div class="dlg-row ${side} static"><div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${who.e || escapeHTML(l.spk)}</span><span class="dlg-name">${escapeHTML(who.n)}</span></div>
-       <div class="dlg-bubble"><div class="dlg-fr">${blank ? '<span class="dlg-blank">· · · · ·</span>' : escapeHTML(text)}</div></div></div>`;
+         const side = dlgSpeakerSide(dlg, l.spk);
+         const w = who(l.spk);
+         return `<div class="dlg-row ${side} static"><div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span></div>
+       <div class="dlg-bubble">${blank ? '<div class="dlg-hz"><span class="dlg-blank">· · · · ·</span></div>' : `<div class="dlg-py">${escapeHTML(l.p)}</div><div class="dlg-hz">${escapeHTML(l.c)}</div>`}</div></div>`;
      };
...
              label = 'Complete a resposta';
-             ctx = `<div class="dlg-q-ctx">${bubble(q.line - 1, L[q.line - 1].f, false)}${bubble(q.line, '', true)}</div>`;
-             opts = dlgShuffle([{ t: L[q.line].f, ok: true }, ...q.bad.map(t => ({ t, ok: false }))]);
+             ctx = `<div class="dlg-q-ctx">${bubble(q.line - 1, false)}${bubble(q.line, true)}</div>`;
+             opts = dlgShuffle([{ o: L[q.line], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);
              flashIdx = q.line;
...
              ctx = `<div class="dlg-q-listen"><button class="audio-btn audio-btn-lg" id="dlg-q-audio" aria-label="Ouvir a fala">🔊</button><div class="prompt-audio-hint">toque para ouvir de novo</div></div>`;
-             opts = dlgShuffle([{ t: L[q.line + 1].f, ok: true }, ...q.bad.map(t => ({ t, ok: false }))]);
+             opts = dlgShuffle([{ o: L[q.line + 1], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);
              flashIdx = q.line + 1;
...
          }
+         const optHTML = o => o.o ? zhOpt(o.o) : escapeHTML(o.t);
          const dots = checks.map((_, i) => `<span class="dlg-dot${i < st.qi ? ' done' : (i === st.qi ? ' on' : '')}"></span>`).join('');
...
        ${ctx}
-       <div class="dlg-opts">${opts.map((o, i) => `<button class="dlg-opt" data-i="${i}">${escapeHTML(o.t)}</button>`).join('')}</div>
+       <div class="dlg-opts">${opts.map((o, i) => `<button class="dlg-opt" data-i="${i}">${optHTML(o)}</button>`).join('')}</div>
        <div class="dlg-fb-slot"></div>`;
...
              const a = document.getElementById('dlg-q-audio');
-             const line = L[q.line].f;
-             a.addEventListener('click', () => speakFrench(line, a));
-             if (canSpeakFrench(line))
-                 speakFrench(line, a, true);
+             const line = L[q.line].c;
+             a.addEventListener('click', () => speakChinese(line, a));
+             if (canSpeakChinese(line))
+                 speakChinese(line, a, true);
          }
...
              }
-             const right = opts.find(x => x.ok).t;
+             const right = optHTML(opts.find(x => x.ok));
              const last = st.qi === checks.length - 1;
...
            <div class="dlg-fb-title">${o.ok ? '✅ Isso mesmo!' : 'Quase! A resposta certa era:'}</div>
-           ${o.ok ? '' : `<div class="dlg-fb-right">${escapeHTML(right)}</div>`}
+           ${o.ok ? '' : `<div class="dlg-fb-right">${right}</div>`}
            <button class="btn btn-primary btn-block" id="dlg-q-next">${last ? 'Concluir' : 'Próxima pergunta →'}</button>
```

## `renderClozeExercise` (42 linhas diferentes)

```diff
...
  function renderClozeExercise(ex, contentEl, nextBtn, total) {
-     const sentenceHTML = ex.phrase.blocks.map((b, i) => i === ex.blankIdx ? '<span class="cloze-blank" id="cloze-blank">___</span>' : b.f).join(' ');
+     const hanziHTML = ex.phrase.blocks.map((b, i) => i === ex.blankIdx ? '<span class="cloze-blank" id="cloze-blank">___</span>' : b.c).join('');
+     const pinyinHTML = ex.phrase.blocks.map((b, i) => i === ex.blankIdx ? '___' : b.p).join(' ');
      const mode = getClozeMode();
...
      <div class="exercise-wrap">
-       <div class="exercise-counter">${t('fr.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
+       <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
        <div class="exercise-prompt-label">${t('exercise.completeSentence')}</div>
-       <div class="cloze-sentence">${sentenceHTML}</div>
+       <div class="cloze-sentence">
+         <div class="cloze-hanzi">${hanziHTML}</div>
+         <div class="cloze-pinyin">${pinyinHTML}</div>
+       </div>
        <div class="cloze-audio-row" id="cloze-audio-row"></div>
...
          <div class="cloze-type-wrap">
-           <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('review.cloze.placeholder')}">
-           ${frAccentPickerHTML()}
+           <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.review.cloze.placeholder')}">
+           ${pinyinTonePickerHTML()}
            <button class="btn btn-primary btn-block" id="cloze-verify-btn">${t('common.verify')}</button>
...
        ` : `
-         <div class="cloze-options">${ex.options.map((opt, i) => `<button class="cloze-option" data-idx="${i}">${opt.f}</button>`).join('')}</div>
+         <div class="cloze-options">${ex.options.map((opt, i) => `
+           <button class="cloze-option" data-idx="${i}">
+             <span class="cloze-option-pinyin">${opt.p}</span>
+             <span class="cloze-option-hanzi">${opt.c}</span>
+           </button>
+         `).join('')}</div>
        `}
...
      function revealBlank(state) {
-         document.getElementById('cloze-blank').textContent = ex.correctBlock.f;
+         document.getElementById('cloze-blank').textContent = ex.correctBlock.c;
          document.getElementById('cloze-blank').classList.add(state === 'wrong' ? 'incorrect' : 'correct');
...
          const audioRow = document.getElementById('cloze-audio-row');
-         audioRow.innerHTML = audioBtnHTML(ex.phrase.f);
+         const spokenC = clozeExercisePhrase(ex).c;
+         audioRow.innerHTML = audioBtnHTML(spokenC);
          wireAudioButtons(audioRow);
-         if (canSpeakFrench(ex.phrase.f))
-             speakFrench(ex.phrase.f, audioRow.querySelector('.audio-btn'), true);
+         if (canSpeakChinese(spokenC))
+             speakChinese(spokenC, audioRow.querySelector('.audio-btn'), true);
          document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
...
      }
-     function finish(isCorrect) {
+     function finish(isCorrect, toneOnly) {
          STEP_STATE.exerciseAnswered = true;
...
          else {
-             setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
+             setTimeout(() => showWrongAnswerPanel(contentEl, ex, { toneOnly }), 500);
          }
...
          inputEl.focus();
-         wireFrAccentPicker(contentEl.querySelector('.fr-accent-picker'), inputEl);
+         wirePinyinTonePicker(contentEl.querySelector('.pinyin-tone-picker'), inputEl);
          inputEl.addEventListener('keydown', e => {
...
              inputEl.disabled = true;
-             const strip = s => normalizeLoose(s).replace(/[.,!?;:'"]/g, '').trim();
+             const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
              const typed = strip(inputEl.value);
-             finish(acceptedForms(ex.correctBlock.f).some(form => strip(form) === typed));
+             const forms = acceptedForms(ex.correctBlock.p);
+             const ok = forms.some(form => strip(form) === typed);
+             finish(ok, !ok && isToneOnlyMiss(typed, forms, strip));
          });
```
