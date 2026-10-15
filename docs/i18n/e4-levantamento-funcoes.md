# E4, passo 1: levantamento por função de `fr/app.js` x `zh/app.js`

Gerado por `scripts/e4-classify-functions.js` (parser do TypeScript sobre o código real; só leitura). Dados completos em `docs/i18n/e4-levantamento-funcoes.json`.
Declarações de topo: 455 em `fr/app.js` (10537 linhas) e 212 em `zh/app.js` (6653 linhas). "Quase igual" = pelo menos 75% de semelhança em pares de símbolos do código (sem comentários e espaços).

## 1. Resumo das funções (declarações de função)

| Classe | Funções | Linhas no fr | Linhas no zh | % das linhas de função do fr | % do zh |
|---|---:|---:|---:|---:|---:|
| idêntica | 3 | 16 | 16 | 0.2% | 0.4% |
| quase igual | 55 | 2556 | 2572 | 35% | 56.3% |
| divergente | 21 | 771 | 624 | 10.6% | 13.7% |
| só fr | 237 | 3965 | 0 | 54.3% | 0% |
| só zh | 62 | 0 | 1358 | 0% | 29.7% |

Total de linhas em funções: fr 7308, zh 4570. Os blocos de dados e constantes (não função) somam 151 declarações e ficam fora desta conta.

## 2. Por área (funções)

| Área | Idênticas | Quase iguais | Divergentes | Só fr | Só zh |
|---|---:|---:|---:|---:|---:|
| checkpoint e testes | 0 | 0 | 0 | 4 | 0 |
| conjugação | 0 | 0 | 0 | 9 | 0 |
| desafios e ditados | 0 | 0 | 0 | 87 | 7 |
| estado e persistência | 0 | 2 | 1 | 9 | 4 |
| exercícios de lição | 0 | 19 | 8 | 32 | 15 |
| mapa da trilha e unidades | 0 | 7 | 6 | 32 | 3 |
| outros | 0 | 6 | 1 | 24 | 9 |
| perfil, ranking e social | 3 | 3 | 3 | 2 | 0 |
| revisão e decks | 0 | 13 | 2 | 32 | 8 |
| áudio e fala | 0 | 5 | 0 | 6 | 16 |

## 3. Idênticas (candidatas ao passo 3, extração primeiro)

- `switchSettingsSection` (8 linhas, perfil, ranking e social)
- `renderSettingsView` (5 linhas, perfil, ranking e social)
- `isAdminUser` (3 linhas, perfil, ranking e social)

## 4. Quase iguais (passo 4: extrair com ponto de extensão)

| Função | Semelhança | Linhas fr / zh | Área |
|---|---:|---:|---|
| `renderSpeedReview` | 95% | 150 / 151 | revisão e decks |
| `renderReviewView` | 91% | 153 / 143 | revisão e decks |
| `renderReorderExercise` | 85% | 147 / 140 | exercícios de lição |
| `renderClozeExercise` | 84% | 112 / 126 | exercícios de lição |
| `renderDialogueStep` | 91% | 115 / 116 | exercícios de lição |
| `buildUnitBlock` | 89% | 106 / 101 | mapa da trilha e unidades |
| `renderMultipleChoiceCard` | 95% | 93 / 87 | revisão e decks |
| `renderDialogueCheck` | 86% | 87 / 89 | exercícios de lição |
| `renderMultipleChoiceExercise` | 92% | 82 / 88 | exercícios de lição |
| `finishCurrentLesson` | 91% | 80 / 76 | exercícios de lição |
| `onMatchTileClick` | 98% | 78 / 78 | exercícios de lição |
| `renderVocabTypeExercise` | 86% | 72 / 75 | exercícios de lição |
| `renderTypeAnswerCard` | 81% | 72 / 75 | revisão e decks |
| `renderClozeCard` | 78% | 69 / 74 | revisão e decks |
| `renderLessonCompleteScreen` | 96% | 69 / 69 | exercícios de lição |
| `renderUnitCompleteScreen` | 97% | 68 / 67 | mapa da trilha e unidades |
| `renderExerciseStep` | 95% | 63 / 63 | exercícios de lição |
| `renderTrueFalseExercise` | 95% | 61 / 60 | exercícios de lição |
| `renderProgressLineChart` | 91% | 54 / 59 | mapa da trilha e unidades |
| `showAnswerPanel` | 88% | 55 / 55 | exercícios de lição |
| `renderConceptStep` | 95% | 51 / 55 | exercícios de lição |
| `freshAcquisitionState` | 98% | 42 / 57 | estado e persistência |
| `answerSpeedQuestion` | 94% | 49 / 50 | exercícios de lição |
| `renderBlockIntroCard` | 85% | 43 / 49 | revisão e decks |
| `startDeckReviewSession` | 98% | 41 / 40 | revisão e decks |
| `renderStepProgress` | 79% | 38 / 38 | mapa da trilha e unidades |
| `wireDontKnowButton` | 97% | 38 / 38 | outros |
| `addXP` | 81% | 37 / 37 | perfil, ranking e social |
| `openReviewSession` | 96% | 37 / 35 | revisão e decks |
| `serializeState` | 76% | 36 / 32 | estado e persistência |
| `dlgPlayLine` | 94% | 32 / 31 | exercícios de lição |
| `playPregeneratedAudio` | 93% | 31 / 31 | áudio e fala |
| `buildReorderDistractors` | 94% | 27 / 27 | exercícios de lição |
| `flyBlockToSlot` | 96% | 26 / 26 | outros |
| `backToReviewModeSelect` | 98% | 26 / 25 | revisão e decks |
| `mapUnitDescribe` | 94% | 24 / 23 | mapa da trilha e unidades |
| `renderMatchGame` | 78% | 23 / 23 | exercícios de lição |
| `maybeSendStudyReminder` | 94% | 20 / 20 | outros |
| `buildCardsFromUnits` | 82% | 16 / 15 | revisão e decks |
| `renderDialogueCheckStep` | 82% | 15 / 16 | exercícios de lição |
| `currentStepDefs` | 84% | 16 / 14 | outros |
| `exitToPath` | 89% | 13 / 11 | mapa da trilha e unidades |
| `noteOrConceptReviewHTML` | 87% | 10 / 11 | revisão e decks |
| `findEnterAdvanceTarget` | 79% | 11 / 9 | outros |
| `freshDailyBucket` | 80% | 10 / 9 | perfil, ranking e social |
| `wireAudioButtons` | 95% | 9 / 9 | áudio e fala |
| `advanceUnitStep` | 94% | 9 / 9 | mapa da trilha e unidades |
| `pollForVoices` | 93% | 8 / 8 | áudio e fala |
| `assignTodaysMissions` | 87% | 7 / 7 | perfil, ranking e social |
| `reviewCardTagLabel` | 95% | 7 / 7 | revisão e decks |
| `maskWordInText` | 84% | 5 / 5 | outros |
| `audioBtnHTML` | 85% | 4 / 4 | áudio e fala |
| `playAudioPreview` | 79% | 3 / 3 | revisão e decks |
| `customAudioBtnHTML` | 81% | 3 / 3 | áudio e fala |
| `showWrongAnswerPanel` | 78% | 3 / 3 | exercícios de lição |

## 5. Divergentes (passo 5: unificar ou assumir como regra do idioma)

| Função | Semelhança | Linhas fr / zh | Área |
|---|---:|---:|---|
| `renderNormalCard` | 74% | 117 / 107 | revisão e decks |
| `renderStep` | 75% | 108 / 102 | outros |
| `renderUnitsGrid` | 32% | 86 / 48 | mapa da trilha e unidades |
| `applySerializedState` | 67% | 60 / 49 | estado e persistência |
| `buildExerciseSet` | 74% | 59 / 49 | exercícios de lição |
| `openUnitDetail` | 72% | 51 / 41 | mapa da trilha e unidades |
| `renderTrailMapView` | 25% | 46 / 29 | mapa da trilha e unidades |
| `markUnitCompleted` | 65% | 43 / 32 | mapa da trilha e unidades |
| `buildExerciseHint` | 68% | 36 / 30 | exercícios de lição |
| `answerExplanationHTML` | 58% | 34 / 28 | exercícios de lição |
| `collectBadgeMetrics` | 50% | 28 / 18 | perfil, ranking e social |
| `refreshStudyCardTexts` | 51% | 15 / 22 | revisão e decks |
| `findMatchingPhrase` | 70% | 19 / 13 | exercícios de lição |
| `dlgHighlight` | 67% | 15 / 14 | exercícios de lição |
| `dlgVocabTerms` | 36% | 16 / 6 | exercícios de lição |
| `badgeModesUsedCount` | 67% | 9 / 9 | perfil, ranking e social |
| `computeProgressSummary` | 68% | 7 / 7 | mapa da trilha e unidades |
| `registerDailyLessonCompleted` | 75% | 7 / 6 | exercícios de lição |
| `clozeFeedbackDetailHTML` | 32% | 7 / 6 | exercícios de lição |
| `currentStudentName` | 65% | 5 / 5 | perfil, ranking e social |
| `trailGroups` | 17% | 3 / 3 | mapa da trilha e unidades |

## 6. Só de um idioma (passo 6: módulos opcionais por idioma)

### Só no francês (237)

`renderConjPracticeStep` (204, conjugação), `openDictationPlayer` (185, desafios e ditados), `renderChallengesAdminList` (171, desafios e ditados), `renderChallengesList` (116, desafios e ditados), `renderChallengeCategories` (97, desafios e ditados), `renderLevelTestQuizStep` (80, exercícios de lição), `renderGrammarExerciseStep` (78, exercícios de lição), `renderCheckpointQuizStep` (78, exercícios de lição), `renderDictationResult` (76, desafios e ditados), `speakFrenchAudioOnly` (67, áudio e fala), `renderScenarioExercise` (62, exercícios de lição), `renderExpressionFeedbackScreen` (55, desafios e ditados), `md5Hex` (52, outros), `renderModuleCompleteScreen` (49, mapa da trilha e unidades), `renderConjSelectScreen` (49, conjugação), `checkListenTranslateAnswer` (49, exercícios de lição), `fillExpressionLevelSections` (47, exercícios de lição), `renderExpressionQuestionScreen` (44, desafios e ditados), `renderChallengePreviewBanner` (44, revisão e decks), `renderLevelModalList` (42, mapa da trilha e unidades), `importChallengesFromJSON` (41, desafios e ditados), `playDictationSentence` (40, desafios e ditados), `diffDictationWords` (40, desafios e ditados), `openClozeGrammarPlayer` (40, exercícios de lição), `buildModuleChallengesRow` (37, mapa da trilha e unidades), `loadChallengesFromDB` (33, estado e persistência), `openListenTranslatePlayer` (33, exercícios de lição), `challengeQualityChecklist` (33, desafios e ditados), `buildLevelReviewRow` (31, revisão e decks), `wireChallengeCompleteButton` (31, desafios e ditados), `ptVerbPersonTags` (31, revisão e decks), `analyzeTranslation` (31, outros), `wireChallengesAdminFilterBar` (31, desafios e ditados), `renderDictationList` (30, desafios e ditados), `markTranslationWords` (30, outros), `renderGrammarExplanationStep` (29, exercícios de lição), `openAccentPlayer` (29, desafios e ditados), `mergeSplitCompoundWords` (28, outros), `checkAccentAnswer` (28, exercícios de lição), `challengeAdminEditViewExpression` (27, desafios e ditados), `buildModuleReviewRow` (25, revisão e decks), `openCheckpoint` (25, checkpoint e testes), `openLevelTest` (25, mapa da trilha e unidades), `approveChallengeWithGate` (25, exercícios de lição), `challengeAdminPublishedCardHTML` (25, revisão e decks), `challengeAdminPendingCardHTML` (25, revisão e decks), `renderClozeGrammarFeedback` (24, exercícios de lição), `prepareDictationUserText` (23, desafios e ditados), `startModuleReviewSession` (21, revisão e decks), `completeModuleUnits` (21, mapa da trilha e unidades), `frenchNumberWords` (21, outros), `translationHasPersonMismatch` (21, exercícios de lição), `expressionTodayHTML` (20, desafios e ditados), `challengeAdminReadViewExpression` (20, desafios e ditados), `buildCheckpointRow` (19, checkpoint e testes), `mergeDictationDiff` (19, desafios e ditados), `dictationSentenceErrorFlags` (19, desafios e ditados), `expressionCardHTML` (19, revisão e decks), `tokenizeDictationText` (18, desafios e ditados), `splitDictationSentences` (18, desafios e ditados), `openChallengePlayer` (18, desafios e ditados), `challengesAdminFilterBarHTML` (18, desafios e ditados), `fillModuleChallengeRows` (17, exercícios de lição), `challengeAdminResourceHTML` (17, desafios e ditados), `challengeAdminEditViewListenTranslate` (17, exercícios de lição), `challengesAdminBulkToolbarHTML` (17, desafios e ditados), `wireFrAccentPicker` (16, desafios e ditados), `dictationWrongWords` (16, desafios e ditados), `validateClozeGrammarItem` (16, exercícios de lição), `challengeAudioFields` (16, desafios e ditados), `challengeAdminEditViewClozeGrammar` (16, exercícios de lição), `renderChallengesAdmin` (16, desafios e ditados), `buildLevelTestCard` (15, revisão e decks), `classifyDictationError` (15, desafios e ditados), `renderChallengeReviewDoneScreen` (15, revisão e decks), `renderChallengeQueueLevelDoneScreen` (15, mapa da trilha e unidades), `translationAlertsHTML` (15, outros), `completeLevelTest` (14, mapa da trilha e unidades), `evaluateDictation` (14, desafios e ditados), `dictationLightNoteText` (14, revisão e decks), `translationEditDistance` (14, outros), `challengeQualityChecklistHTML` (14, desafios e ditados), `unpublishChallenge` (14, desafios e ditados), `challengesAdminSectionHTML` (14, desafios e ditados), `renderGramTableHTML` (13, outros), `expressionOfTheDay` (13, desafios e ditados), `challengeCardHTML` (13, revisão e decks), `challengeAdminReadViewListenTranslate` (13, exercícios de lição), `updateDictationRecord` (12, desafios e ditados), `challengeResourceCardHTML` (12, revisão e decks), `renderChallengeQueueContinueScreen` (12, desafios e ditados), `listenTranslateSetup` (12, exercícios de lição), `wireChallengeAudioDurations` (12, desafios e ditados), `challengeAdminReadViewClozeGrammar` (12, exercícios de lição), `approveChallengeSilent` (12, desafios e ditados), `loadFrenchVoice` (11, estado e persistência), `sanitizeDictationRecord` (11, desafios e ditados), `parseChallengesImportInput` (11, desafios e ditados), `persistChallenge` (11, estado e persistência), `challengeFeedbackWrapperHTML` (11, desafios e ditados), `challengeAdminEditViewAccent` (11, desafios e ditados), `renderLevelSelect` (10, mapa da trilha e unidades), `normalizeDictationWord` (10, estado e persistência), `dictLightReason` (10, outros), `dictationWordHtml` (10, desafios e ditados), `challengeExternalResourcesHTML` (10, desafios e ditados), `challengeAdminCardTitle` (10, revisão e decks), `openChallengePreview` (10, revisão e decks), `getStepDefs` (9, outros), `buildLevelTestQueue` (9, mapa da trilha e unidades), `conjHintPlaceholder` (9, conjugação), `stopDictationAudio` (9, desafios e ditados), `chT` (9, outros), `updateChallengeReviewEntry` (9, revisão e decks), `markChallengeCompleted` (9, desafios e ditados), `applyChallengesAdminFilters` (9, desafios e ditados), `stopDictationSentenceAudio` (8, desafios e ditados), `sanitizeChallengeReviewEntry` (8, revisão e decks), `challengeProgressHTML` (8, mapa da trilha e unidades), `wireExpressionAudioButtons` (8, desafios e ditados), `normalizeForTranslationCompare` (8, estado e persistência), `translationSimilarity` (8, outros), `translationNumbers` (8, outros), `translationWordsAreNear` (8, outros), `challengeAdminReadViewAccent` (8, desafios e ditados), `removePreviewWarningEl` (8, revisão e decks), `getConjForms` (7, conjugação), `challengeDataPayload` (7, desafios e ditados), `openChallengeReviewQueue` (7, revisão e decks), `challengeCardLabelHTML` (7, revisão e decks), `answerChallenge` (7, exercícios de lição), `listenTranslateOutcome` (7, exercícios de lição), `clozeGrammarOutcome` (7, exercícios de lição), `clozeGrammarFilled` (7, exercícios de lição), `registerDailyConjugationTense` (6, conjugação), `unitOrdinalInfo` (6, mapa da trilha e unidades), `getStepDefsGrammar` (6, exercícios de lição), `dictLooseNorm` (6, outros), `dueChallengeReviewIds` (6, revisão e decks), `recordChallengeReviewOutcome` (6, revisão e decks), `challengeRetryButtonsHTML` (6, desafios e ditados), `expressionCardMeaning` (6, revisão e decks), `accentAnswerOutcome` (6, exercícios de lição), `challengeAdminReadView` (6, desafios e ditados), `challengeAdminEditView` (6, desafios e ditados), `registerDailyConjugationSession` (5, conjugação), `frAccentPickerHTML` (5, desafios e ditados), `ensureTrailTeacherLink` (5, estado e persistência), `buildCheckpointQueue` (5, checkpoint e testes), `recordCheckpointAttempt` (5, checkpoint e testes), `recordLevelTestAttempt` (5, mapa da trilha e unidades), `moduleTitleFor` (5, mapa da trilha e unidades), `dictationCardProgressHTML` (5, revisão e decks), `dictationScoreColorVar` (5, desafios e ditados), `openModuleChallenges` (5, mapa da trilha e unidades), `expressionRegisterChipHTML` (5, desafios e ditados), `openChallengeQueueLevel` (5, mapa da trilha e unidades), `queueLevelProgressLabel` (5, mapa da trilha e unidades), `dictationTask` (5, desafios e ditados), `speakFrench` (4, áudio e fala), `scenarioSceneHTML` (4, exercícios de lição), `registerDailyStars` (4, perfil, ranking e social), `registerDailyConjugationCorrect` (4, conjugação), `moduleProgressPct` (4, mapa da trilha e unidades), `levelCompleted` (4, mapa da trilha e unidades), `moduleReviewSelection` (4, revisão e decks), `recordModuleReviewDone` (4, revisão e decks), `trailSkipAllowed` (4, mapa da trilha e unidades), `conjPersonLabel` (4, conjugação), `dictationAudioPath` (4, mapa da trilha e unidades), `dictIsAbbreviation` (4, outros), `listedChallenges` (4, desafios e ditados), `openPremiumChallengesModal` (4, desafios e ditados), `challengeReviewDayNumber` (4, revisão e decks), `isChallengeReviewDue` (4, revisão e decks), `dueChallengeReviews` (4, revisão e decks), `backToChallengesListOrCategories` (4, desafios e ditados), `isDictationDone` (4, desafios e ditados), `expressionAudioBtnHTML` (4, desafios e ditados), `isTranslationAcceptable` (4, outros), `challengeOverlay` (4, desafios e ditados), `challengeText` (4, desafios e ditados), `challengeAudioIsFresh` (4, desafios e ditados), `challengeSearchableText` (4, desafios e ditados), `canSpeakFrench` (3, áudio e fala), `tpZero` (3, outros), `slowAudioBtnHTML` (3, áudio e fala), `slowAudioIconBtnHTML` (3, áudio e fala), `isFirstOfLevel` (3, mapa da trilha e unidades), `unitsOfLevel` (3, mapa da trilha e unidades), `modulesOfLevel` (3, mapa da trilha e unidades), `moduleUnlocked` (3, mapa da trilha e unidades), `moduleCompleted` (3, mapa da trilha e unidades), `levelTestsOfLevel` (3, mapa da trilha e unidades), `lessonStars` (3, exercícios de lição), `flashcardUnitTitleText` (3, revisão e decks), `showTrailSkipLocked` (3, mapa da trilha e unidades), `normalizeLoose` (3, estado e persistência), `conjActiveMask` (3, conjugação), `dictationSentenceAudioPath` (3, mapa da trilha e unidades), `escapeHtmlDictation` (3, desafios e ditados), `dictBareWord` (3, outros), `dictDisplayWord` (3, áudio e fala), `isChallengesAdmin` (3, desafios e ditados), `escapeHtmlChallenge` (3, desafios e ditados), `publishedChallenges` (3, desafios e ditados), `pendingChallenges` (3, desafios e ditados), `applyChallengeI18n` (3, desafios e ditados), `challengesPremiumUnlocked` (3, mapa da trilha e unidades), `tierBadgeHTML` (3, perfil, ranking e social), `dictationsVisible` (3, desafios e ditados), `isChallengeLocked` (3, mapa da trilha e unidades), `isDictationLocked` (3, mapa da trilha e unidades), `playableChallenges` (3, desafios e ditados), `ensureChallengesPlanLoaded` (3, estado e persistência), `unpublishedButApprovedChallenges` (3, desafios e ditados), `isChallengeCompleted` (3, desafios e ditados), `challengeReviewDueDay` (3, revisão e decks), `challengeCompleteButtonHTML` (3, desafios e ditados), `challengeSearchHaystack` (3, desafios e ditados), `nextQueueChallenge` (3, desafios e ditados), `openExpressionPlayer` (3, desafios e ditados), `translationTokenSet` (3, outros), `translationHasNegation` (3, outros), `markedWordsHTML` (3, outros), `normalizeForAccentCompare` (3, estado e persistência), `isAccentAnswerCorrect` (3, exercícios de lição), `stripDiacriticsForAccentCompare` (3, desafios e ditados), `clozeGrammarParts` (3, exercícios de lição), `clozeGrammarBlanksText` (3, exercícios de lição), `stopMatchTimer` (1, exercícios de lição), `isLevelReviewId` (1, revisão e decks), `dictMarksOf` (1, outros), `dictBareWordRaw` (1, outros), `challengeModuleId` (1, mapa da trilha e unidades), `challengeTier` (1, desafios e ditados), `dictationTier` (1, desafios e ditados)

### Só no mandarim (62)

`buildFullSentenceExercises` (136, exercícios de lição), `renderNextStoryBeat` (90, outros), `renderHanziReviewView` (89, revisão e decks), `speakChineseAudioOnly` (82, áudio e fala), `renderHanziWriteCard` (75, revisão e decks), `renderFullSentenceExercise` (66, exercícios de lição), `renderSearchResults` (64, outros), `renderHanziTestStep` (62, áudio e fala), `openStrokeModal` (59, áudio e fala), `renderHanziViewCard` (47, revisão e decks), `buildSearchIndex` (42, outros), `renderUnitSummaryHTML` (38, mapa da trilha e unidades), `buildHanziCards` (34, revisão e decks), `dlgHighlightPinyin` (31, exercícios de lição), `renderHanziLessonsGrid` (29, exercícios de lição), `gradeHanziCard` (23, revisão e decks), `renderRadicalsGrid` (23, outros), `openRadicalDetail` (21, outros), `openStory` (19, outros), `renderHanziStudyStep` (19, áudio e fala), `startHanziReviewSession` (17, revisão e decks), `convertNumberedPinyinSyllable` (16, áudio e fala), `findHanziAppearances` (16, áudio e fala), `openHanziLesson` (15, exercícios de lição), `renderHanziProgress` (15, mapa da trilha e unidades), `advanceHanziAfterWrite` (15, áudio e fala), `markHanziLessonCompleted` (14, exercícios de lição), `finishStory` (13, outros), `wirePinyinTonePicker` (13, desafios e ditados), `buildRadicalsIndex` (12, outros), `buildHanziTestOptions` (12, exercícios de lição), `loadChineseVoice` (11, estado e persistência), `pinyinToneVowelIndex` (10, desafios e ditados), `applyPinyinVisibility` (9, áudio e fala), `wireStrokeButtons` (8, áudio e fala), `zhTypeAnswerExportColumns` (8, exercícios de lição), `buildCumulativeVocabPool` (7, exercícios de lição), `phraseFeedbackDetailHTML` (6, exercícios de lição), `normalizePinyinAnswer` (6, estado e persistência), `recalculateHanziLocks` (6, áudio e fala), `togglePinyinVisibility` (5, áudio e fala), `renderStoryProgress` (5, mapa da trilha e unidades), `isToneOnlyMiss` (5, desafios e ditados), `pinyinTonePickerHTML` (5, desafios e ditados), `cardPromptPinyinText` (5, revisão e decks), `speakChinese` (4, áudio e fala), `strokeBtnHTML` (4, áudio e fala), `registerDailyHanziLesson` (4, exercícios de lição), `dlgSpeakerSide` (4, exercícios de lição), `phraseForExercise` (4, exercícios de lição), `toneHintHTML` (4, desafios e ditados), `canSpeakChinese` (3, áudio e fala), `extractHanziChars` (3, áudio e fala), `loadPinyinPreference` (3, estado e persistência), `loadLegacyState` (3, estado e persistência), `stripTones` (3, desafios e ditados), `currentStory` (3, outros), `pinyinWithoutTones` (3, desafios e ditados), `convertNumberedPinyin` (3, áudio e fala), `cardOriginTitle` (3, revisão e decks), `currentHanziLesson` (3, exercícios de lição), `clozeExercisePhrase` (1, exercícios de lição)

## 7. Como reproduzir

`NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-classify-functions.js` regrava este relatório e o JSON. A classificação por área é heurística pelo nome da função (lista em `AREAS` no script); conferir à mão antes de mover código.
