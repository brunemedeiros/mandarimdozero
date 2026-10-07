// Catálogo EN-US (i18n, Etapa 2 -- piloto). Carregado sob demanda.
// Chave faltando aqui cai em pt-BR. Comentário ao lado = confiança
// (ALTA/MÉDIA/BAIXA, mesmo critério do piloto A1-1: sentido/registro).
window.I18N_CATALOG = window.I18N_CATALOG || {};
window.I18N_CATALOG['en'] = {
  'common.close': 'Close', // ALTA

  'report.entry.label': 'Report a problem', // ALTA
  'report.entry.menuItem': '⚑ Report a problem', // ALTA

  'report.modal.title': '⚑ Report a problem or suggestion', // ALTA
  'report.modal.whatHappened': 'What happened?', // ALTA
  'report.modal.howMuch': 'How much did it get in your way?', // MÉDIA -- "atrapalhou" sem equivalente direto; alternativa: "How much did this affect you?"
  'report.modal.optional': '(optional)', // ALTA
  'report.modal.describeLabel': 'Describe what you saw', // ALTA
  'report.modal.describePlaceholder': 'What exactly happened?', // ALTA
  'report.modal.expectedLabel': 'What did you expect to happen?', // ALTA
  'report.modal.guestEmailLabel': 'Your email', // ALTA
  'report.modal.guestEmailOptional': '(optional, only if you want a reply)', // ALTA
  'report.modal.guestEmailPlaceholder': 'youremail@example.com', // ALTA
  'report.modal.attachButton': '📎 Attach a screenshot (optional)', // ALTA
  'report.modal.privacyNote': 'If attached, the screenshot is visible only to the team -- nothing is sent automatically.', // ALTA
  'report.modal.submit': 'Send', // ALTA
  'report.modal.sending': 'Sending...', // ALTA
  'report.modal.successText': 'Report sent. Thanks for helping improve the app!', // ALTA

  'report.category.bug_tecnico': 'Bug / technical error', // ALTA
  'report.category.erro_conteudo': 'Content error', // ALTA
  'report.category.traducao': 'Incorrect translation', // ALTA
  'report.category.audio': 'Incorrect audio / pronunciation', // ALTA
  'report.category.visual': 'Visual problem', // ALTA -- alternativa: "Display issue"
  'report.category.comportamento_inesperado': "Something doesn't work as it should", // ALTA
  'report.category.sugestao_melhoria': 'Suggestion for improvement', // ALTA
  'report.category.outro': 'Other', // ALTA

  'report.severity.impede': "Can't continue", // MÉDIA -- PT "Impede continuar"; alternativa: "Blocks me from continuing"
  'report.severity.dificulta': 'Makes the activity harder', // ALTA
  'report.severity.pequeno': 'Minor issue', // ALTA
  'report.severity.sugestao': 'Just a suggestion', // ALTA

  'report.error.rateLimitLogged': "You've sent several reports recently. Please wait a few minutes before sending another one.", // ALTA
  'report.error.rateLimitGuest': "You've sent several reports recently. Please wait a few minutes or create an account.", // ALTA
  'report.error.attachNotImage': 'The attachment must be an image.', // ALTA
  'report.error.attachTooLarge': 'Image too large (max. 8MB).', // ALTA
  'report.error.attachUploadFailed': "Couldn't upload the image.", // ALTA
  'report.error.chooseCategory': 'Choose a category.', // ALTA
  'report.error.describe': 'Describe what happened.', // ALTA
  'report.error.duplicate': 'You just sent this a moment ago -- thank you!', // ALTA
  'report.error.sendFailed': "Couldn't send. Check your connection and try again.", // ALTA
  'report.toast.success': '✓ Report sent. Thanks for helping!', // ALTA

  'premium.challenges.title': '🔒 Premium feature', // ALTA
  'premium.challenges.bodyHtml': '<strong>Module Challenges</strong> reinforce each topic in the course with Expressions, Listen and Translate, Accents, and extra Dictations.', // MÉDIA -- nomes das categorias de desafio ainda não traduzidos na aba Desafios; alinhar quando ela for migrada
  'premium.challenges.howToActivate': 'They\'re part of the Premium plan. To activate it, contact the administrator (profbrune).', // MÉDIA -- política de plano/ativação manual

  'flashcardLimit.modal.title': '🔒 Free plan limit', // ALTA
  'flashcardLimit.modal.bodyHtml': 'You\'ve reached the free plan\'s limit of <strong>20 active cards of your own</strong>. To create more, delete a card, or ask your teacher to link your account -- students linked to a teacher get unlimited cards of their own.', // MÉDIA -- política Free; PT e EN falam em apagar, a ação que a interface oferece (🗑); arquivar saiu na CONSOLIDAÇÃO-3
  'flashcardLimit.wouldGenerate': { one: 'This card would create {n} study card, but you only have {remaining} left on the free plan.', other: 'This card would create {n} study cards, but you only have {remaining} left on the free plan.' }, // MÉDIA -- política Free; plural real em EN (o PT usa "cartão(ões)")

  'flashcardReset.modal.title': '⚠️ Confirm edit', // ALTA
  'flashcardReset.modal.body': 'This edit will reset the review progress for this card. Do you want to continue?', // MÉDIA -- aviso de reinício de progresso
  'flashcardReset.modal.discard': 'Discard changes', // ALTA
  'flashcardReset.modal.confirm': 'Yes', // ALTA

  'settings.uiLanguage.title': 'Interface language', // ALTA
  'settings.uiLanguage.sub': 'Changes only the app\'s text (menus, buttons, and messages). It doesn\'t change the language you\'re studying.', // ALTA
  'settings.uiLanguage.confirm.title': 'Change the site language?', // ALTA
  'settings.uiLanguage.confirm.toEn': 'Text, explanations, and translations will now appear in English. Your progress stays saved.', // ALTA
  'settings.uiLanguage.confirm.toPt': 'Text, explanations, and translations will now appear in Portuguese. Your progress stays saved.', // ALTA
  'settings.uiLanguage.confirm.cancel': 'Cancel', // ALTA
  'settings.uiLanguage.confirm.yes': 'Change', // ALTA

  // Fase 6 lote 1
  'settings.title': 'Settings', // ALTA
  'settings.subtitle': 'Your account, preferences, and data export.', // ALTA
  'settings.tab.general': 'General', // ALTA
  'settings.tab.notifications': '🔔 Notifications', // ALTA
  'settings.tab.export': '📦 Export', // ALTA
  'settings.section.account': 'Account', // ALTA
  'settings.account.email': 'Email', // ALTA
  'settings.account.provider': 'Signed in with', // ALTA
  'settings.account.moreSoon': 'More account options coming soon.', // ALTA
  'settings.section.preferences': 'Preferences', // ALTA
  'settings.pref.dark.title': 'Dark mode', // ALTA
  'settings.pref.dark.sub': 'Uses the dark theme instead of the light one, regardless of your system setting.', // ALTA
  'settings.pref.cloze.title': 'Always type in the fill-in-the-blank exercise', // MÉDIA
  'settings.pref.sound.title': 'Correct/incorrect sound in exercises', // ALTA
  'settings.pref.sound.sub': 'Plays a short sound after each answer, in addition to the correct/incorrect color.', // ALTA
  'settings.export.title': 'Choose what to export', // ALTA
  'settings.export.button': 'Generate .apkg file', // ALTA
  'settings.pref.cloze.subFr': 'Instead of choosing from options, type the missing word (Clozemaster style).', // ALTA
  'settings.export.descFr': 'The exported deck includes the French word/phrase (with audio you can set up in Anki) and its translation, using the same question/answer pair as in the app.', // MÉDIA
  'settings.aria.section': 'Settings section', // ALTA
  'menu.profile': '👤 My profile', // ALTA
  'menu.ranking': '🏆 Leaderboard', // MÉDIA
  'menu.supportMaterials': '📚 Study materials', // MÉDIA
  'menu.settings': '⚙️ Settings', // ALTA
  'menu.admin': '🛠️ Admin panel', // ALTA
  'menu.logout': 'Sign out', // ALTA
  'menu.conjugation': '✍️ Conjugation', // ALTA
  'menu.challenges': '🎯 Challenges', // ALTA
  'settings.pref.cloze.subZh': 'Instead of choosing from options, type the missing pinyin (Clozemaster style).', // ALTA
  'settings.export.descZh': 'The exported deck includes pinyin, characters, and translation on each card, using the same question/answer pair as in the app.', // ALTA
  'ownFlashcards.err.frontRequired': 'Type the text for the front of the card.', // ALTA
  'ownFlashcards.err.backRequired': 'Type the translation (back of the card).', // ALTA
  'ownFlashcards.err.clozeOneBlank': 'The sentence must have exactly one blank marked with ___ (3 underscores).', // ALTA
  'ownFlashcards.err.clozeAnswerRequired': 'Type the correct answer for the blank.', // ALTA
  'ownFlashcards.err.clozePinyinRequired': 'Type the pinyin of the answer (this is what you will type).', // ALTA
  'ownFlashcards.err.createFailed': 'Could not create the card right now.', // ALTA
  'ownFlashcards.err.loginRequired': 'Sign in to your account.', // ALTA
  'ownFlashcards.err.uploadFailed': 'Could not upload the file right now.', // ALTA
  'ownFlashcards.err.ttsFailed': 'Could not generate the audio right now.', // ALTA
  'ownFlashcards.err.saveEditFailed': 'Could not save the edit right now.', // ALTA
  'preview.err.noFields': 'Add at least 1 field under "Native fields" to preview.', // MÉDIA
  'preview.err.buildFailed': 'Could not build the preview.', // ALTA
  'preview.err.buildFailedBase': 'Could not build the preview', // ALTA
  'preview.err.detail': ' ({detail})', // ALTA
  'preview.err.noCards': 'This content would not generate any cards.', // ALTA
  'preview.prev': '← Previous', // ALTA
  'preview.next': 'Next →', // ALTA
  'preview.cardOf': 'Card {n} of {total}', // ALTA
  'preview.toast.noEffect': '👁️ Preview -- nothing was saved or graded.', // ALTA
  'preview.toast.reviewMore': '👁️ Preview -- "Review more" has no effect here.', // MÉDIA
  'notif.time.now': 'now', // ALTA
  'notif.time.min': '{n}min', // ALTA
  'notif.time.hour': '{n}h', // ALTA
  'notif.time.day': '{n}d', // ALTA
  'notif.empty': 'No notifications yet. Keep studying! 📚', // ALTA
  'notif.cat.estudo': '📘 Study', // ALTA
  'notif.cat.revisao': '🔄 Review', // ALTA
  'notif.cat.streak': '🔥 Streak', // ALTA
  'notif.cat.gamificacao': '⭐ Achievements and XP', // ALTA
  'notif.cat.ranking': '🏆 Leaderboard', // MÉDIA
  'notif.cat.desafios': '🎯 Challenges', // ALTA
  'notif.cat.conteudo': '📚 What\'s new', // ALTA
  'notif.cat.reengajamento': '👋 Re-engagement', // MÉDIA
  'notif.cat.sistema': '⚙️ System', // ALTA
  'notif.pref.guest': 'Create an account to set up notifications -- guest mode does not save preferences.', // ALTA
  'notif.pref.loadFailed': 'Could not load your preferences right now.', // ALTA
  'notif.pref.sectionTitle': 'Notifications', // ALTA
  'notif.pref.inApp.title': 'In-app notifications', // ALTA
  'notif.pref.inApp.sub': 'Bell in the top bar + notification center. Turning this off silences everything at once -- fine-tune by category under "Customize by category" below.', // ALTA
  'notif.pref.push.title': 'Browser alerts (push)', // ALTA
  'notif.pref.push.sub': 'Notifies you even when the app is closed. Turn on by category under "Customize" below -- this switch handles the browser permission and turns everything on at once.', // MÉDIA
  'notif.pref.email.title': 'Emails', // ALTA
  'notif.pref.email.sub': 'Sends to your account email in some cases (e.g., when you disappear for a while). Turn on by category under "Customize" below -- this switch turns everything on at once.', // MÉDIA
  'notif.pref.quiet.section': 'Quiet hours', // ALTA
  'notif.pref.quiet.title': 'Do not notify between', // ALTA
  'notif.pref.quiet.sub': 'Applies to automatically calculated notifications (review, streak...) -- instant ones (XP, badge) still appear. Approximate time (not yet adjusted to your time zone).', // MÉDIA
  'notif.pref.quiet.startAria': 'Start of quiet hours', // ALTA
  'notif.pref.quiet.endAria': 'End of quiet hours', // ALTA
  'notif.pref.quiet.until': 'to', // ALTA
  'notif.pref.advanced.summary': 'Customize by category', // ALTA
  'notif.pref.matrix.app': 'App', // ALTA
  'notif.pref.matrix.push': 'Push', // ALTA
  'notif.pref.matrix.email': 'Email', // ALTA
  'notif.pref.toast.pushOn': '✓ Browser alerts turned on.', // ALTA
  'notif.pref.toast.pushOff': 'Browser alerts turned off.', // ALTA
  'notif.pref.toast.saved': '✓ Preferences saved.', // ALTA
  'notif.pref.push.unsupported': 'Your browser does not support push notifications.', // ALTA
  'notif.pref.push.blocked': 'Notifications are blocked in your browser settings -- allow them there and try again.', // ALTA
  'notif.pref.push.denied': 'You did not allow notifications. You can try again whenever you like.', // ALTA
  'notif.pref.push.error': 'Could not turn on right now. Please try again.', // ALTA
  'notif.pref.titleMatrixInApp': 'In the app', // ALTA
  'notif.pref.titleMatrixPush': 'Push', // ALTA
  'notif.pref.titleMatrixEmail': 'Email', // ALTA
  // Fase 6 lote 2 (fr/app.js)
  'toast.audioPlayFailed': 'Couldn\'t play the audio', // ALTA
  'toast.audioTapSpeaker': '🔇 Tap the speaker to listen', // ALTA
  'toast.audioUnsupported': 'Audio isn\'t supported in this browser', // ALTA
  'toast.voiceMissingFr': '🔇 No French voice found in this browser/OS', // ALTA -- fr
  'toast.audioPlayFailedThis': '🔇 Couldn\'t play this audio', // ALTA
  'toast.audioPlayFailedDot': 'Couldn\'t play the audio.', // ALTA
  'toast.markedKnown': 'Marked as already known ⭐', // ALTA
  'toast.dailyMissionsAllDone': '🎯 All of today\'s missions complete! +30 XP', // ALTA
  'toast.xpGain': '+{amount} XP', // ALTA
  'toast.pointsGain': '+{n} pts', // ALTA
  'toast.extraLife': '❤️ Extra life!', // ALTA
  'toast.unitComplete': 'Unit complete! 🥐', // ALTA -- emoji de croissant (fr)
  'toast.checkpointPassed': 'Checkpoint passed! 🏆', // ALTA
  'toast.levelComplete': 'Level {level} complete! 🎓', // ALTA
  'toast.conjPickOne': 'Choose at least 1 tense and 1 verb category', // ALTA
  'toast.conjNoVerbs': 'No verbs in this selection', // ALTA
  'settings.account.guest': 'Guest mode', // ALTA
  'settings.account.emailPassword': 'Email and password', // ALTA
  'flashcards.origin.teacherTitle': 'From your teacher', // ALTA -- tag do cartão
  'flashcards.origin.selfTitle': 'My cards', // ALTA -- tag do cartão
  'review.origin.all': 'All', // ALTA -- filtro de origem
  'review.origin.study': 'From the course path', // MÉDIA -- "trilha" = Study Trail; alternativa: "From the study path"
  'review.origin.teacher': 'From the teacher', // ALTA
  'review.origin.self': 'My cards', // ALTA
  'review.strength.title': 'Your words', // ALTA
  'review.strength.weak': 'Weak', // ALTA
  'review.strength.notStarted': 'Not started', // ALTA
  'review.strength.medium': 'Medium', // ALTA
  'review.strength.strong': 'Strong', // ALTA
  'review.strength.hint': 'Not started = no study yet; Weak = not solid yet; Strong = known well for a while; Medium = somewhere in between. This is ALL your vocabulary, not today\'s reviews (above) -- so you can have medium words here even with no reviews due right now.', // MÉDIA -- texto longo; "firmou" sem equivalente direto
  'review.mode.reviewLabel': 'Review', // ALTA
  'review.empty.noneYetTitle': 'No reviews yet', // ALTA
  'review.empty.upToDateTitle': 'You\'re all caught up!', // ALTA
  'review.mode.flashcard.name': 'Flashcard', // ALTA
  'review.mode.speed.name': 'Speed Review', // ALTA -- nome do modo
  'review.mode.speed.desc': 'Quick review', // ALTA
  'review.mode.hard.name': 'Hard words', // ALTA
  'review.mode.hard.desc': 'The ones you miss most', // ALTA
  'review.mode.match.name': 'Match', // MÉDIA -- nome do jogo; alternativa: "Matching"
  'review.mode.match.desc': 'Pairs game', // ALTA
  'review.insufficientTitle': 'Not enough vocabulary yet', // ALTA
  'review.match.insufficientMin': 'The Match game needs at least {n} words already seen in completed lessons.', // ALTA
  'review.match.insufficientSome': 'The Match game needs at least a few words you have already studied successfully in Study.', // ALTA
  'review.match.pickTitle': 'How many pairs do you want to play?', // ALTA
  'review.match.pairsLabel': 'pairs<br>({cards} cards)', // ALTA -- contém <br>
  'review.match.start': 'Start →', // ALTA
  'review.match.allMatched': 'All pairs matched!', // ALTA
  'review.match.attempts': '{n} attempt(s)', // ALTA
  'review.match.playAgain': 'Play again', // ALTA
  'review.speed.insufficientBody': 'Speed Review needs words you have already studied successfully at least once. Keep studying units in Study.', // ALTA
  'review.speed.upToDateBody': 'No reviews due right now. Practice is still available whenever you like.', // ALTA
  'review.practice': 'Practice', // ALTA
  'review.speed.gameOver': 'Game over!', // ALTA
  'review.speed.points': '{n} pts', // ALTA
  'review.speed.answered': 'You answered {n} word(s) this round.', // ALTA
  'review.back': 'Back', // ALTA
  'review.practiceMore': 'Practice more', // ALTA
  'review.complete.title': 'Review complete!', // ALTA
  'review.complete.reviewed': 'You reviewed {n} card(s) this session.', // ALTA
  'review.session.deckEmptyTitle': 'No cards in this Deck yet', // ALTA
  'review.session.tagsEmptyTitle': 'No cards with the selected tags', // ALTA
  'review.session.unitEmptyTitle': 'No cards in this unit yet', // ALTA
  'review.session.allDoneTitle': 'All caught up!', // ALTA
  'review.session.pendingOverall': 'You still have {n} card(s) due overall.', // ALTA
  'review.session.comeBackLater': 'Come back later for your next review, or start a new unit on the course path.', // ALTA
  'review.session.reviewAllAvailable': 'Review everything available', // ALTA
  'review.previewLabel': '👁️ Preview', // ALTA
  'review.cloze.placeholder': 'Type the missing word', // ALTA
  'review.typeAnswer.placeholder': 'Type the answer', // ALTA
  'review.tapToReveal': 'tap to see the answer', // ALTA
  'review.grade.again': 'Again', // MÉDIA -- botão de nota; PT "Errei" = "I got it wrong"; EN segue o padrão Anki
  'review.grade.hard': 'Hard', // ALTA
  'review.grade.good': 'Good', // ALTA
  'review.grade.easy': 'Easy', // ALTA
  'common.continue': 'Continue', // ALTA
  'common.continueArrow': 'Continue →', // ALTA
  'common.verify': 'Check', // ALTA
  'common.dontKnow': 'I don\'t know', // ALTA
  'exercise.completeSentence': 'Complete the sentence', // ALTA
  'trail.moduleCount': { one: '{n} module', other: '{n} modules' }, // ALTA
  'trail.comingSoon': 'Coming soon', // ALTA
  'trail.skipChip': '🎓 Skip', // ALTA
  'trail.levelTest.donePill': 'Completed ✓', // ALTA
  'trail.levelTest.sub': 'Already know French at level {level}? Take this test and go straight to {next} — no need to complete the units first.', // ALTA -- fr
  'trail.levelTest.redo': 'Retake →', // ALTA
  'trail.levelTest.start': 'Start →', // ALTA
  'trail.unit.skipped': 'Skipped', // ALTA
  'trail.unit.skippedTitle': 'Completed through the Checkpoint', // ALTA
  'trail.unit.skippedBadge': '⏭ Skipped', // ALTA
  'trail.unit.grammarChip': 'Grammar', // ALTA
  'trail.checkpoint.skipLocked': 'Skipping units is a Premium plan feature (or for the teacher\'s students).', // ALTA
  'review.listen.placeholder': 'Write what you heard', // ALTA
  'trail.unit.done': 'Completed', // ALTA
  'trail.unit.lessonsProgress': '{done} of {total} lessons', // ALTA
  'trail.checkpoint.title': 'Checkpoint', // ALTA
  'trail.checkpoint.goal': 'Test the whole module at once and skip the units you already know.', // ALTA
  'trail.moduleChallenges.title': 'Module {n} Challenges', // ALTA
  'trail.premiumBadge': 'Premium', // ALTA
  'trail.moduleChallenges.goal': 'Practice what you studied in new ways. Optional.', // ALTA
  'trail.levelReview.title': '{level} Review', // ALTA
  'trail.levelReview.goal': 'Dictations that bring together everything you learned across the level. Optional.', // ALTA
  'trail.dailyMissions.caption': '🎯 Daily missions', // ALTA
  'trail.levelPreparing': 'The content for level {level} is still being prepared.', // ALTA
  'trail.module.label': 'Module {n} · {title}', // ALTA
  'trail.levelTest.eyebrow': 'Level test', // ALTA
  'trail.checkpoint.intro': 'Test what you already know in this section. If you do well, all its units are marked as completed — no need to do them one by one.', // ALTA
  'trail.levelTest.intro': 'Already know French at level {level}? Take this test — if you do well, the whole level is marked as completed and you can go straight to {next}.', // ALTA -- fr
  'trail.eyebrow.grammar': 'Grammar', // ALTA
  'trail.eyebrow.unit': 'Unit {num} of {total}', // ALTA
  'deck.myDecks': 'My Decks', // ALTA
  'deck.teacherRoot': 'Teacher\'s cards', // MÉDIA
  'deck.studyThis': 'Study this Deck', // ALTA
  'deck.countsFull': '{total} cards · {new} new · {learning} learning · {review} to review · {due} due', // ALTA
  'deck.publicBadge': '🌐 Public', // ALTA
  'deck.publish': 'Publish', // ALTA
  'deck.cardsCount': { one: '{n} card', other: '{n} cards' }, // ALTA
  'deck.countsDetail': { one: '{n} card · {new} new · {learning} learning · {review} to review', other: '{n} cards · {new} new · {learning} learning · {review} to review' }, // MÉDIA
  'myFlashcards.lang.fr': 'French', // ALTA
  'myFlashcards.lang.pt': 'Portuguese', // ALTA
  'myFlashcards.lang.en': 'English', // ALTA
  'myFlashcards.lang.zh': 'Mandarin', // ALTA
  'myFlashcards.dir.generic.targetFirst': 'Front in the language you are studying, back in the translation (default)', // ALTA
  'myFlashcards.dir.generic.nativeFirst': 'Front in the translation, back in the language you are studying', // ALTA
  'myFlashcards.dir.targetFirst': 'Front in {target} (with audio), back with translation in {native}', // ALTA
  'myFlashcards.dir.nativeFirst': 'Front in the {native} translation, back in {target} (with audio)', // ALTA
  'myFlashcards.teacherDecks.title': 'Teacher\'s cards', // MÉDIA
  'myFlashcards.teacherDecks.hint': 'Decks organized by your teacher. Here you only study; she takes care of the organization.', // ALTA
  'myFlashcards.guest': 'Sign in to your account to create your own cards.', // ALTA
  'myFlashcards.badge.linked': '✨ Linked student — unlimited cards', // MÉDIA
  'myFlashcards.badge.free': '🔒 Free plan — {used}/{limit} cards', // ALTA
  'myFlashcards.badge.premium': '⭐ Premium', // ALTA
  'myFlashcards.badge.premiumUnlimited': '⭐ Premium — unlimited cards', // ALTA
  'myFlashcards.edit.legacyConversionError': 'This card couldn\'t open in the new editor: {reason}', // ALTA
  'myFlashcards.new.title': 'New card', // ALTA
  'myFlashcards.free.hint': '🔒 On the free plan you create Normal cards, with image/audio upload per field (external URL also available). <strong>Premium</strong> unlocks Normal with reverse, Multiple choice, Fill in the blank, Type the answer, plus generating audio from text and recording audio with the microphone.', // MÉDIA
  'myFlashcards.cardType': 'Card type', // ALTA
  'myFlashcards.fields.title': 'Fields', // ALTA
  'myFlashcards.fields.hint': 'Add this card\'s fields -- for example, Front and Back for a Normal card. Each field has its own language and its own audio options.', // ALTA
  'myFlashcards.preview': '👁️ Preview', // ALTA
  'myFlashcards.deckDest': 'Destination Deck', // ALTA
  'myFlashcards.note.label': 'Note (optional)', // ALTA
  'myFlashcards.note.placeholder': 'context, usage tip...', // ALTA
  'myFlashcards.limitReached': 'Limit reached', // ALTA
  'myFlashcards.create': 'Create card', // ALTA
  'myFlashcards.decks.title': 'My Decks', // ALTA
  'myFlashcards.decks.newNamePlaceholder': 'New Deck name', // ALTA
  'myFlashcards.decks.create': '+ Create Deck', // ALTA
  'myFlashcards.active.title': 'Your active cards ({n})', // ALTA
  'myFlashcards.export.btn': '⬇️ Export / share', // ALTA
  'myFlashcards.active.empty': 'You haven\'t created any cards yet. Use the form above to add words/phrases you want to memorize, even if they aren\'t in the study path.', // ALTA
  'myFlashcards.archived.title': 'Archived (history) ({n})', // MÉDIA
  'myFlashcards.import.title': 'Import cards', // ALTA
  'myFlashcards.import.hint': 'Did you get a .json file from another student, or a share link? Import it here -- only cards in the SAME language you are studying ({lang}) can be imported.', // ALTA
  'myFlashcards.anki.title': '📥 Import from Anki (.apkg)', // ALTA
  'myFlashcards.anki.hint': 'Have an Anki deck? Choose the .apkg file exported from there -- you\'ll see a summary (how many cards, types, warnings) before confirming; nothing is imported without your confirmation.', // ALTA
  'myFlashcards.row.createdOn': 'created on {date}', // ALTA
  'myFlashcards.row.previewTitle': 'Preview how it will appear in Review', // ALTA
  'myFlashcards.row.editTitle': 'Edit', // ALTA
  'myFlashcards.row.reactivateTitle': 'Reactivate (remove from the archive)', // MÉDIA
  'myFlashcards.row.hiddenTitle': 'Hidden from your profile -- click to make it visible', // ALTA
  'myFlashcards.row.visibleTitle': 'Visible on your profile (if your account is public) -- click to hide', // ALTA
  'myFlashcards.row.deleteTitle': 'Delete permanently', // ALTA
  'myFlashcards.edit.useNative': '🧪 Use the new field editor (native) -- keeps the content you already typed', // MÉDIA
  'myFlashcards.edit.sideLanguage': 'Language of each side', // ALTA
  'myFlashcards.edit.front': 'Front', // ALTA
  'myFlashcards.edit.pinyin': 'Pinyin', // ALTA
  'myFlashcards.edit.back': 'Back', // ALTA
  'myFlashcards.edit.cancel': 'Cancel', // ALTA
  'myFlashcards.edit.save': 'Save edit', // ALTA
  'myFlashcards.toast.editedReset': '✓ Card edited. Its review progress was reset.', // ALTA
  'myFlashcards.toast.edited': '✓ Card edited.', // ALTA
  'myFlashcards.native.title': 'Edit card', // MÉDIA
  'myFlashcards.native.hint': 'This card uses the new field model -- editing here, the content is saved to fields/card_generation_mode, never to the old columns.', // MÉDIA
  'myFlashcards.native.cardType': 'Card type', // MÉDIA
  'myFlashcards.toast.created': '✓ Card created. It\'s already in your review queue.', // ALTA
  'myFlashcards.err.previewLoad': 'Could not load this card to preview.', // ALTA
  'myFlashcards.confirm.delete': 'This will permanently delete the card and its entire review history. This cannot be undone. Continue?', // ALTA
  'myFlashcards.err.deleteFailed': 'Could not delete the card right now.', // ALTA
  'myFlashcards.toast.deleted': '✓ Card deleted.', // ALTA
  'myFlashcards.export.noneActive': 'You don\'t have any active cards to export.', // ALTA
  'myFlashcards.export.modalTitle': '⬇️ Export cards ({n})', // ALTA
  'myFlashcards.export.hint': 'Download a .json file to give to another student to import, or copy the share link -- both have the same content.', // ALTA
  'myFlashcards.export.download': '⬇️ Download .json', // ALTA
  'myFlashcards.export.copyLink': '🔗 Copy link', // ALTA
  'myFlashcards.export.linkCopied': '✓ Link copied!', // ALTA
  'myFlashcards.export.leftOut': '{n} Fill-in-the-blank card(s) were left out: this format only carries front and back.', // ALTA
  'myFlashcards.import.confirmCut': 'The file has {total} card(s), but only the first {kept} fit in the free plan. Import those {kept}?', // ALTA
  'myFlashcards.import.errRead': 'Could not read this file. Make sure it is a .json exported from this screen.', // ALTA
  'myFlashcards.import.errEmpty': 'The file/link has no cards to import.', // ALTA
  'myFlashcards.import.errLang': 'These cards are in another language ({lang}) -- they can\'t be imported here.', // ALTA
  'myFlashcards.import.confirm': { one: 'Import {n} card into your account?', other: 'Import {n} cards into your account?' }, // ALTA
  'myFlashcards.import.done': { one: '✓ {n} card imported.', other: '✓ {n} cards imported.' }, // ALTA

  // Fase 6 lote 2: zh/app.js
  'zh.toast.chineseVoiceMissing': '🔇 No Chinese voice found — see the setup guide', // MÉDIA
  'zh.toast.operaAudioFailed': '🔇 Opera couldn\'t play this audio', // ALTA
  'zh.toast.storyDone': 'Story completed! 🎉', // ALTA
  'zh.toast.unitDone': 'Unit completed! 🏮', // ALTA
  'zh.toast.hanziLessonDone': 'Hanzi lesson completed! 🈺', // ALTA
  'zh.review.cloze.placeholder': 'Type the missing pinyin', // ALTA
  'zh.review.typeAnswer.placeholder': 'Type the answer in pinyin', // ALTA
  'zh.review.match.pairs': 'Pairs: {done}/{total}', // ALTA
  'zh.review.match.attempts': 'Attempts: {n}', // ALTA
  'zh.path.unit.expandLessons': 'Expand lessons', // ALTA
  'zh.path.story.done': '✓ Completed', // ALTA -- gênero feminino ("história")
  'zh.path.story.unlocked': 'Checkpoint unlocked', // ALTA
  'zh.path.story.locked': '🔒 Complete the unit above', // ALTA
  'zh.path.unit.eyebrow': 'Unit {id} of {total}', // ALTA
  'zh.path.summary.vocabulary': 'Vocabulary', // ALTA
  'zh.path.summary.phrases': 'Model phrases', // ALTA
  'zh.path.summary.dialogue': 'Dialogue', // ALTA
  'zh.path.gotItArrow': 'Got it →', // ALTA
  'zh.path.reviewNowArrow': 'Review now ({n}) →', // ALTA
  'zh.path.continueStoryArrow': 'Continue story →', // ALTA
  'zh.path.nextWordArrow': 'Next word →', // ALTA
  'zh.path.seeWhatLearnedArrow': 'See what you learned →', // ALTA
  'zh.hanzi.nowWriteArrow': 'Now write →', // ALTA
  'zh.hanzi.backToLessons': 'Back to lessons', // ALTA
  'zh.path.knownAsk': 'Already know it?', // ALTA
  'zh.path.knownDone': '✓ I know it', // ALTA
  'zh.path.lessonDone.recapVocab': 'Vocabulary from this lesson', // ALTA
  'zh.path.lessonDone.recapMissed': 'Words you missed in the Checkpoint', // MÉDIA -- "Ponto de verificação" = checkpoint da unidade
  'zh.path.lessonDone.checkpointTitle': 'Checkpoint completed!', // MÉDIA -- "Ponto de verificação" = checkpoint
  'zh.path.lessonDone.lessonTitle': 'Lesson completed!', // ALTA
  'zh.path.lessonDone.xpEarned': 'XP earned', // ALTA
  'zh.path.lessonDone.score': 'Score', // ALTA
  'zh.path.lessonDone.cardsWaiting': { one: '📇 {n} card waiting for review', other: '📇 {n} cards waiting for review' }, // ALTA
  'zh.path.missionDonePrefix': 'Mission completed: ', // ALTA -- termina com ": "
  'zh.path.missionDayPrefix': 'Daily mission: ', // ALTA -- termina com ": "
  'zh.path.unitDone.congrats': 'Congratulations, {name}!', // ALTA
  'zh.path.unitDone.skills': 'Skills developed', // ALTA
  'zh.path.unitDone.goalReached': 'Communication goal achieved', // ALTA
  'zh.path.banner.quickCheck': '🧠 Quick check', // ALTA
  'zh.path.banner.practice': '✏️ Practicing what you just saw', // ALTA
  'zh.path.banner.mixed': '🔀 Mixing in what you\'ve already seen', // ALTA
  'zh.path.banner.recall': '👋 Recalling the previous lesson', // ALTA
  'zh.path.banner.consolidation': '🧩 Unit consolidation', // ALTA
  'zh.path.banner.errorsReview': '🔁 Reviewing your mistakes', // ALTA
  'zh.path.banner.checkpoint': '🧩 Checkpoint', // MÉDIA -- checkpoint da unidade
  'deck.err.loginRequired': 'Sign in to your account.', // ALTA
  'deck.err.prepareFailed': 'Could not set up your Decks right now.', // ALTA
  'deck.err.chooseValidPersonal': 'Choose a valid personal Deck as the destination.', // ALTA
  'deck.err.parentNotFound': 'Parent Deck not found.', // ALTA
  'deck.err.onlyInsideMyDecks': 'You can only create a Deck inside "My Decks" or another personal Deck.', // ALTA
  'deck.err.parentInvalid': 'Invalid parent Deck.', // ALTA
  'deck.err.nameRequired': 'Type a name for the Deck.', // ALTA
  'deck.err.createFailed': 'Could not create the Deck right now.', // ALTA
  'deck.err.renameFailed': 'Could not rename the Deck right now.', // ALTA
  'deck.err.moveCardFailed': 'Could not move the card right now.', // ALTA
  'deck.err.invalidCard': 'Invalid card.', // ALTA
  'deck.err.moveFailed': 'Could not move the Deck right now.', // ALTA
  'deck.err.courseFailed': 'Could not set up the course Decks right now.', // ALTA
  'deck.err.studentPrepareFailed': 'Could not set up this student\'s Decks right now.', // ALTA
  'deck.err.chooseValidStudentTree': 'Choose a valid Deck from this student\'s tree as the destination.', // ALTA
  'deck.err.onlyInsideStudentTree': 'You can only create a Deck inside this student\'s tree.', // ALTA
  'deck.err.nameTooLong': 'The Deck name can have at most 60 characters.', // ALTA
  'deck.err.invalidDeck': 'Invalid Deck.', // ALTA
  'deck.err.checkFailed': 'Could not check the Deck right now.', // ALTA
  'deck.err.hasChildren': 'This Deck has subdecks. Empty it (move or delete the subdecks) before deleting.', // ALTA
  'deck.err.hasNotes': 'This Deck has cards. Move the cards to another Deck before deleting.', // ALTA
  'deck.err.notDeletable': 'This Deck cannot be deleted.', // ALTA
  'deck.err.deleteFailed': 'Could not delete the Deck right now.', // ALTA
  'fr.step.vocab': 'Vocabulary', // ALTA
  'fr.step.dialogue': 'Dialogue', // ALTA
  'fr.step.usage': 'Usage tip', // ALTA
  'fr.step.exercises': 'Exercises', // ALTA
  'fr.step.explanation': 'Explanation', // ALTA
  'concept.banner.reality.informal': '🗣️ In real life', // ALTA
  'concept.banner.reality.familiar': '🗣️ Informal register', // ALTA
  'concept.banner.reality.regional': '📍 Regional variation', // ALTA
  'concept.banner.reality.colloquialGrammar': '✍️ This is also how people say it', // MÉDIA
  'concept.banner.culture.history': '📜 Did you know?', // ALTA
  'concept.banner.culture.custom': '🎭 Real-life custom', // MÉDIA
  'concept.banner.culture.festivity': '🎉 Special date', // ALTA
  'concept.banner.reality.default': '🌍 Real-life note', // ALTA
  'concept.banner.culture.default': '📜 Cultural note', // ALTA
  'concept.banner.understand': '💡 Worth understanding', // ALTA
  'concept.counter.reality': 'Real-life note', // ALTA
  'concept.counter.culture': 'Cultural note', // ALTA
  'concept.counter.understand': 'Worth understanding', // ALTA
  'concept.counter.of': '{i} of {n}', // ALTA
  'fr.blockIntro.inPhrase': 'In a sentence', // ALTA
  'fr.blockIntro.counter': 'Block {block} of {blocks} · Word {pos} of {total}', // ALTA
  'fr.blockIntro.markKnownTitle': 'Mark as already known', // ALTA
  'fr.mission.streak': 'Keep your daily streak alive today', // ALTA
  'fr.mission.firstLesson': 'Complete your first lesson of the day', // ALTA
  'fr.mission.conj1': 'Practice conjugation once', // ALTA
  'fr.mission.conjCorrect10': 'Get 10 verb forms right in one conjugation session', // ALTA
  'fr.mission.conjTenses2': 'Practice conjugation in 2 different tenses', // ALTA
  'fr.mission.reviews': { one: 'Review {n} card', other: 'Review {n} cards' }, // ALTA
  'fr.mission.speedReview1': 'Complete a Speed Review session', // ALTA
  'fr.mission.matchGame1': 'Play the memory game once', // ALTA
  'fr.mission.overdue': { one: 'Review {n} overdue card', other: 'Review {n} overdue cards' }, // ALTA
  'fr.mission.xp50': 'Earn 50 XP today', // ALTA
  'fr.mission.highscore2': 'Score above 80% in 2 lessons', // ALTA
  'fr.mission.perfect1': 'Complete a lesson without any mistakes', // ALTA
  'fr.mission.grammar1': 'Complete 1 grammar unit', // ALTA
  'fr.mission.listen10': 'Play audio 10 times', // ALTA
  'fr.mission.translateBlocks2': 'Complete 2 "Translate the sentence" exercises', // ALTA
  'fr.moduleDone.almostThere': 'Almost there!', // ALTA
  'fr.moduleDone.stars': 'Stars', // ALTA
  'fr.moduleDone.retryNote': 'You need at least {pct}% to pass. Keep studying the units in this section and try again whenever you like — no rush.', // ALTA
  'fr.moduleDone.nowYouKnow': 'Now you can do this in real life:', // MÉDIA
  'trail.backToTrail': 'Back to the trail', // ALTA
  'common.guest': 'Guest', // ALTA
  'fr.grammar.stepCounter': 'Step {i} of {n}', // ALTA
  'fr.grammar.goToExercises': 'Go to the exercises →', // ALTA
  'fr.grammar.sentenceCounter': 'Sentence {i} of {n}', // ALTA
  'fr.grammar.typeCorrectForm': 'Type the correct form', // ALTA
  'fr.grammar.nextSentenceArrow': 'Next sentence →', // ALTA
  'common.seeResultArrow': 'See result →', // ALTA
  'common.nextArrow': 'Next →', // ALTA
  'fr.checkpoint.question': 'Question {i} of {n}', // ALTA
  'fr.checkpoint.moduleDone': 'Module complete! 🏆', // ALTA
  'fr.checkpoint.finishSection': 'Finish section ✓', // ALTA
  'fr.checkpoint.exam.word': 'How do you say "{w}" in French?', // ALTA
  'fr.checkpoint.exam.phrase': 'Write in French: "{p}"', // ALTA
  'fr.checkpoint.exam.listen': 'Listen and write what you heard', // ALTA
  'limitCut.subject.deck': 'This Deck', // ALTA
  'limitCut.subject.import': 'This import', // ALTA
  'limitCut.subject.selection': 'This selection', // ALTA
  'limitCut.cardOne': '{n} card', // ALTA
  'limitCut.cardMany': '{n} cards', // ALTA
  'limitCut.already': ' (you already had {cards})', // ALTA
  'limitCut.resultMany': 'So only the first {n} cards were created.', // ALTA
  'limitCut.resultOne': 'So only the first card was created.', // ALTA
  'limitCut.resultNone': 'So no cards were created.', // ALTA
  'limitCut.main': '{subject} would create {requested}, but your account can hold only {limit} on the free plan{already}. {result}', // ALTA
  'fr.levelTest.goStraightTo': 'You can move straight on to {next}', // ALTA
  'fr.levelTest.finishLevel': 'Finish level {level} ✓', // ALTA
  'zh.audio.listenPronunciation': 'Listen to pronunciation', // ALTA
  'zh.audio.listenAudio': 'Listen to audio', // ALTA
  'zh.stroke.view': 'See stroke order', // ALTA
  'zh.stroke.title': 'Stroke order — {hanzi}', // ALTA
  'zh.stroke.loadFailed': 'Could not load the stroke feature right now. Check your connection and try again.', // ALTA
  'zh.stroke.noChars': 'This word has no Chinese characters to draw.', // ALTA
  'zh.stroke.replay': '🔄 Replay animation', // ALTA
  'zh.stroke.drawFailed': 'Could not draw "{ch}".', // ALTA
  'zh.mission.hanzi1': 'Study 1 Hanzi lesson', // ALTA
  'zh.mission.hanzi2': 'Study 2 Hanzi lessons', // ALTA
  'zh.mission.matchGame1': 'Play the Match game once', // ALTA
  'zh.reminder.title': 'Time to study Mandarin! 🇨🇳', // ALTA
  'zh.reminder.body': { one: 'Today\'s goal: {n} lesson.', other: 'Today\'s goal: {n} lessons.' }, // ALTA
  'zh.story.doneTitle': 'Story complete!', // ALTA
  'zh.story.doneBody': 'You reviewed the vocabulary of Units {from}–{to} in a new situation.', // ALTA
  'zh.story.backToPath': 'Back to the path', // ALTA
  'zh.search.noResults': 'No results for "{q}".', // ALTA
  'zh.search.unitDone': '✓ Unit {id}', // ALTA
  'zh.search.studyUnit': 'Study Unit {id}', // ALTA
  'zh.search.unitLocked': '🔒 Unit {id}: {title}', // ALTA
  'zh.search.loadMore': 'Load more ({shown} of {total})', // ALTA
  'zh.manual.title': 'Manual — Unit {id}: {title}', // ALTA
  'zh.hint.thinkWhenUse': 'Think about when you would use this expression. It appears in this sentence you already studied: "{masked}"', // ALTA
  'zh.hint.listenAgain': 'Listen again, paying attention to the sounds -- it is an expression from this unit\'s topic.', // MÉDIA
  'zh.hint.thinkContext': 'Think about the context of this unit\'s topic ("{title}"): in what situation would you use this word?', // ALTA
  'zh.hint.reorder': 'First identify who performs the action, then the action itself -- build the sentence following that line of thought, ignoring the blocks that do not belong to it.', // ALTA
  'zh.hint.fullsentence': 'Reread the sentence and think about how each part of it is normally said in Chinese, before comparing the options.', // MÉDIA
  'zh.hint.cloze': 'Reread the whole sentence, together with the translation, and think about which word gives the blank its grammatical and communicative meaning.', // ALTA
  'zh.hint.trueFalseUsage': 'Think about the explanation: "{title}"', // ALTA
  'zh.hint.trueFalseDefault': 'Reread the statement carefully: does it describe exactly the situation in which this expression is used?', // ALTA
  'zh.hint.label': '💡 Hint', // ALTA
  'zh.hint.retry': 'Try again', // ALTA
  'zh.hint.reveal': 'Show answer', // ALTA
  'zh.exercise.counter': 'Exercise {i} of {n}', // ALTA
  'zh.exercise.whatMeans': 'What does it mean?', // ALTA
  'zh.exercise.listenChoose': 'Listen and choose the right meaning', // ALTA
  'zh.exercise.tapToListenAgain': 'tap to listen again', // ALTA
  'zh.exercise.typePinyinHeard': 'Type the pinyin of what you heard', // ALTA
  'zh.exercise.typePinyinPlaceholder': 'Type the pinyin', // ALTA
  'zh.exercise.true': '✅ True', // ALTA
  'zh.exercise.false': '❌ False', // ALTA
  'zh.exercise.selectSentence': 'Select the correct sentence', // ALTA
  'zh.exercise.orderSentence': 'Put the sentence in order', // ALTA
  'zh.progress.guestWarning': '⚠️ You are in guest mode — your progress will <strong>not</strong> be saved when you close the tab.', // ALTA
  'zh.progress.guestLogin': 'Sign in with Google to save', // ALTA
  'zh.progress.statUnits': 'Units completed', // ALTA
  'zh.progress.statWords': 'Words learned', // ALTA
  'zh.progress.statStreak': 'Days in a row', // ALTA
  'zh.progress.statReviews': 'Total reviews', // ALTA
  'zh.progress.statDue': 'Due now', // ALTA
  'zh.progress.statXp': 'Total XP', // ALTA
  'progress.statNew': 'New', // ALTA
  'progress.statLearning': 'Learning', // ALTA
  'progress.statReview': 'To review', // ALTA
  'progress.statDueNow': 'Due', // ALTA
  'progress.statToday': 'To study today', // ALTA
  'progress.statTodayTitle': "One session's queue: due + new cards limited by 'new per day'. Follows the Review origin/tag filters, so it can differ from New/Due.", // MÉDIA
  'zh.progress.chartEmpty': 'Start studying to see your progress over time here.', // ALTA
  'zh.progress.chartPoint': '{date}: {n} words', // ALTA
  'zh.progress.chartTotal': 'Total so far:', // ALTA
  'zh.progress.chartTotalSuffix': 'words and characters learned', // ALTA
  'zh.progress.heatCell': { one: '{n} activity on {date}', other: '{n} activities on {date}' }, // ALTA
  'zh.progress.heatLess': 'Less', // ALTA
  'zh.progress.heatMore': 'More', // ALTA
  'zh.hanzi.allCaughtUp': 'All caught up!', // ALTA
  'zh.hanzi.pendingChars': 'You still have {n} character(s) due.', // ALTA
  'zh.hanzi.comeBackLater': 'Come back later for your next review, or move on to a new lesson.', // ALTA
  'zh.hanzi.sessionDone': 'Session complete!', // ALTA
  'zh.hanzi.sessionReviewed': 'You reviewed {n} character(s) in this session.', // ALTA
  'zh.hanzi.lessonTag': 'Lesson {n}', // ALTA
  'zh.hanzi.tapToReveal': 'tap to see the pinyin and meaning', // ALTA
  'zh.hanzi.backToRadicals': '← Back to radicals', // ALTA
  'zh.hanzi.appearsInCount': 'Appears in {n} character(s) you have already studied', // ALTA
  'zh.hanzi.countLabel': '{chars} characters in {lessons} lessons. See them, write them and test your memory.', // ALTA
  'zh.hanzi.lessonCompleted': 'Completed', // ALTA
  'zh.hanzi.charCount': '{n} characters', // ALTA
  'zh.hanzi.charOf': 'Character {i} of {n}', // ALTA
  'zh.hanzi.finalTest': 'Final test: {i} of {n}', // ALTA
  'zh.hanzi.appearsIn': 'Appears in', // ALTA
  'zh.hanzi.seeChar': 'Look at the character', // ALTA
  'zh.hanzi.write': 'Write: {pinyin} ({meaning})', // ALTA
  'zh.hanzi.restart': '🔄 Start over', // ALTA
  'zh.hanzi.writeHintNote': 'Getting the same stroke wrong twice automatically reveals the correct stroke.', // ALTA
  'zh.hanzi.writerNotLoaded': 'The writing feature did not load. Check your connection.', // ALTA
  'zh.hanzi.strokeHighlighted': 'Correct stroke highlighted — follow the guide 👆', // ALTA
  'zh.hanzi.strokeWrong': 'Wrong stroke — try again', // ALTA
  'zh.hanzi.writeDone': '✓ Well done!', // ALTA
  'zh.hanzi.retentionGood': 'Great retention!', // ALTA
  'zh.hanzi.retentionReview': 'It is worth reviewing these characters again soon.', // ALTA
  'zh.hanzi.lessonTest': 'Lesson test — {i} of {n}', // ALTA
  'fr.exercise.counter': 'Exercise {i} of {n}', // ALTA
  'fr.exercise.whatMeans': 'What does it mean?', // ALTA
  'fr.exercise.listenChooseMeaning': 'Listen and choose the right meaning', // ALTA
  'fr.exercise.tapToHearAgain': 'tap to listen again', // ALTA
  'fr.exercise.typeWhatYouHeard': 'Type what you heard', // ALTA
  'fr.exercise.typeInFrench': 'Type in French', // ALTA
  'fr.exercise.translateToFrench': 'Translate into French', // ALTA
  'fr.exercise.orderSentence': 'Put the sentence in order', // ALTA
  'fr.exercise.true': '✅ True', // ALTA
  'fr.exercise.false': '❌ False', // ALTA
  'fr.hint.label': '💡 Hint', // ALTA
  'fr.hint.retry': 'Try again', // ALTA
  'fr.hint.reveal': 'Show answer', // ALTA
  'fr.hint.thinkWhen': 'Think about when you would use this expression. It appears in this sentence you have already studied: "{masked}"', // ALTA
  'fr.hint.listenAgain': 'Listen again, paying close attention to the sounds -- it is an expression from this unit\'s topic.', // ALTA
  'fr.hint.thinkContext': 'Think about the context of this unit\'s topic ("{title}"): in what situation would you use this word?', // ALTA
  'fr.hint.reorderTranslate': 'First discard the blocks that don\'t belong to this sentence -- only then think about the order of the remaining words.', // ALTA
  'fr.hint.reorderOrder': 'First identify who performs the action and then the action itself -- build the sentence following that line of reasoning, ignoring the blocks that don\'t belong to it.', // ALTA
  'fr.hint.scenario': 'Reread the situation carefully: think about what you would say at that moment, not just the meaning of each sentence.', // ALTA
  'fr.hint.cloze': 'Reread the whole sentence, together with the translation, and think about which word gives the blank its grammatical and communicative sense.', // ALTA
  'fr.hint.trueFalseExplanation': 'Think about the explanation: "{title}"', // ALTA
  'fr.hint.trueFalseGeneric': 'Reread the statement carefully: does it describe exactly the situation in which this expression is used?', // ALTA
  'fr.audio.listenPronunciation': 'Listen to pronunciation', // ALTA
  'fr.audio.listen': 'Listen to audio', // ALTA
  'fr.audio.listenSlower': 'Listen more slowly', // ALTA
  'fr.audio.listenSlowly': 'Listen slowly', // ALTA
  'fr.trail.expandLessons': 'Expand lessons', // ALTA
  'fr.trail.freeDictation': { one: '{n} Free dictation', other: '{n} Free dictations' }, // ALTA
  'fr.trail.premiumDictationsOnly': { one: '{n} Premium dictation', other: '{n} Premium dictations' }, // ALTA
  'fr.progress.chartTotalSuffix': 'words learned', // ALTA
  'fr.conj.topAll': 'All ({n})', // ALTA
  'fr.conj.sessionDone': 'Session complete!', // ALTA
  'fr.conj.wellDone': 'Great job!', // ALTA
  'fr.conj.keepPracticing': 'Keep practicing these conjugations.', // ALTA
  'fr.conj.newSession': 'New session', // ALTA
  'fr.conj.verbCounter': 'Verb {i} of {n}', // ALTA
  'fr.conj.currentVerb': 'Current verb', // ALTA
  'fr.conj.regular': 'Regular verb', // ALTA
  'fr.conj.irregular': 'Irregular verb', // ALTA
  'fr.conj.nextVerbLabel': 'Next verb', // ALTA
  'fr.conj.checkAnswers': 'Check answers', // ALTA
  'fr.conj.hintTitle': 'Show letter count and ending', // ALTA
  'fr.conj.hintShow': '💡 Show hint', // ALTA
  'fr.conj.prevVerb': '← Previous verb', // ALTA
  'fr.conj.nextVerbArrow': 'Next verb →', // ALTA
  'fr.conj.hintMore': '💡 More help', // ALTA
  'fr.conj.hintMoreTitle': 'Reveal most of the letters', // ALTA
  'fr.conj.hintMax': '💡 Maximum hint', // ALTA
  'fr.dictation.levelReviewTitle': 'Level {level} review', // ALTA
  'fr.challenges.title': 'Challenges', // ALTA
  'fr.challenges.sub': 'Practice real French: expressions, listening comprehension and spelling.', // ALTA
  'fr.challenges.dictations': 'Dictations', // ALTA
  'fr.challenges.listenAndWrite': 'Listen and write', // ALTA
  'fr.challenges.levelName': 'Level {level}', // ALTA
  'fr.challenges.lockedModuleChallenges': { one: '🔒 +{n} module challenge in Premium', other: '🔒 +{n} module challenges in Premium' }, // ALTA
  'fr.challenges.lockedPremiumBtn': '🔒 Premium feature', // MÉDIA
  'fr.challenges.doneCount': { one: '{done}/{n} completed', other: '{done}/{n} completed' }, // ALTA
  'fr.challenges.review': '🎉 Review', // ALTA
  'fr.challenges.continue': 'Continue', // ALTA
  'fr.challenges.start': 'Start', // ALTA
  'fr.challenges.fromModuleSuffix': ' · from the module', // ALTA
  'fr.challenges.cat.expression.title': 'Expressions', // ALTA
  'fr.challenges.cat.expression.subtitle': 'Discover the meaning', // ALTA
  'fr.challenges.cat.listenTranslate.title': 'Listen and translate', // ALTA
  'fr.challenges.cat.listenTranslate.subtitle': 'Listen and translate', // MÉDIA
  'fr.challenges.cat.accent.title': 'Accents', // ALTA
  'fr.challenges.cat.clozeGrammar.title': 'Complete the sentence', // ALTA
  'fr.challenges.cat.accent.subtitle': 'Write it correctly', // ALTA
  'fr.challenges.exerciseDone': 'Exercise complete!', // ALTA
  'fr.challenges.levelDone': 'Level {level} complete!', // ALTA
  'fr.challenges.levelDoneBody': 'You have finished all the exercises in this level.', // ALTA
  'fr.challenges.backToLevels': 'Back to levels', // ALTA
  'fr.trail.premiumDictations': { one: '{n} dictation', other: '{n} dictations' }, // ALTA
  'fr.trail.dictationsAnd': { one: '{n} dictation and', other: '{n} dictations and' }, // ALTA
  'fr.trail.premiumChallengesSuffix': { one: '{n} Premium challenge', other: '{n} Premium challenges' }, // ALTA
  'review.interval.min': '{n} min', // ALTA
  'review.interval.hour': '{n} h', // ALTA
  'review.interval.day': { one: '{n} day', other: '{n} days' }, // ALTA
  'review.interval.week': '{n} wk', // ALTA
  'review.interval.month': { one: '{n} month', other: '{n} months' }, // ALTA
  'review.interval.year': { one: '{n} year', other: '{n} years' }, // ALTA
  'review.interval.yearsFrac': '{n} years', // ALTA
  // Revisão nova (tabela de Decks, Painel, semana, recordes) -- 2026-10-07
  'review.deck.lang.frances': 'French', // ALTA -- Revisão nova
  'review.deck.lang.mandarim': 'Mandarin', // ALTA -- Revisão nova
  'review.deck.lang.portugues': 'Portuguese', // ALTA -- Revisão nova
  'review.deck.lang.fallback': 'Language', // ALTA -- Revisão nova
  'review.deck.myDecks': 'My Decks', // ALTA -- Revisão nova
  'review.deck.teacherCards': 'Teacher\'s cards', // MÉDIA -- Revisão nova
  'review.deck.studyPath': 'Study Path', // MÉDIA -- Revisão nova
  'review.deck.allDecks': 'All Decks', // ALTA -- Revisão nova
  'review.deck.decks': 'Decks', // ALTA -- Revisão nova
  'review.deck.add': 'Add', // ALTA -- Revisão nova
  'review.deck.browse': 'Browse', // MÉDIA -- Revisão nova
  'review.deck.settings': 'Settings', // ALTA -- Revisão nova
  'review.deck.moreOptions': 'More options: import and export', // ALTA -- Revisão nova
  'review.deck.importFile': 'Import file (.apkg or .json)', // ALTA -- Revisão nova
  'review.deck.export': 'Export', // ALTA -- Revisão nova
  'review.deck.loadingDecks': 'Loading your Decks…', // ALTA -- Revisão nova
  'review.deck.expand': 'Expand', // ALTA -- Revisão nova
  'review.deck.collapse': 'Collapse', // ALTA -- Revisão nova
  'review.deck.createLink': '+ Create Deck', // ALTA -- Revisão nova
  'review.deck.colDeck': 'Deck', // ALTA -- Revisão nova
  'review.count.new': 'New', // ALTA -- Revisão nova
  'review.count.learning': 'Learning', // ALTA -- Revisão nova
  'review.count.review': 'Review', // ALTA -- Revisão nova
  'review.deck.noneYet': 'No Decks yet. Finish a lesson or create a Deck.', // ALTA -- Revisão nova
  'review.deck.orphans.one': '{n} of your older cards is not in any Deck yet. Open Browse to see it and move it.', // ALTA -- Revisão nova
  'review.deck.orphans.other': '{n} of your older cards are not in any Deck yet. Open Browse to see them and move them.', // ALTA -- Revisão nova
  'review.deck.createLoadError': 'Couldn\'t load "My Decks". Reload the page.', // ALTA -- Revisão nova
  'review.deck.create': 'Create Deck', // ALTA -- Revisão nova
  'review.deck.nameLabel': 'Deck name', // ALTA -- Revisão nova
  'review.deck.namePlaceholder': 'E.g.: Verbs', // ALTA -- Revisão nova
  'review.deck.insideLabel': 'Inside', // ALTA -- Revisão nova
  'review.deck.cancel': 'Cancel', // ALTA -- Revisão nova
  'review.deck.created': '✓ Deck "{name}" created.', // ALTA -- Revisão nova
  'review.deck.renameAria': 'Rename Deck', // ALTA -- Revisão nova
  'review.deck.newName': 'New name', // ALTA -- Revisão nova
  'review.deck.save': 'Save', // ALTA -- Revisão nova
  'review.deck.importReadError': 'Couldn\'t read this file. Use an Anki .apkg or a .json exported from this site.', // ALTA -- Revisão nova
  'review.deck.importLoginRequired': 'Sign in to your account to import cards.', // ALTA -- Revisão nova
  'review.deck.importLinkBroken': 'The shared cards link is incomplete or corrupted.', // ALTA -- Revisão nova
  'review.deck.exportNone': 'You don\'t have any cards of your own to export yet.', // ALTA -- Revisão nova
  'review.deck.hintCourse': 'Study Path cards come from the lessons: each lesson you finish unlocks its cards.', // ALTA -- Revisão nova
  'review.deck.hintTeacher': 'These cards are organized by your teacher. Here you only study them.', // ALTA -- Revisão nova
  'review.deck.cardWord.one': 'card', // ALTA -- Revisão nova
  'review.deck.cardWord.other': 'cards', // ALTA -- Revisão nova
  'review.deck.inSubdecks': ' in this Deck and its subdecks', // ALTA -- Revisão nova
  'review.deck.newCapPrefix': ' · up to ', // ALTA -- Revisão nova
  'review.deck.newWord.one': 'new', // ALTA -- Revisão nova
  'review.deck.newWord.other': 'new', // ALTA -- Revisão nova
  'review.deck.perDay': ' per day', // ALTA -- Revisão nova
  'review.deck.loginToCreate': 'Sign in to your account to create cards.', // ALTA -- Revisão nova
  'review.deck.studyNow': 'Study now', // ALTA -- Revisão nova
  'review.deck.emptyDeck': 'This Deck doesn\'t have any cards yet.', // ALTA -- Revisão nova
  'review.deck.addCard': 'Add card', // ALTA -- Revisão nova
  'review.deck.createSubdeck': 'Create subdeck', // ALTA -- Revisão nova
  'review.deck.rename': 'Rename', // ALTA -- Revisão nova
  'review.deck.isPublic': '🌐 Public', // ALTA -- Revisão nova
  'review.deck.publish': 'Publish', // ALTA -- Revisão nova
  'review.deck.delete': 'Delete', // ALTA -- Revisão nova
  'review.deck.loading': 'Loading…', // ALTA -- Revisão nova
  'review.deck.loadError': 'Couldn\'t load. Try again.', // ALTA -- Revisão nova
  'review.deck.createdCount.one': '✓ {n} created', // ALTA -- Revisão nova
  'review.deck.createdCount.other': '✓ {n} created', // ALTA -- Revisão nova
  'review.deck.deleteTitle': 'Deleting this deck will delete all the cards in it', // ALTA -- Revisão nova
  'review.deck.deleteHas': '"{name}" has', // ALTA -- Revisão nova
  'review.deck.and': ' and ', // ALTA -- Revisão nova
  'review.deck.subdeckWord.one': 'subdeck', // ALTA -- Revisão nova
  'review.deck.subdeckWord.other': 'subdecks', // ALTA -- Revisão nova
  'review.deck.alsoDeleted': ' (which will also be deleted)', // ALTA -- Revisão nova
  'review.deck.moveFirst': '. If you\'d rather keep the cards, move them first.', // ALTA -- Revisão nova
  'review.deck.moveCardsTo': 'Move the cards to', // ALTA -- Revisão nova
  'review.deck.moveToOther': 'Move to another deck', // ALTA -- Revisão nova
  'review.deck.deletePermanently': 'Delete permanently', // ALTA -- Revisão nova
  'review.deck.deleteConfirm': 'Delete "{name}" and {n} {cards} forever? The review history will be deleted too. This can\'t be undone.', // ALTA -- Revisão nova
  'review.deck.movedWhat.one': 'card was moved', // ALTA -- Revisão nova
  'review.deck.movedWhat.other': 'cards were moved', // ALTA -- Revisão nova
  'review.deck.deletedMoved': 'Deck deleted. {n} {what} to "{dest}".', // ALTA -- Revisão nova
  'review.deck.deletedWith': 'Deck deleted with {n} {cards}.', // ALTA -- Revisão nova
  'review.panel.type.cloze': 'Fill in the blank', // ALTA -- Revisão nova
  'review.panel.origin.study': 'Study Path', // MÉDIA -- Revisão nova
  'review.panel.origin.self': 'My cards', // ALTA -- Revisão nova
  'review.panel.origin.teacher': 'Teacher', // ALTA -- Revisão nova
  'review.panel.all': 'All', // ALTA -- Revisão nova
  'review.panel.searchPlaceholder': 'Search cards and notes', // ALTA -- Revisão nova
  'review.panel.searchAria': 'Search cards', // ALTA -- Revisão nova
  'review.panel.filters': 'Filters', // ALTA -- Revisão nova
  'review.panel.cardsAria': 'Cards', // ALTA -- Revisão nova
  'review.panel.front': 'Front', // ALTA -- Revisão nova
  'review.panel.back': 'Back', // ALTA -- Revisão nova
  'review.panel.listAria': 'Card list', // ALTA -- Revisão nova
  'review.panel.editorAria': 'Card editor', // ALTA -- Revisão nova
  'review.panel.state': 'Status', // MÉDIA -- Revisão nova
  'review.panel.archived': 'Archived ({n})', // ALTA -- Revisão nova
  'review.panel.tags': 'Tags', // ALTA -- Revisão nova
  'review.panel.noTags': 'No tags.', // ALTA -- Revisão nova
  'review.panel.manageTags': 'Manage tags', // ALTA -- Revisão nova
  'review.panel.noMatch': 'No cards match this filter.', // ALTA -- Revisão nova
  'review.panel.emptyScope': 'No cards here yet. Study Path cards show up as you finish lessons.', // ALTA -- Revisão nova
  'review.panel.selectNamed': 'Select {name}', // ALTA -- Revisão nova
  'review.panel.readOnly': 'Read-only', // ALTA -- Revisão nova
  'review.panel.selectedWord.one': 'selected', // ALTA -- Revisão nova
  'review.panel.selectedWord.other': 'selected', // ALTA -- Revisão nova
  'review.panel.moveTo': 'Move to', // ALTA -- Revisão nova
  'review.panel.move': 'Move', // ALTA -- Revisão nova
  'review.panel.clearSelection': 'Clear selection', // ALTA -- Revisão nova
  'review.panel.backToList': '← List', // ALTA -- Revisão nova
  'review.panel.pickCard': 'Pick a card from the list to view or edit it.', // ALTA -- Revisão nova
  'review.panel.archivedSuffix': ' · archived', // ALTA -- Revisão nova
  'review.panel.whyStudy': 'Study Path cards come from the lessons and can\'t be edited here.', // ALTA -- Revisão nova
  'review.panel.whyTeacher': 'Teacher\'s cards: only your teacher can edit them.', // ALTA -- Revisão nova
  'review.panel.loadCardError': 'Couldn\'t load this card.', // ALTA -- Revisão nova
  'review.panel.reactivate': '↺ Reactivate', // ALTA -- Revisão nova
  'review.panel.hiddenFromProfile': '🙈 Hidden from profile', // ALTA -- Revisão nova
  'review.panel.visibleOnProfile': '👁️ Visible on profile', // ALTA -- Revisão nova
  'review.panel.deleteOne': '🗑 Delete', // ALTA -- Revisão nova
  'review.panel.reactivated': '✓ Card reactivated.', // ALTA -- Revisão nova
  'review.panel.changeError': 'Couldn\'t change that right now.', // ALTA -- Revisão nova
  'review.panel.deleteOneConfirm': 'This will permanently delete the card and all its review history. This can\'t be undone. Continue?', // ALTA -- Revisão nova
  'review.panel.deleteOneError': 'Couldn\'t delete the card right now.', // ALTA -- Revisão nova
  'review.panel.deletedOne': '✓ Card deleted.', // ALTA -- Revisão nova
  'review.panel.movedWhat.one': 'item moved', // ALTA -- Revisão nova
  'review.panel.movedWhat.other': 'items moved', // ALTA -- Revisão nova
  'review.panel.movedToast': '{n} {what} to "{dest}".', // ALTA -- Revisão nova
  'review.panel.moveFailed': 'Couldn\'t move: {list}', // ALTA -- Revisão nova
  'review.panel.itemWord.one': 'item', // ALTA -- Revisão nova
  'review.panel.itemWord.other': 'items', // ALTA -- Revisão nova
  'review.panel.deleteManyConfirm': 'Delete {n} {items} ({total} {cards}) forever? The review history will be deleted too.', // ALTA -- Revisão nova
  'review.panel.deletedWhat.one': 'item deleted', // ALTA -- Revisão nova
  'review.panel.deletedWhat.other': 'items deleted', // ALTA -- Revisão nova
  'review.week.day.mon': 'Mon', // ALTA -- Revisão nova
  'review.week.day.tue': 'Tue', // ALTA -- Revisão nova
  'review.week.day.wed': 'Wed', // ALTA -- Revisão nova
  'review.week.day.thu': 'Thu', // ALTA -- Revisão nova
  'review.week.day.fri': 'Fri', // ALTA -- Revisão nova
  'review.week.day.sat': 'Sat', // ALTA -- Revisão nova
  'review.week.day.sun': 'Sun', // ALTA -- Revisão nova
  'review.week.today': 'Today', // ALTA -- Revisão nova
  'review.week.studied': 'studied', // ALTA -- Revisão nova
  'review.week.notStudied': 'didn\'t study', // ALTA -- Revisão nova
  'review.week.ariaFuture': '{day}: {due} to review, {new} new', // ALTA -- Revisão nova
  'review.week.alreadyStudied': ', already studied', // ALTA -- Revisão nova
  'review.week.title': 'Your review week', // ALTA -- Revisão nova
  'review.week.goalDone': 'Weekly goal reached', // ALTA -- Revisão nova
  'review.week.goal': 'Weekly goal', // ALTA -- Revisão nova
  'review.week.goalCount': ': <b>{n} of {goal}</b> study days', // ALTA -- Revisão nova
  'review.week.legendPast': 'Past days: ✓ when you studied. Coming days: ', // ALTA -- Revisão nova
  'review.week.legendDue': 'cards coming due and ', // ALTA -- Revisão nova
  'review.week.legendNew': 'new words.', // ALTA -- Revisão nova
  'review.memory.title': 'Memory strength', // ALTA -- Revisão nova
  'review.memory.aria': 'Memory strength: {weak} weak, {medium} medium, {strong} strong', // ALTA -- Revisão nova
  'review.memory.weak': 'Weak', // ALTA -- Revisão nova
  'review.memory.medium': 'Medium', // ALTA -- Revisão nova
  'review.memory.strong': 'Strong', // ALTA -- Revisão nova
  'review.records.streakWord.one': 'correct in a row', // ALTA -- Revisão nova
  'review.records.streakWord.other': 'correct in a row', // ALTA -- Revisão nova
  'review.records.yourRecord': 'Your record: {record}', // ALTA -- Revisão nova
  'review.records.againstClock': 'Against the clock', // ALTA -- Revisão nova
  'review.records.leftList': 'Left the list: {n}', // MÉDIA -- Revisão nova
  'review.records.time': 'Time: {time}', // ALTA -- Revisão nova
  'review.records.newRecord': '🏅 New record!', // ALTA -- Revisão nova
  'review.today.filter': 'Session filter: {filter}', // ALTA -- Revisão nova
  'review.today.clearFilter': 'Clear filter', // ALTA -- Revisão nova
  'review.today.aria': 'For today: {new} new, {learning} learning, {review} to review', // ALTA -- Revisão nova
  'review.today.shortTitle': 'Short session: the cards you miss most and the most overdue come first', // ALTA -- Revisão nova
  'review.today.short': '⏱ 5 minutes', // ALTA -- Revisão nova
  'review.today.studyAll': 'Study all ({n})', // ALTA -- Revisão nova
  'review.today.upToDate': 'You\'re all caught up for today.', // ALTA -- Revisão nova
  'review.today.speedSplitAria': 'New {new}, Learning {learning}, Review {review}', // ALTA -- Revisão nova
  'review.backToDeck': '← Back to Deck', // ALTA -- Revisão nova
  'review.backToModes': '← Back to modes', // ALTA -- Revisão nova
  'review.settings.origin': 'Source', // ALTA -- Revisão nova
  'review.settings.freq.balanced': 'Balanced (recommended)', // ALTA -- Revisão nova
  'review.settings.newPerDay.10': '10 (recommended)', // ALTA -- Revisão nova
  'review.settings.intensity.normal': 'Normal (recommended)', // ALTA -- Revisão nova
  'review.tagLabel.studyPath': 'Study Path', // MÉDIA -- Revisão nova
  'review.tagLabel.word': 'Word', // ALTA -- Revisão nova
  'review.tagLabel.inPhrase': 'In a sentence', // MÉDIA -- Revisão nova
  'review.tagLabel.general': ' (general)', // ALTA -- Revisão nova
  'review.tagLabel.level': 'Level', // ALTA -- Revisão nova
  'review.tagLabel.module': 'Module', // ALTA -- Revisão nova
  'review.tagLabel.lesson': 'Lesson', // ALTA -- Revisão nova
  'review.tags.systemTagTitle': 'Permanent attribution to the original author', // ALTA -- Revisão nova
  'review.tags.removeAria': 'Remove tag {tag}', // ALTA -- Revisão nova
  'review.tags.placeholder': 'e.g.: greeting, a1', // ALTA -- Revisão nova
  'review.tags.invalid': '"{tag}" is not a valid tag.', // ALTA -- Revisão nova
  'review.tags.systemNotAllowed': '"criado-por-…" tags are system tags (author attribution) and can\'t be created manually.', // ALTA -- Revisão nova
  'review.tags.exists': 'The tag "{tag}" already exists.', // ALTA -- Revisão nova
  'review.tags.hint': 'Tags apply to the whole card (every card generated from it) and can be used to filter Review. Up to {max} tags of {len} characters.', // ALTA -- Revisão nova
  'review.image.alt': 'Field image', // ALTA -- Revisão nova
  'review.image.change': 'Change image', // ALTA -- Revisão nova
  'review.image.add': '🖼️ Image', // ALTA -- Revisão nova
  'review.image.remove': 'Remove', // ALTA -- Revisão nova
  'review.image.uploading': 'Uploading image...', // ALTA -- Revisão nova
  'review.image.uploadError': 'Couldn\'t upload the image right now.', // ALTA -- Revisão nova
  'langSwitcher.ariaCurrent': 'Current language: {name}. Click to switch language.', // ALTA
  'langSwitcher.ariaSwitch': 'Switch language', // ALTA
  'langSwitcher.studying': 'You are studying', // ALTA
  'langSwitcher.learnOther': 'Learn another language', // ALTA
  'langSwitcher.ariaSwitchTo': 'Switch to {name}', // ALTA
  'langSwitcher.saveFailed': "⚠ Couldn't save the language change right now, but you're about to enter {name}.", // ALTA
  'supportMaterials.loginRequired': 'Sign in to your account to see your support material.', // ALTA
  'supportMaterials.openLink': '🔗 Open link', // ALTA
  'supportMaterials.downloadFile': 'Download file', // ALTA
  'supportMaterials.sentOn': 'sent on {date}', // ALTA
  'supportMaterials.empty': "Your teacher hasn't sent any support material yet. When she sends something (a summary, a link, a file), it will show up here.", // ALTA
  'wizard.day.mon': 'Mon', // ALTA
  'wizard.day.tue': 'Tue', // ALTA
  'wizard.day.wed': 'Wed', // ALTA
  'wizard.day.thu': 'Thu', // ALTA
  'wizard.day.fri': 'Fri', // ALTA
  'wizard.day.sat': 'Sat', // ALTA
  'wizard.day.sun': 'Sun', // ALTA
  'wizard.month.jan': 'January', // ALTA
  'wizard.month.feb': 'February', // ALTA
  'wizard.month.mar': 'March', // ALTA
  'wizard.month.apr': 'April', // ALTA
  'wizard.month.may': 'May', // ALTA
  'wizard.month.jun': 'June', // ALTA
  'wizard.month.jul': 'July', // ALTA
  'wizard.month.aug': 'August', // ALTA
  'wizard.month.sep': 'September', // ALTA
  'wizard.month.oct': 'October', // ALTA
  'wizard.month.nov': 'November', // ALTA
  'wizard.month.dec': 'December', // ALTA
  'wizard.date': '{month} {day}, {year}', // ALTA
  'wizard.obj.fun': 'Fun and culture', // ALTA
  'wizard.obj.travel': 'Travel', // ALTA
  'wizard.obj.friends': 'Friends and family', // ALTA
  'wizard.obj.work': 'Work', // ALTA
  'wizard.obj.education': 'Education', // ALTA
  'wizard.tier.1.label': 'Light', // MÉDIA
  'wizard.tier.2.label': 'Steady', // MÉDIA
  'wizard.tier.3.label': 'Intense', // ALTA
  'wizard.tier.1.desc': '1 lesson per day', // ALTA
  'wizard.tier.2.desc': '2 lessons per day', // ALTA
  'wizard.tier.3.desc': '3+ lessons per day', // ALTA
  'wizard.q.objective': 'What is your main goal in learning {language}?', // ALTA
  'wizard.q.level': 'What level do you want to reach?', // ALTA
  'wizard.q.days': 'Which days of the week do you want to study?', // ALTA
  'wizard.q.time': 'What time of day do you want to study?', // ALTA
  'wizard.q.lessons': 'How many lessons per day do you want to do?', // ALTA
  'wizard.notif.title': 'Notifications', // ALTA
  'wizard.notif.sub': "Get reminders for when you should study — only works with the browser open (we don't have a push notification server).", // ALTA
  'wizard.summary.noDays': 'set at least 1 day of the week', // ALTA
  'wizard.summary.title': 'You will reach your goal by <strong>{date}</strong>', // ALTA
  'wizard.summary.goalLabel': 'Your goal', // ALTA
  'wizard.summary.planTitle': 'Your personalized Study Plan', // ALTA
  'wizard.summary.edit': 'Edit', // ALTA
  'wizard.summary.rhythm': 'Pace', // ALTA
  'wizard.summary.time': 'Time', // ALTA
  'wizard.summary.save': 'Save Study Plan', // ALTA
  'wizard.card.setSub': 'Set how many lessons per day you want to do', // ALTA
  'wizard.card.setCta': 'Set my goal', // ALTA
  'wizard.card.subUntil': 'Goal by {date}', // ALTA
  'wizard.card.subSet': 'Goal set', // ALTA
  'wizard.card.lessonsThisWeek': 'lessons this week', // ALTA
  'wizard.card.dailyGoal': 'Daily goal', // ALTA
  'wizard.card.todayLessons': { one: '{done} / {goal} lesson', other: '{done} / {goal} lessons' }, // ALTA
  'wizard.card.estimate': 'At this pace, you will reach your goal by <strong>{date}</strong>.', // ALTA
  'wizard.card.estimateNone': 'Select at least one day of the week so we can calculate your goal.', // ALTA
  'wizard.chip.label': { one: 'Daily goal · {done}/{goal} lesson', other: 'Daily goal · {done}/{goal} lessons' }, // ALTA
  'auth.levelTestHint': '🎓 You said you already know the basics — check out "{title}" below to skip ahead to the next level.', // ALTA
  'auth.guestLabel': 'Guest', // ALTA
  'auth.myAccount': 'My account', // ALTA
  'auth.saveFailed': "⚠ We couldn't save your progress right now. Check your connection.", // ALTA
  'auth.notLoadedYet': '⏳ Still confirming your saved progress. Wait a moment before continuing.', // ALTA
  'auth.staleLocal': '⚠ Your progress here looks out of date compared to what was already saved -- reload the page if this persists.', // ALTA
  'leaderboard.daysLeft': { one: '{n} day left', other: '{n} days left' }, // ALTA
  'leaderboard.sideEmpty': 'Nobody has scored this week yet.', // ALTA
  'leaderboard.anonymous': 'Student', // ALTA
  'leaderboard.viewFull': 'View full leaderboard →', // ALTA
  'leaderboard.loading': 'Loading leaderboard...', // ALTA
  'leaderboard.tabAll': 'Overall', // ALTA
  'leaderboard.avatarAlt': 'Profile photo', // ALTA
  'leaderboard.rowPosition': 'Rank {rank}', // ALTA
  'leaderboard.rowYou': 'you', // ALTA
  'leaderboard.rowBadge': 'badge {name}', // ALTA
  'leaderboard.youTag': '(you)', // ALTA
  'leaderboard.emptyTitle': 'Be the first person on the leaderboard', // ALTA
  'leaderboard.emptyText': 'Nobody has scored in this category yet this week.', // ALTA
  'leaderboard.scopeAria': 'Leaderboard scope', // ALTA
  'leaderboard.footnote': 'The leaderboard resets every Monday. Only people who have earned XP this week appear.', // ALTA
  'profile.err.saveFailed': "We couldn't save right now. Check your connection and try again.", // ALTA
  'profile.err.imageRead': "We couldn't read that image.", // ALTA
  'profile.err.imageTooBig': 'Image too large (max 8MB).', // ALTA
  'profile.err.imageProcess': "We couldn't process that image. Try another one.", // ALTA
  'profile.err.photoUpload': "We couldn't upload the photo right now. Try again.", // ALTA
  'profile.err.photoSaveProfile': "Photo uploaded, but we couldn't save it to your profile. Try again.", // ALTA
  'profile.err.photoRemove': "We couldn't remove the photo right now.", // ALTA
  'profile.loading': 'Loading profile...', // ALTA
  'profile.guestNote': '⚠️ Guest mode — create an account to have a saved profile (username, bio) that stays visible across sessions.', // ALTA
  'profile.guestLogin': 'Sign in with Google to save', // ALTA
  'profile.noBadges': 'No achievements yet — your first lesson unlocks one.', // ALTA
  'profile.avatarAlt': 'Profile photo', // ALTA
  'profile.subnavAria': 'Profile section', // ALTA
  'profile.tabOverview': 'Overview', // ALTA
  'profile.tabGoals': 'Goals', // ALTA
  'profile.tabProgress': 'Progress', // ALTA
  'profile.editBtn': 'Edit profile', // ALTA
  'profile.sectionLangs': 'Languages &amp; progress', // ALTA
  'profile.streakLabel': 'day streak', // ALTA
  'profile.xpLabel': 'Total XP', // ALTA
  'profile.statsLink': 'View full statistics →', // ALTA
  'profile.sectionBadges': 'Achievements', // ALTA
  'profile.badgesLink': 'View all →', // ALTA
  'profile.featuredNone': 'None', // ALTA
  'profile.guestName': 'Guest', // ALTA
  'profile.uploading': 'Uploading...', // ALTA
  'profile.changePhoto': 'Change photo', // ALTA
  'profile.toast.photoUpdated': '✓ Photo updated.', // ALTA
  'profile.toast.photoRemoved': '✓ Photo removed.', // ALTA
  'profile.saving': 'Saving...', // ALTA
  'profile.save': 'Save', // ALTA
  'profile.toast.updated': '✓ Profile updated.', // ALTA
  'publicProfile.streakLabel': 'day streak', // ALTA
  'publicProfile.xpLabel': 'Total XP', // ALTA
  'publicProfile.loading': 'Loading profile...', // ALTA
  'publicProfile.notFoundTitle': 'Profile not found', // ALTA
  'publicProfile.notFoundText': 'There is no account with the username @{username}.', // ALTA
  'publicProfile.anonymous': 'Student', // ALTA
  'publicProfile.avatarAlt': 'Profile photo', // ALTA
  'publicProfile.private': '🔒 This person chose to keep their progress private.', // ALTA
  'publicProfile.noProgress': 'No progress recorded in any language yet.', // ALTA
  'publicProfile.noBadges': 'No achievements yet.', // ALTA
  'publicProfile.sectionFlashcards': 'Flashcards', // ALTA
  'publicProfile.viewCards': '📇 View cards created by @{username}', // ALTA
  'publicProfile.sectionProgress': 'Progress', // ALTA
  'publicProfile.sectionBadges': 'Achievements', // ALTA
  'publicProfile.gateText': '🔒 Sign in to see the cards and add them to your profile.', // ALTA
  'publicProfile.gateLogin': 'Sign in →', // ALTA
  'publicProfile.previewTitle': 'View details, no editing', // ALTA
  'publicProfile.reportTitle': 'Report this card', // ALTA
  'publicProfile.noCards': 'This user has no public cards yet.', // ALTA
  'publicProfile.counterNone': 'No cards selected', // ALTA
  'publicProfile.counter': { one: '{n} card selected', other: '{n} cards selected' }, // ALTA
  'publicProfile.selectAll': 'Select all', // ALTA
  'publicProfile.clear': 'Clear selection', // ALTA
  'publicProfile.importBtn': 'Add to my cards', // ALTA
  'publicProfile.dirReversed': 'Front in the translation, back in the studied language', // ALTA
  'publicProfile.dirNormal': 'Front in the studied language, back in the translation', // ALTA
  'publicProfile.labelFront': 'Front', // ALTA
  'publicProfile.labelPinyin': 'Pinyin', // ALTA
  'publicProfile.labelBack': 'Back', // ALTA
  'publicProfile.labelNote': 'Note', // ALTA
  'publicProfile.labelDirection': 'Direction', // ALTA
  'publicProfile.adding': 'Adding...', // ALTA
  'publicProfile.imported': { one: '✓ {n} card added to your account.', other: '✓ {n} cards added to your account.' }, // ALTA
  'publicProfile.importPartial': "Some cards couldn't be added. Try again.", // ALTA
  'ankiImport.title': '📥 Import from Anki', // ALTA
  'ankiImport.loadingFile': 'Reading the .apkg file...', // ALTA
  'ankiImport.err.readFile': "We couldn't read the chosen file.", // ALTA
  'ankiImport.err.loadDb': "We couldn't load the database reader right now. Try again in a moment.", // ALTA
  'ankiImport.err.loadZip': "We couldn't load the .zip reader right now. Try again in a moment.", // ALTA
  'ankiImport.loadingPlan': 'Analyzing the cards...', // ALTA
  'ankiImport.noDeck': 'No deck', // ALTA
  'ankiImport.pillMedia': '🎧🖼️ media', // ALTA
  'ankiImport.pillDuplicate': '⚠️ possible duplicate', // ALTA
  'ankiImport.tags.title': '🏷️ Tags found ({n}):', // ALTA
  'ankiImport.tags.note': 'Tags will be saved on each card (Note) exactly as in Anki (normalized -- lowercase, no accents, spaces become "-") and will be available for filtering once the Dashboard exists.', // MÉDIA
  'ankiImport.summary.found': { one: '<strong>{n}</strong> card found in the file --', other: '<strong>{n}</strong> cards found in the file --' }, // ALTA
  'ankiImport.summary.ok': '<strong>{n}</strong> can be imported natively,', // ALTA
  'ankiImport.summary.skipped': "<strong>{n}</strong> couldn't be recognized safely (see the warnings below; they're left out).", // ALTA
  'ankiImport.summary.duplicates': '⚠️ {n} seem to already exist in your account (unchecked by default, but you can check them anyway).', // ALTA
  'ankiImport.summary.media': '🎧🖼️ {n} have audio/image -- it is only downloaded/uploaded for the cards you actually confirm.', // ALTA
  'ankiImport.counterNone': 'No cards selected', // ALTA
  'ankiImport.counter': { one: '{n} card selected', other: '{n} cards selected' }, // ALTA
  'ankiImport.selectAll': 'Select all', // ALTA
  'ankiImport.clear': 'Clear selection', // ALTA
  'ankiImport.truncated': { one: '+ {n} more card not shown here (the "Select all" selection includes all of them anyway).', other: '+ {n} more cards not shown here (the "Select all" selection includes all of them anyway).' }, // ALTA
  'ankiImport.confirm': 'Confirm import', // ALTA
  'ankiImport.importing': 'Importing...', // ALTA
  'ankiImport.importingProgress': 'Importing {done}/{total}...', // ALTA
  'ankiImport.savingBatches': 'Saving... ({n} batch(es) ok)', // ALTA
  'ankiImport.saveError': 'Error saving.', // ALTA
  'ankiImport.skippedFallback': 'Card skipped.', // ALTA
  'ankiImport.result.ok': { one: '✓ <strong>{imported}</strong> of {n} selected card was imported successfully.', other: '✓ <strong>{imported}</strong> of {n} selected cards were imported successfully.' }, // ALTA
  'ankiImport.result.partial': '⚠️ The import stopped halfway -- <strong>{imported}</strong> of {requested} cards were already saved successfully before the failure. Those already imported will NOT be duplicated if you try again (that attempt will detect the ones that already exist).', // ALTA
  'ankiImport.result.mediaWarn': { one: '⚠️ {n} media file could not be included (the card text was imported normally): {list}{more}', other: '⚠️ {n} media files could not be included (the card text was imported normally): {list}{more}' }, // ALTA
  'ankiImport.destDeck': '📚 Import into Deck:', // ALTA
  'ankiImport.keepFolders': 'Keep the Anki folders (recreate them as Decks inside the chosen Deck)', // ALTA
  'ankiImport.result.decksCreated': '{n} Deck(s) created from the Anki folders.', // ALTA
  'ankiImport.result.cutTail': '({n} Anki card(s) were left out.)', // ALTA
  'ankiImport.result.deckFailed': '({n} card(s) were not imported.)', // ALTA
  'ankiImport.result.skippedTitle': 'Skipped cards ({n})', // ALTA
  'ankiExport.generating': 'Generating file...', // ALTA
  'ankiExport.empty': 'No cards to export in this selection.', // ALTA
  'ankiExport.mediaNote': { one: ' ({n} media file could not be included -- the cards were exported anyway, just without that specific audio/image.)', other: ' ({n} media files could not be included -- the cards were exported anyway, just without those specific audio/image files.)' }, // ALTA
  'ankiExport.done': { one: 'Exported! {n} card in the .apkg file — import it straight into Anki.{mediaNote}', other: 'Exported! {n} cards in the .apkg file — import them straight into Anki.{mediaNote}' }, // ALTA
  'ankiExport.failed': "We couldn't generate the file right now. Try again.", // ALTA
  'fieldEditor.lang.fr': 'French', // ALTA
  'fieldEditor.lang.zh': 'Mandarin (Chinese)', // ALTA
  'fieldEditor.lang.zhPinyin': 'Pinyin', // ALTA
  'fieldEditor.lang.ptBR': 'Portuguese', // ALTA
  'fieldEditor.lang.undefinedLabel': '(language not set)', // ALTA
  'fieldEditor.lang.notSet': '(not set)', // ALTA
  'fieldEditor.audio.status.ttsDone': '🎧 TTS audio generated', // ALTA
  'fieldEditor.audio.status.ttsPending': '🎧 TTS configured (audio not generated yet)', // ALTA
  'fieldEditor.audio.status.recDone': '🎙️ recording attached', // ALTA
  'fieldEditor.audio.status.recPending': '🎙️ recording configured (no file yet)', // ALTA
  'fieldEditor.audio.status.url': '🎧 audio (external link)', // ALTA
  'fieldEditor.audio.status.upload': '🎧 audio (upload)', // ALTA
  'fieldEditor.audio.status.generic': '🎧 has attached audio', // ALTA
  'fieldEditor.audio.origin.none': 'No audio', // ALTA
  'fieldEditor.audio.origin.url': 'External URL', // ALTA
  'fieldEditor.audio.origin.upload': 'File (upload)', // ALTA
  'fieldEditor.audio.origin.tts': 'Text to speech', // ALTA
  'fieldEditor.audio.origin.recording': 'Recording', // ALTA
  'fieldEditor.audio.method.upload': '📁 Upload a file', // ALTA
  'fieldEditor.audio.method.url': '🔗 Use a link', // ALTA
  'fieldEditor.audio.method.tts': '🔊 Text to speech', // ALTA
  'fieldEditor.audio.method.recording': '🎙️ Record audio', // ALTA
  'fieldEditor.audio.ttsLang.choose': '-- choose the language --', // ALTA
  'fieldEditor.audio.ttsLang.fr': 'French (fr-FR)', // ALTA
  'fieldEditor.audio.ttsLang.zh': 'Mandarin (zh-CN)', // ALTA
  'fieldEditor.audio.ttsLang.pt': 'Portuguese (pt-BR)', // ALTA
  'fieldEditor.audio.rate.slow': 'Slow', // ALTA
  'fieldEditor.audio.rate.normal': 'Normal', // ALTA
  'fieldEditor.audio.rate.fast': 'Fast', // ALTA
  'fieldEditor.audio.rec.requesting': 'Waiting for microphone permission...', // ALTA
  'fieldEditor.audio.rec.recording': '🔴 Recording...', // ALTA
  'fieldEditor.audio.rec.stopping': 'Finishing recording...', // ALTA
  'fieldEditor.audio.rec.uploading': 'Uploading recording...', // ALTA
  'fieldEditor.audio.rec.ready': 'Recording saved.', // ALTA
  'fieldEditor.audio.rec.error': "We couldn't record.", // ALTA
  'fieldEditor.audio.rec.idle': 'Click "🎙️ Record" to start.', // ALTA
  'fieldEditor.audio.title': 'Audio', // ALTA
  'fieldEditor.audio.noAudio': 'No audio.', // ALTA
  'fieldEditor.audio.replace': 'Replace', // ALTA
  'fieldEditor.audio.remove': '🗑 Remove', // ALTA
  'fieldEditor.audio.add': '+ Add audio', // ALTA
  'fieldEditor.audio.pickerQuestion': 'How do you want to add the audio?', // ALTA
  'fieldEditor.audio.cancel': 'Cancel', // ALTA
  'fieldEditor.audio.back': '← Back', // ALTA
  'fieldEditor.audio.urlLabel': 'Audio link (https://...)', // ALTA
  'fieldEditor.audio.urlPlaceholder': 'https://example.com/audio.mp3', // ALTA
  'fieldEditor.audio.urlApply': '🔗 Use this link', // ALTA
  'fieldEditor.audio.ttsText': 'Text to synthesize', // ALTA
  'fieldEditor.audio.ttsLangLabel': 'Synthesis language', // ALTA
  'fieldEditor.audio.ttsVoice': 'Voice (optional)', // ALTA
  'fieldEditor.audio.ttsVoicePlaceholder': 'blank = default voice (Chirp 3 HD)', // ALTA
  'fieldEditor.audio.ttsRate': 'Speed', // ALTA
  'fieldEditor.audio.saveFirst': 'Save the card first so you can generate audio from text.', // ALTA
  'fieldEditor.audio.regenerate': '🔊 Regenerate audio', // ALTA
  'fieldEditor.audio.generate': '🔊 Generate audio', // ALTA
  'fieldEditor.audio.record': '🎙️ Record', // ALTA
  'fieldEditor.audio.rerecord': '🎙️ Re-record', // ALTA
  'fieldEditor.audio.stop': '⏹ Stop', // ALTA
  'fieldEditor.audio.duration': 'Duration: {s}s', // ALTA
  'fieldEditor.audio.err.urlValidatorMissing': 'URL validation is not available on this screen.', // ALTA
  'fieldEditor.audio.err.uploadUnavailable': 'Audio upload is not available on this screen.', // ALTA
  'fieldEditor.audio.uploading': 'Uploading audio...', // ALTA
  'fieldEditor.audio.err.uploadFailed': "We couldn't upload the audio right now.", // ALTA
  'fieldEditor.audio.discardedUpload': 'Another audio source was used while this file was uploading. The result was discarded.', // ALTA
  'fieldEditor.audio.stale': '⚠️ Outdated audio: the text or settings changed since the last generation. Click "Generate again" to update.', // ALTA
  'fieldEditor.audio.generateAgain': '🔄 Generate again', // ALTA
  'fieldEditor.audio.err.genUnavailable': 'Audio generation is not available on this screen.', // ALTA
  'fieldEditor.audio.alreadyUpToDate': 'The audio is already up to date for these settings. No new generation was requested.', // ALTA
  'fieldEditor.audio.generating': 'Generating audio...', // ALTA
  'fieldEditor.audio.err.genFailed': "We couldn't generate the audio right now.", // ALTA
  'fieldEditor.audio.discardedGen': 'Another audio source was used while this one was being generated. The result was discarded.', // ALTA
  'fieldEditor.audio.configChanged': 'The settings changed while the audio was being generated. Click Generate again.', // ALTA
  'fieldEditor.field.removeTitle': 'Remove field', // ALTA
  'fieldEditor.field.content': 'Content', // ALTA
  'fieldEditor.field.language': 'Language', // ALTA
  'fieldEditor.field.hasPinyin': '🔤 has a linked pinyin field', // ALTA
  'fieldEditor.field.defaultLabel': 'Field {n}', // ALTA
  'fieldEditor.list.empty': 'No fields yet. Use "Add field" below.', // ALTA
  'fieldEditor.list.add': '+ Add field', // ALTA
  'mcEditor.err.notNative': 'This Note is not native.', // ALTA
  'mcEditor.err.notMcMode': 'This Note is not in Multiple choice mode.', // ALTA
  'mcEditor.err.unrecognized': { one: 'Multiple choice does not accept a Field with no role ({n} field without prompt/answer/distractor) -- assign a role or remove it.', other: 'Multiple choice does not accept Fields with no role ({n} fields without prompt/answer/distractor) -- assign a role or remove them.' }, // ALTA
  'mcEditor.err.emptyField': 'Every multiple choice field (question, correct answer, distractors) must have content.', // ALTA
  'mcEditor.promptLabel': 'Question/Prompt', // ALTA
  'mcEditor.answerLabel': 'Correct answer', // ALTA
  'mcEditor.noPrompt': 'No question field yet.', // ALTA
  'mcEditor.addPrompt': '+ Create question field', // ALTA
  'mcEditor.noAnswer': 'No correct answer field yet.', // ALTA
  'mcEditor.addAnswer': '+ Create correct answer field', // ALTA
  'mcEditor.distractorLabel': 'Distractor {n}', // ALTA
  'mcEditor.promote': '✓ Mark as correct answer', // ALTA
  'mcEditor.removeDistractor': '🗑 Remove distractor', // ALTA
  'mcEditor.noDistractors': 'No distractors yet -- add at least 1.', // ALTA
  'mcEditor.addDistractor': '+ Add distractor', // ALTA
  'mcEditor.maxDistractors': 'Maximum of {n} distractors reached.', // ALTA
  'mcEditor.othersTitle': 'Other fields (no role defined in this multiple choice)', // ALTA
  'mcEditor.othersHint': "These fields came from another mode and don't have a role here yet -- remove them or assign a role so the structure becomes valid.", // ALTA
  'mcEditor.noRoleField': 'Field with no role {n}', // ALTA
  'mcEditor.valid': '✓ Multiple choice structure complete.', // ALTA
  'mcEditor.distractorsTitle': 'Distractors ({n}/{max})', // ALTA
  'taEditor.err.notNative': 'This Note is not native.', // ALTA
  'taEditor.err.notTaMode': 'This Note is not in Type the answer mode.', // ALTA
  'taEditor.err.selfPinyin': "A field can't point to itself as pinyin.", // ALTA
  'taEditor.err.unrecognized': { one: 'Type the answer does not accept a Field with no role ({n} field without prompt/answer) -- assign a role or remove it.', other: 'Type the answer does not accept Fields with no role ({n} fields without prompt/answer) -- assign a role or remove them.' }, // ALTA
  'taEditor.err.missingPrompt': 'The question field is missing.', // ALTA
  'taEditor.err.multiPrompt': 'There can be only 1 question field.', // ALTA
  'taEditor.err.missingAnswer': 'The answer field is missing.', // ALTA
  'taEditor.err.multiAnswer': 'There can be only 1 answer field.', // ALTA
  'taEditor.err.emptyField': 'Question and answer must have content.', // ALTA
  'taEditor.promptLabel': 'Question/Prompt', // ALTA
  'taEditor.answerLabel': 'Expected answer', // ALTA
  'taEditor.noPrompt': 'No question field yet.', // ALTA
  'taEditor.addPrompt': '+ Create question field', // ALTA
  'taEditor.noAnswer': 'No answer field yet.', // ALTA
  'taEditor.addAnswer': '+ Create answer field', // ALTA
  'taEditor.pinyinTitle': 'Pinyin (satellite of another field)', // ALTA
  'taEditor.pinyinHint': 'Linked to another field via pinyinFieldId -- editable as usual, never counts as a 3rd question/answer field.', // MÉDIA
  'taEditor.pinyinLabel': 'Pinyin {n}', // ALTA
  'taEditor.othersTitle': 'Other fields (no role defined in Type the answer)', // ALTA
  'taEditor.othersHint': "These fields came from another mode and don't have a role here yet -- remove them or assign a role so the structure becomes valid.", // ALTA
  'taEditor.noRoleField': 'Field with no role {n}', // ALTA
  'taEditor.valid': '✓ Type the answer structure complete.', // ALTA
  'recorder.err.permissionDenied': "Microphone permission denied -- we couldn't record. You can allow microphone access in your browser settings and try again.", // ALTA
  'recorder.err.noDevice': 'No microphone available in this browser/device.', // ALTA
  'recorder.err.recordingError': 'An error occurred during recording -- try again.', // ALTA
  'recorder.err.uploadError': "Recording finished, but we couldn't save it -- try again.", // ALTA
  'recorder.err.finishFailed': "We couldn't finish the recording.", // ALTA
  'recorder.err.uploadUnavailable': 'Recording upload is not available on this screen.', // ALTA
  'recorder.err.saveFailed': "We couldn't save the recording right now.", // ALTA
  'clozeEditor.err.notNative': 'This Note is not native.', // ALTA
  'clozeEditor.err.notClozeMode': 'This Note is not in Fill in the blank mode.', // ALTA
  'clozeEditor.err.emptySentence': 'The sentence with blanks cannot be empty.', // ALTA
  'clozeEditor.err.emptyTranslation': 'The translation cannot be empty.', // ALTA
  'clozeEditor.err.malformed': 'The sentence has a malformed blank marker -- remove it and mark again.', // ALTA
  'clozeEditor.err.noMarks': 'Select at least one part of the sentence and mark it as a blank.', // ALTA
  'clozeEditor.err.duplicateIds': 'Duplicate blank IDs -- inconsistent state.', // ALTA
  'clozeEditor.err.emptyMark': 'One of the blanks has no text.', // ALTA
  'clozeEditor.err.missingPinyin': 'Missing pinyin for the blank "{answer}" (required for Mandarin) -- click it to complete.', // ALTA
  'clozeEditor.panel.answerLabel': 'Blank text', // ALTA
  'clozeEditor.panel.compareLabel': 'Expected answer (pinyin)', // ALTA
  'clozeEditor.panel.save': 'Save', // ALTA
  'clozeEditor.panel.remove': '🗑 Remove blank', // ALTA
  'clozeEditor.panel.cancel': 'Cancel', // ALTA
  'clozeEditor.markBtn': '✂️ Mark selection as blank', // ALTA
  'clozeEditor.noSentence': 'No sentence yet.', // ALTA
  'clozeEditor.addSentence': '+ Create sentence', // ALTA
  'clozeEditor.translationLabel': 'Translation (shown after answering)', // ALTA
  'clozeEditor.noTranslation': 'No translation yet.', // ALTA
  'clozeEditor.addTranslation': '+ Create translation', // ALTA
  'clozeEditor.othersTitle': 'Other fields (no role defined in Fill in the blank)', // ALTA
  'clozeEditor.othersHint': "These fields came from another mode and don't have a role here yet -- remove them.", // ALTA
  'clozeEditor.noRoleField': 'Field with no role {n}', // ALTA
  'clozeEditor.valid': '✓ Fill in the blank structure complete.', // ALTA
  'clozeEditor.sentenceTitle': 'Sentence with blanks', // ALTA
  'clozeEditor.sentenceHint': 'Select a word or part of the sentence and click "Mark selection as blank" -- you can mark more than one part.', // ALTA
  'clozeEditor.translationTitle': 'Translation', // ALTA
  'clozeEditor.sel.selectFirst': 'Select a part of the sentence first.', // ALTA
  'clozeEditor.sel.outside': 'Select a part INSIDE the sentence.', // ALTA
  'clozeEditor.sel.whitespace': 'The selection must contain some text, not just spaces.', // ALTA
  'clozeEditor.sel.overlaps': 'That selection already includes (fully or partially) an existing blank -- mark a part outside the blanks already created.', // ALTA
  'clozeEditor.sel.outOfRange': 'Invalid selection.', // ALTA
  'clozeEditor.sel.failed': "We couldn't mark that selection.", // ALTA
  'clozeEditor.panel.emptyAnswer': 'The blank text cannot be empty.', // ALTA
  'fr.dictation.backToTrail': '← Back to the trail', // ALTA
  'fr.dictation.backToChallenges': '← Back to challenges', // ALTA
  'fr.dictation.listen': '▶️ Listen to the dictation', // ALTA
  'fr.dictation.pause': '⏸ Pause', // ALTA
  'fr.dictation.restart': 'Restart', // ALTA
  'fr.dictation.skipBack': 'Back 15s', // ALTA
  'fr.dictation.skipForward': 'Forward 15s', // ALTA
  'fr.dictation.mute': 'Mute', // ALTA
  'fr.dictation.unmute': 'Unmute', // ALTA
  'fr.dictation.placeholder': 'Type what you heard here...', // ALTA
  'admin.common.adminOnly': 'This screen is for the platform administration only.', // ALTA
  'admin.common.removedUser': '(user removed)', // ALTA
  'admin.common.noneSelected': 'No student selected', // ALTA
  'admin.common.selectedCount': { one: '{n} student selected', other: '{n} students selected' }, // ALTA
  'admin.common.searchPlaceholder': 'Search by name or @username...', // ALTA
  'admin.common.langFilterAria': 'Filter by language', // ALTA
  'admin.common.all': 'All', // ALTA
  'admin.common.forNStudents': ' for {n} students', // ALTA
  'admin.common.forTheseStudents': ' for these students', // ALTA
  'admin.common.forThisStudent': ' for this student', // ALTA
  'admin.common.forNoStudent': ' -- select a student first', // ALTA
  'admin.common.selectAtLeastOne': 'Select at least one student.', // ALTA
  'admin.common.students': 'Students', // ALTA
  'admin.common.date': 'Date', // ALTA
  'admin.common.delete': 'Delete', // ALTA
  'admin.students.lang.mandarim': 'Chinese', // ALTA
  'admin.students.lang.portugues': 'Portuguese (coming soon)', // ALTA
  'admin.students.linkedOn': 'linked on {date}', // ALTA
  'admin.students.metricsTitle': 'View metrics', // ALTA
  'admin.students.removeLinkTitle': 'Remove link', // ALTA
  'admin.students.none': 'No student linked yet.', // ALTA
  'admin.students.linkTitle': 'Link a student', // ALTA
  'admin.students.accountLabel': 'Student account', // ALTA
  'admin.students.selectAccount': 'Select an account...', // ALTA
  'admin.students.link': 'Link', // ALTA
  'admin.students.yourStudents': 'Your students ({n})', // ALTA
  'admin.students.linkedToast': '✓ @{username} linked as a student.', // ALTA
  'admin.students.removeConfirm': 'Remove this link? The student\'s progress and history are preserved -- they just stop appearing in your list.', // ALTA
  'admin.students.metrics.failed': 'We couldn\'t load the metrics right now.', // ALTA
  'admin.students.metrics.noCards': 'You haven\'t created any cards for this student yet, in the "📇 Flashcards" tab.', // ALTA
  'admin.students.metrics.noRecord': 'no record', // ALTA
  'admin.students.metrics.today': 'today', // ALTA
  'admin.students.metrics.yesterday': 'yesterday', // ALTA
  'admin.students.metrics.daysAgo': '{n} days ago', // ALTA
  'admin.premium.adminOnly': 'Only the administration can access this section.', // ALTA
  'admin.premium.title': '⭐ Activate/remove Premium', // ALTA
  'admin.premium.hint': 'Search for an account by @username and activate the Premium plan for it -- it works for ANY registered account, whether linked to you as a student or not. No real billing yet (no checkout set up) -- it is a manual grant, reversible at any time.', // ALTA
  'admin.premium.usernamePlaceholder': 'e.g. johnsmith', // ALTA
  'admin.premium.search': 'Find account', // ALTA
  'admin.premium.notFound': 'I couldn\'t find anyone with that @username. Check the spelling.', // ALTA
  'admin.premium.currentPlan': 'Current plan: ', // ALTA
  'admin.premium.planFree': '🔒 Free', // ALTA
  'admin.premium.remove': 'Remove Premium', // ALTA
  'admin.premium.make': 'Make Premium', // ALTA
  'admin.premium.nowPremium': '✓ @{username} is now Premium.', // ALTA
  'admin.premium.removed': '✓ Premium removed from @{username}.', // ALTA
  'admin.classLogs.fieldTopic': '📌 Topic', // ALTA
  'admin.classLogs.fieldHomework': '📝 Homework', // ALTA
  'admin.classLogs.fieldObservations': '🔎 Observations', // ALTA
  'admin.classLogs.fieldNotes': '💬 Notes', // ALTA
  'admin.classLogs.topicOpt': 'Topic (optional)', // ALTA
  'admin.classLogs.homeworkOpt': 'Homework (optional)', // ALTA
  'admin.classLogs.observationsOpt': 'Observations (optional)', // ALTA
  'admin.classLogs.notesOpt': 'Notes / free text (optional)', // ALTA
  'admin.classLogs.noFields': '(no fields filled in)', // ALTA
  'admin.classLogs.listTitle': 'Recorded classes ({n})', // ALTA
  'admin.classLogs.emptyFor': 'No class recorded yet', // ALTA
  'admin.classLogs.deleteConfirm': 'Delete this class record? This action cannot be undone.', // ALTA
  'admin.classLogs.deleted': '✓ Record deleted.', // ALTA
  'admin.classLogs.updated': '✓ Class updated.', // ALTA
  'admin.classLogs.register': 'Record class', // ALTA
  'admin.classLogs.pickStudentsHint': 'Select this class\'s students.', // ALTA
  'admin.classLogs.newTitle': 'New class', // ALTA
  'admin.classLogs.needStudent': 'Select at least one student above to be able to record the class.', // ALTA
  'admin.classLogs.linkFirst': 'Link a student first, in the "🎓 Students" tab, to be able to record classes for them.', // ALTA
  'admin.classLogs.topicPlaceholder': 'e.g. passé composé', // ALTA
  'admin.classLogs.homeworkPlaceholder': 'e.g. exercises 1-3 on page 24', // ALTA
  'admin.classLogs.observationsPlaceholder': 'material used, book page...', // ALTA
  'admin.classLogs.notesPlaceholder': 'vocabulary and grammar covered in class...', // ALTA
  'admin.classLogs.registeredN': '✓ Class recorded for {n} students.', // ALTA
  'admin.classLogs.registered': '✓ Class recorded.', // ALTA
  'admin.materials.badgeLink': '🔗 link', // ALTA
  'admin.materials.badgeFile': '📎 file', // ALTA
  'admin.materials.titleLabel': 'Title', // ALTA
  'admin.materials.descOpt': 'Description (optional)', // ALTA
  'admin.materials.linkOpt': 'Link (optional)', // ALTA
  'admin.materials.fileOpt': 'File (optional)', // ALTA
  'admin.materials.listTitle': 'Materials sent ({n})', // ALTA
  'admin.materials.emptyFor': 'No material yet', // ALTA
  'admin.materials.deleteConfirm': 'Delete this support material? This action cannot be undone.', // ALTA
  'admin.materials.deleted': '✓ Material deleted.', // ALTA
  'admin.materials.updated': '✓ Material updated.', // ALTA
  'admin.materials.pickStudentsHint': 'Select the students who will receive this material.', // ALTA
  'admin.materials.newTitle': 'New material', // ALTA
  'admin.materials.needStudent': 'Select at least one student above to be able to send the material.', // ALTA
  'admin.materials.linkFirst': 'Link a student first, in the "🎓 Students" tab, to be able to send support material to them.', // ALTA
  'admin.materials.titlePlaceholder': 'e.g. Passé composé summary', // ALTA
  'admin.materials.descPlaceholder': 'explanation, context of use...', // ALTA
  'admin.materials.send': 'Send material', // ALTA
  'admin.materials.sentN': '✓ Material sent to {n} students.', // ALTA
  'admin.materials.sent': '✓ Material sent.', // ALTA
  'teacherLogs.err.needOneField': 'Fill in at least one field (topic, homework, observations or free text).', // ALTA
  'teacherLogs.err.saveFailed': 'We couldn\'t save the record right now.', // ALTA
  'teacherMaterials.err.titleRequired': 'Enter a title for the material.', // ALTA
  'teacherMaterials.err.needContent': 'Fill in at least the description, a link or a file.', // ALTA
  'teacherMaterials.err.createFailed': 'We couldn\'t create the material right now.', // ALTA
  'teacherMaterials.err.saveFailed': 'We couldn\'t save right now.', // ALTA
  'teacherFlashcards.err.clozePinyinRequired': 'Enter the pinyin of the answer (it is what the student will type).', // ALTA
  'flashcardModel.tts.providerNotConfigured': 'Text-to-speech audio generation is not turned on on the server yet.', // ALTA
  'flashcardModel.tts.providerNotImplemented': 'Text-to-speech audio generation is not available yet.', // ALTA
  'flashcardModel.tts.providerError': 'The voice service couldn\'t generate the audio right now -- try again in a moment.', // ALTA
  'flashcardModel.tts.providerRateLimited': 'The voice service is overloaded -- try again in a few minutes.', // ALTA
  'flashcardModel.tts.monthlyQuotaExceeded': 'You\'ve reached the monthly limit of generated audio. Try again next month.', // ALTA
  'flashcardModel.tts.quotaCheckFailed': 'We couldn\'t check your audio limit right now -- try again in a moment.', // ALTA
  'flashcardModel.tts.unsupportedLanguage': 'This language doesn\'t have a voice for audio generation yet.', // ALTA
  'flashcardModel.tts.invalidVoice': 'Invalid voice for this language -- leave the "Voice" field blank to use the default voice.', // ALTA
  'flashcardModel.tts.rateLimited': 'Too many audio generations in a short time -- wait a few minutes and try again.', // ALTA
  'flashcardModel.tts.notAuthorized': 'You don\'t have permission to generate audio for this card.', // ALTA
  'flashcardModel.tts.invalidSession': 'Session expired -- log in again.', // ALTA
  'flashcardModel.tts.textTooLong': 'Text too long (maximum {max} characters).', // ALTA
  'flashcardModel.tts.missingText': 'Enter the text to synthesize.', // ALTA
  'flashcardModel.tts.missingLanguage': 'Choose the synthesis language.', // ALTA
  'flashcardModel.tts.uploadFailed': 'Audio generated, but it could not be saved -- try again.', // ALTA
  'admin.flashcards.hint.flip': 'Image and audio appear next to the front of the card. Note is a reminder just for you -- the student never sees it.', // ALTA
  'admin.flashcards.hint.mc': 'Image and audio appear next to the question, above the multiple-choice options. Note is a reminder just for you -- the student never sees it.', // ALTA
  'admin.flashcards.hint.cloze': 'Image and audio appear next to the sentence with the blank. Note is a reminder just for you -- the student never sees it.', // ALTA
  'admin.flashcards.cardType.normal': 'Normal', // ALTA
  'admin.flashcards.cardType.normalReversed': 'Normal with reverse', // ALTA
  'admin.flashcards.cardType.multipleChoice': 'Multiple choice', // ALTA
  'admin.flashcards.cardType.typeAnswer': 'Type the answer', // ALTA
  'admin.flashcards.cardType.cloze': 'Fill in the blank (Cloze)', // ALTA
  'admin.flashcards.badge.image': '🖼️ image', // ALTA
  'admin.flashcards.badge.audio': '🎧 audio', // ALTA
  'admin.flashcards.badge.mc': '🔤 multiple choice', // ALTA
  'admin.flashcards.badge.cloze': '📝 fill in the blank', // ALTA
  'admin.flashcards.edit.title': 'Edit card', // ALTA
  'admin.flashcards.edit.modeFlip': ' Normal flashcard', // ALTA
  'admin.flashcards.edit.modeMc': ' Multiple choice', // ALTA
  'admin.flashcards.edit.modeCloze': ' Fill in the blank', // ALTA
  'admin.flashcards.edit.question': 'Question/term', // ALTA
  'admin.flashcards.edit.mc1': 'Other options -- wrong option 1', // ALTA
  'admin.flashcards.edit.mc2': 'Wrong option 2 (optional)', // ALTA
  'admin.flashcards.edit.mc3': 'Wrong option 3 (optional)', // ALTA
  'admin.flashcards.edit.clozeSentence': 'Sentence with a blank (use ___ to mark the space)', // ALTA
  'admin.flashcards.edit.clozeAnswer': 'Correct answer', // ALTA
  'admin.flashcards.edit.clozePinyin': 'Answer pinyin', // ALTA
  'admin.flashcards.edit.image': 'Image', // ALTA
  'admin.flashcards.edit.hasOne': ' (it already has one -- choose a file only to replace it)', // ALTA
  'admin.flashcards.edit.ownAudio': 'Own audio', // ALTA
  'admin.flashcards.edit.hasOneAudio': ' (it already has one -- choose a file only to replace it)', // ALTA
  'admin.flashcards.edit.err.front': 'Enter the front.', // ALTA
  'admin.flashcards.edit.err.back': 'Enter the back.', // ALTA
  'admin.flashcards.edit.err.oneWrongOption': 'Enter at least 1 wrong option.', // ALTA
  'admin.flashcards.edit.err.oneBlank': 'The sentence must have exactly one space marked with ___.', // ALTA
  'admin.flashcards.edit.err.answer': 'Enter the correct answer.', // ALTA
  'admin.flashcards.edit.err.pinyin': 'Enter the answer pinyin.', // ALTA
  'admin.flashcards.edit.err.trans': 'Enter the translation.', // ALTA
  'admin.flashcards.native.privateNote': 'Note (private -- the student never sees it)', // ALTA
  'admin.flashcards.dest.rootDefault': 'Teacher cards (default)', // ALTA
  'admin.flashcards.dest.noDeck': '📂 <em>no Deck (card created before Decks)</em> · ', // ALTA
  'admin.flashcards.dest.deckFallback': 'Deck', // ALTA
  'admin.flashcards.dest.moveTitle': 'Move this card to another of this student\'s Decks', // ALTA
  'admin.flashcards.dest.moveTo': 'Move to…', // ALTA
  'admin.flashcards.dest.deleteTitle': 'Delete this Deck (empty)', // ALTA
  'admin.flashcards.dest.deleteDisabledTitle': 'You can only delete a Deck with no subdecks and no cards', // ALTA
  'admin.flashcards.dest.countCards': '({n} card(s)', // ALTA
  'admin.flashcards.dest.countSubdecks': ', {n} subdeck(s)', // ALTA
  'admin.flashcards.dest.treeTitle': 'Deck tree', // ALTA
  'admin.flashcards.dest.deleteConfirm': 'Delete the Deck "{name}"? It is empty.', // ALTA
  'admin.flashcards.dest.deleteFailed': 'We couldn\'t delete the Deck.', // ALTA
  'admin.flashcards.dest.deleted': '✓ Deck deleted.', // ALTA
  'admin.flashcards.dest.destAria': 'Destination Deck of {username}', // ALTA
  'admin.flashcards.dest.subnamePlaceholder': 'New subdeck name (inside the chosen Deck)', // ALTA
  'admin.flashcards.dest.newSub': '+ Subdeck', // ALTA
  'admin.flashcards.dest.treeAria': 'Deck tree of {username}', // ALTA
  'admin.flashcards.dest.subCreated': '✓ Subdeck created.', // ALTA
  'admin.flashcards.dest.pickStudent': 'Select at least one student to choose the destination Deck.', // ALTA
  'admin.flashcards.dest.preparing': 'Preparing the Decks…', // ALTA
  'admin.flashcards.row.previewTitle': 'Preview how the student will see it in Review', // ALTA
  'admin.flashcards.list.activeTitle': 'Active cards ({n})', // ALTA
  'admin.flashcards.list.emptyFor': 'No cards yet', // ALTA
  'admin.flashcards.move.notFound': 'Card not found.', // ALTA
  'admin.flashcards.move.failed': 'We couldn\'t move the card.', // ALTA
  'admin.flashcards.move.moved': '✓ Card moved.', // ALTA
  'admin.flashcards.delete.deleted': 'Card deleted.', // ALTA
  'admin.flashcards.linkFirst': 'Link a student first, in the "🎓 Students" tab, to be able to create flashcards for them.', // ALTA
  'admin.flashcards.pickStudentsHint': 'Select the students who will receive this card.', // ALTA
  'admin.flashcards.destTitle': 'Destination (each student\'s Deck)', // ALTA
  'admin.flashcards.destHint': 'Each student has their own Deck tree. By default the card goes to the student\'s "Teacher cards"; choose a subdeck if you want to organize it.', // ALTA
  'admin.flashcards.cardTitle': 'Card', // ALTA
  'admin.flashcards.needStudent': 'Select at least one student above to be able to create the card.', // ALTA
  'admin.flashcards.createdPartial': '✓ {ok} card(s) created; failed for: {failed}.', // ALTA
  'admin.flashcards.createdN': '✓ {n} cards created.', // ALTA
  'admin.flashcards.created': '✓ Card created.', // ALTA
  'admin.reports.status.novo': 'New', // ALTA
  'admin.reports.status.em_analise': 'In review', // ALTA
  'admin.reports.status.confirmado': 'Confirmed', // ALTA
  'admin.reports.status.em_desenvolvimento': 'In development', // ALTA
  'admin.reports.status.resolvido': 'Resolved', // ALTA
  'admin.reports.status.nao_reproduzido': 'Not reproduced', // ALTA
  'admin.reports.status.recusado': 'Declined', // ALTA
  'admin.reports.status.duplicado': 'Duplicate', // ALTA
  'admin.reports.priority.baixa': 'Low', // ALTA
  'admin.reports.priority.media': 'Medium', // ALTA
  'admin.reports.priority.alta': 'High', // ALTA
  'admin.reports.priority.critica': 'Critical', // ALTA
  'admin.reports.lang.frances': 'French', // ALTA
  'admin.reports.lang.mandarim': 'Chinese', // ALTA
  'admin.reports.screen.path': 'Study', // ALTA
  'admin.reports.screen.review': 'Review', // ALTA
  'admin.reports.screen.conjugaison': 'Conjugation', // ALTA
  'admin.reports.screen.challenges': 'Challenges', // ALTA
  'admin.reports.screen.dictation': 'Dictation', // ALTA
  'admin.reports.screen.profile': 'Profile', // ALTA
  'admin.reports.screen.progress': 'Progress', // ALTA
  'admin.reports.screen.goals': 'Goals', // ALTA
  'admin.reports.screen.leaderboard': 'Leaderboard', // ALTA
  'admin.reports.screen.settings': 'Settings', // ALTA
  'admin.reports.screen.admin_badges': 'Admin panel', // ALTA
  'admin.reports.reporter.loggedNoProfile': 'logged-in account (profile not found)', // ALTA
  'admin.reports.reporter.guest': 'guest', // MÉDIA
  'admin.reports.ctx.none': '(no additional context)', // ALTA
  'admin.reports.filter.allStatus': 'All statuses', // ALTA
  'admin.reports.filter.kindAll': 'Problems and suggestions', // ALTA
  'admin.reports.filter.kindProblems': 'Problems only', // ALTA
  'admin.reports.filter.kindSuggestions': 'Suggestions only', // ALTA
  'admin.reports.filter.allLanguages': 'All languages', // ALTA
  'admin.reports.row.details': 'View details', // ALTA
  'admin.reports.empty': 'No reports found with this filter.', // ALTA
  'admin.reports.title': '⚑ Bug reports and suggestions', // ALTA
  'admin.reports.hint': 'Sent through the ⚑ flag (top bar, user menu or inside exercises). Guests can report too -- reports with no account and no email appear as "guest".', // ALTA
  'admin.reports.detail.suggestion': '💡 Suggestion', // ALTA
  'admin.reports.detail.problem': '⚑ Problem', // ALTA
  'admin.reports.detail.notInformed': '(not provided)', // ALTA
  'admin.reports.detail.screenshotView': '📎 View attached screenshot', // ALTA
  'admin.reports.detail.screenshotNone': '(no screenshot attached)', // ALTA
  'admin.reports.reply.lastSentTo': 'Last reply sent on {date} to {email}:', // ALTA
  'admin.reports.reply.lastSent': 'Last reply sent on {date}:', // ALTA
  'admin.reports.reply.err.forbidden': 'Session without admin permission -- sign in again.', // ALTA
  'admin.reports.reply.err.report_not_found': 'This report was not found.', // ALTA
  'admin.reports.reply.err.no_email': 'No email associated with this report.', // ALTA
  'admin.reports.reply.err.email_not_configured': 'Email sending is not yet configured on the server (RESEND_API_KEY/RESEND_FROM_EMAIL).', // ALTA
  'admin.reports.reply.err.resend_failed': 'We couldn\'t send the email right now. Try again in a moment.', // ALTA
  'admin.reports.reply.err.missing_fields': 'Fill in the subject and message.', // ALTA
  'admin.reports.reply.err.generic': 'We couldn\'t send the reply right now.', // ALTA
  'admin.reports.toast.updated': '✓ Report updated.', // ALTA
  'admin.reports.reply.send': 'Send reply', // ALTA
  'admin.reports.toast.replySent': '✓ Reply sent to {to}.', // ALTA
  'admin.notifications.event.xp_earned': '⭐ XP earned', // ALTA
  'admin.notifications.event.achievement_unlocked': '🏅 Badge unlocked', // ALTA
  'admin.notifications.event.mission_completed': '🎯 Mission completed', // ALTA
  'admin.notifications.event.streak_completed': '🔥 Streak kept', // ALTA
  'admin.notifications.event.featured_badge_reminder': '🏅 Featured badge reminder', // ALTA
  'admin.notifications.event.user_inactive_1': '👋 Re-engagement -- 1 day inactive', // MÉDIA
  'admin.notifications.event.user_inactive_3': '👋 Re-engagement -- 3 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_5': '👋 Re-engagement -- 5 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_7': '👋 Re-engagement -- 7 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_9': '👋 Re-engagement -- 9 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_15': '👋 Re-engagement -- 15 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_20': '👋 Re-engagement -- 20 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_30': '👋 Re-engagement -- 30 days inactive', // MÉDIA
  'admin.notifications.hint.xp_earned': 'amount of XP earned', // ALTA
  'admin.notifications.hint.achievement_unlocked': 'badge name and emoji', // ALTA
  'admin.notifications.hint.mission_completed': 'text and icon of the completed Daily Mission', // ALTA
  'admin.notifications.hint.streak_completed': 'streak days', // ALTA
  'admin.notifications.hint.none': '(no placeholders)', // ALTA
  'admin.notifications.err.duplicate': 'An identical variant already exists (same event/channel/language/text).', // ALTA
  'admin.notifications.err.eventId': 'Give a valid event identifier (e.g. xp_earned).', // ALTA
  'admin.notifications.err.bodyRequired': 'Write the notification text.', // ALTA
  'admin.notifications.err.createFailed': 'We couldn\'t create it right now.', // ALTA
  'admin.notifications.channel.emailLower': 'email', // ALTA
  'admin.notifications.channel.inAppLower': 'in the app', // ALTA
  'admin.notifications.status.active': 'active', // ALTA
  'admin.notifications.status.inactive': 'disabled', // ALTA
  'admin.notifications.btn.deactivate': 'Disable', // ALTA
  'admin.notifications.btn.activate': 'Enable', // ALTA
  'admin.notifications.btn.edit': 'Edit', // ALTA
  'admin.notifications.btn.delete': 'Delete', // ALTA
  'admin.notifications.rule.title': '⭐ "XP earned" rule', // ALTA
  'admin.notifications.rule.hint': 'Controls when the XP notification fires -- not its text (that is in the variants below). Reviews of well-known words give very low XP on purpose; below the minimum, the notification is not even created.', // ALTA
  'admin.notifications.rule.minXp': 'Minimum XP to notify', // ALTA
  'admin.notifications.rule.minXpPh': 'e.g. 5 (0 or empty = no minimum)', // ALTA
  'admin.notifications.rule.cooldown': 'Minimum interval between notifications (minutes)', // ALTA
  'admin.notifications.rule.dailyCap': 'Maximum per day', // ALTA
  'admin.notifications.rule.save': 'Save rule', // ALTA
  'admin.notifications.new.title': 'New variant', // ALTA
  'admin.notifications.new.event': 'Event', // ALTA
  'admin.notifications.new.eventPh': 'e.g. xp_earned', // ALTA
  'admin.notifications.new.lang': 'App language', // ALTA
  'admin.notifications.new.langFr': '🇫🇷 French', // ALTA
  'admin.notifications.new.langZh': '🇨🇳 Chinese', // ALTA
  'admin.notifications.new.channel': 'Channel', // ALTA
  'admin.notifications.new.channelInApp': '📱 In the app', // ALTA
  'admin.notifications.new.channelEmail': '📧 Email', // ALTA
  'admin.notifications.new.hint': 'Push does not appear here -- it reuses the text of the "In the app" variant of the same event, with no pool of its own. In email, the title becomes the subject. Placeholders like {{amount}}/{{days}} are replaced with the real event data -- see the hint for each event above.', // ALTA
  'admin.notifications.new.titleLabel': 'Title (optional)', // ALTA
  'admin.notifications.new.titlePh': 'e.g. New achievement!', // ALTA
  'admin.notifications.new.icon': 'Emoji (optional)', // ALTA
  'admin.notifications.new.body': 'Text', // ALTA
  'admin.notifications.new.bodyPh': 'Hey, did you forget about me? 🥺', // ALTA
  'admin.notifications.new.create': 'Create variant', // ALTA
  'admin.notifications.empty': 'No variants created yet.', // ALTA
  'admin.notifications.toast.ruleSaved': '✓ Rule saved.', // ALTA
  'admin.notifications.toast.created': '✓ Variant created.', // ALTA
  'admin.notifications.toast.updated': '✓ Variant updated.', // ALTA
  'admin.notifications.confirm.delete': 'Delete this notification variant?', // ALTA
  'admin.badges.err.idShort': 'Badge ID must have at least 2 characters (lowercase letters, numbers or _).', // ALTA
  'admin.badges.err.name': 'Give the badge a name.', // ALTA
  'admin.badges.err.icon': 'Choose an emoji for the badge.', // ALTA
  'admin.badges.err.idExists': 'A badge with the id "{id}" already exists.', // ALTA
  'admin.badges.err.createFailed': 'We couldn\'t create the badge right now.', // ALTA
  'admin.badges.err.idChangeFailed': 'We couldn\'t change the id right now.', // ALTA
  'admin.badges.err.migrateFailed': 'The new badge was created, but the old grants couldn\'t be migrated. Try again.', // ALTA
  'admin.badges.err.alreadyHas': '@{username} already has this badge.', // ALTA
  'admin.badges.err.grantFailed': 'We couldn\'t grant it right now.', // ALTA
  'admin.badges.grant.createFirst': 'Create a badge first', // ALTA
  'admin.badges.builtin.auto': 'automatic, not editable here', // ALTA
  'admin.badges.members': { one: '{n} person', other: '{n} people' }, // ALTA
  'admin.badges.catalog.clickManage': 'click to manage', // ALTA
  'admin.badges.catalog.editTitle': 'Edit badge', // ALTA
  'admin.badges.catalog.deleteTitle': 'Delete badge (and all its grants)', // ALTA
  'admin.badges.catalog.empty': 'No badges created yet.', // ALTA
  'admin.badges.grants.grantedOn': 'granted on {date}', // ALTA
  'admin.badges.grants.revoke': 'Revoke', // ALTA
  'admin.badges.grants.empty': 'No badges granted yet.', // ALTA
  'admin.badges.create.title': 'Create new badge', // ALTA
  'admin.badges.create.id': 'ID (lowercase letters/numbers/_ only)', // ALTA
  'admin.badges.create.idPh': 'e.g. contributor', // ALTA
  'admin.badges.create.name': 'Name', // ALTA
  'admin.badges.create.namePh': 'e.g. Contributor', // ALTA
  'admin.badges.create.icon': 'Emoji', // ALTA
  'admin.badges.create.descPh': 'e.g. Helped suggest improvements to the app', // ALTA
  'admin.badges.create.btn': 'Create badge', // ALTA
  'admin.badges.grant.title': 'Grant badge', // ALTA
  'admin.badges.grant.badge': 'Badge', // ALTA
  'admin.badges.grant.username': '@username of the recipient', // ALTA
  'admin.badges.grant.usernamePh': 'username', // ALTA
  'admin.badges.grant.note': 'Note (optional, only for you)', // ALTA
  'admin.badges.grant.notePh': 'e.g. reported the streak bug', // ALTA
  'admin.badges.grant.btn': 'Grant', // ALTA
  'admin.badges.builtin.title': 'Automatic badges', // ALTA
  'admin.badges.catalog.title': 'Catalog (created by you)', // ALTA
  'admin.badges.grants.title': 'Current grants', // ALTA
  'admin.badges.toast.created': '✓ Badge "{name}" created.', // ALTA
  'admin.badges.grant.createBefore': 'Create a badge before granting.', // ALTA
  'admin.badges.toast.granted': '✓ Badge granted to @{username}.', // ALTA
  'admin.badges.confirm.delete': 'Delete this badge and all its grants?', // ALTA
  'admin.badges.manage.empty': 'Nobody has created a profile yet.', // ALTA
  'admin.badges.manage.notePh': 'note', // ALTA
  'admin.badges.toast.members': '✓ Badge members updated.', // ALTA
  'admin.badges.toast.updated': '✓ Badge "{name}" updated.', // ALTA
  'admin.analytics.tab.path': '🗺️ Trail', // ALTA
  'admin.analytics.tab.review': '🔁 Review', // ALTA
  'admin.analytics.tab.conjugaison': '📝 Conjugation', // ALTA
  'admin.analytics.tab.dictation': '🎧 Dictations', // ALTA
  'admin.analytics.tab.challenges': '🎯 Challenges', // ALTA
  'admin.analytics.tab.leaderboard': '🏆 Leaderboard', // ALTA
  'admin.analytics.tab.profile': '👤 My profile', // ALTA
  'admin.analytics.tab.progress': '📈 Progress', // ALTA
  'admin.analytics.tab.settings': '⚙️ Settings', // ALTA
  'admin.analytics.tab.admin_badges': '🛠️ Admin panel', // ALTA
  'admin.analytics.lesson.vocab_lesson': '📘 Vocabulary lesson', // ALTA
  'admin.analytics.lesson.unit_checkpoint': '✅ Unit checkpoint', // ALTA
  'admin.analytics.lesson.flashcard_review': '🔁 Flashcard session', // ALTA
  'admin.analytics.lesson.speed_review': '⚡ Speed review', // ALTA
  'admin.analytics.lesson.match_game': '🧩 Memory game', // ALTA
  'admin.analytics.lesson.hanzi_lesson': '汉 Hanzi lesson', // ALTA
  'admin.analytics.lesson.hanzi_review': '汉 Hanzi review', // ALTA
  'admin.analytics.lesson.dictation': '🎧 Dictation', // ALTA
  'admin.analytics.lesson.conjugation_session': '📝 Conjugation session', // ALTA
  'admin.analytics.lesson.challenge': '🎯 Challenge completed', // ALTA
  'admin.analytics.device.mobile': '📱 Mobile', // ALTA
  'admin.analytics.techErr.js_error': '🐞 JavaScript error', // ALTA
  'admin.analytics.techErr.unhandled_rejection': '🐞 Unhandled promise rejection', // ALTA
  'admin.analytics.techErr.audio_load_failed': '🔇 Audio failed to load', // ALTA
  'admin.analytics.techErr.audio_play_failed': '🔇 Audio failed to play (manual click)', // ALTA
  'admin.analytics.techErr.save_failed': '💾 Failed to save progress', // ALTA
  'admin.analytics.period.today': 'Today', // ALTA
  'admin.analytics.period.yesterday': 'Yesterday', // ALTA
  'admin.analytics.period.last7': 'Last 7 days', // ALTA
  'admin.analytics.period.last30': 'Last 30 days', // ALTA
  'admin.analytics.period.thisMonth': 'This month', // ALTA
  'admin.analytics.period.lastMonth': 'Last month', // ALTA
  'admin.analytics.period.last90': 'Last 90 days', // ALTA
  'admin.analytics.period.custom': 'Custom', // ALTA
  'admin.analytics.levelUnknown': 'Unknown level', // ALTA
  'admin.analytics.unknown': 'unknown', // ALTA
  'admin.analytics.freq.1': '1 day', // ALTA
  'admin.analytics.freq.2_4': '2–4 days', // ALTA
  'admin.analytics.freq.5_9': '5–9 days', // ALTA
  'admin.analytics.freq.10': '10+ days', // ALTA
  'admin.analytics.delta.new': 'new', // ALTA
  'admin.analytics.students': { one: '{n} student', other: '{n} students' }, // ALTA
  'admin.analytics.noData': 'No data in the selected period.', // ALTA
  'admin.analytics.compareWith': 'comparing with {since} – {until}', // ALTA
  'admin.analytics.filter.period': 'Period', // ALTA
  'admin.analytics.filter.device': 'Device', // ALTA
  'admin.analytics.filter.allDevices': 'All devices', // ALTA
  'admin.analytics.filter.compare': 'Compare with previous period', // ALTA
  'admin.analytics.filter.periodLine': 'Period: {range}', // ALTA
  'admin.analytics.exclude.toastOn': '✓ Your activity will no longer be recorded in Analytics.', // ALTA
  'admin.analytics.exclude.toastOff': '✓ Your activity will now be recorded in Analytics (marked as admin).', // ALTA
  'admin.mode.toastOn': '🔒 Admin Mode on — admin privileges restored.', // ALTA
  'admin.mode.toastOff': '🔒 Admin Mode off — browsing as a regular student.', // ALTA
  'admin.analytics.exclude.title': 'Exclude my activity from Analytics', // ALTA
  'admin.analytics.exclude.sub': 'Your browsing and lessons as admin are not counted in student metrics. Turn it off only if you want to generate test data on purpose, using your own account.', // ALTA
  'admin.mode.title': 'Admin Mode', // ALTA
  'admin.mode.sub': 'When off, your account browses and completes lessons exactly like a regular student (while still recognized as admin) -- useful to test the real experience without admin shortcuts. Same control as the 🔒 Admin pill on the main screen.', // ALTA
  'admin.analytics.noEvents': 'No student events recorded in the selected period.', // ALTA
  'admin.analytics.subtab.resumo': 'Summary', // ALTA
  'admin.analytics.subtab.atividade': 'Activity', // ALTA
  'admin.analytics.subtab.retencao': 'Retention', // ALTA
  'admin.analytics.subtab.navegacao': 'Navigation', // ALTA
  'admin.analytics.subtab.exercicios': 'Exercises', // ALTA
  'admin.analytics.subtab.progressao': 'Progression', // ALTA
  'admin.analytics.subtab.engajamento': 'Engagement', // ALTA
  'admin.analytics.subtab.idioma': 'Language', // ALTA
  'admin.analytics.subtab.dispositivos': 'Devices', // ALTA
  'admin.analytics.subtab.tecnologia': 'Technology', // ALTA
  'admin.analytics.subnav.aria': 'Analytics section', // ALTA
  'admin.analytics.resumo.rateNA': 'Completion rate unavailable: nobody started an exercise of the types counted here (flashcards, speed review, memory game, hanzi, dictation, conjugation) in this period.', // ALTA
  'admin.analytics.resumo.rateNote': 'The completion rate only uses exercises that have a recorded "start" (flashcards, speed review, memory game, hanzi, dictation, conjugation). Vocabulary lessons and unit checkpoints are not part of this calculation because we only know when they end, not when they start -- that is why "Exercises completed" (above) is larger than "Exercises started": it adds up ALL types, those with a start and those without. To see each type separately, check the Exercises tab.', // ALTA
  'admin.analytics.kpi.activeStudents': 'Active students', // ALTA
  'admin.analytics.kpi.activeStudentsNote': 'different students who used the app in the period', // ALTA
  'admin.analytics.kpi.newStudents': 'New students', // ALTA
  'admin.analytics.kpi.newStudentsNote': 'accounts created within the period', // ALTA
  'admin.analytics.kpi.sessions': 'Sessions', // ALTA
  'admin.analytics.kpi.sessionsNote': 'each visit to the app counts as 1 session (the same student opening it 3 times a day = 3 sessions)', // ALTA
  'admin.analytics.kpi.started': 'Exercises started', // ALTA
  'admin.analytics.kpi.startedNote': 'only the types that record when the student starts (see note below)', // ALTA
  'admin.analytics.kpi.completed': 'Exercises completed', // ALTA
  'admin.analytics.kpi.completedNote': 'any type of exercise or lesson finished', // ALTA
  'admin.analytics.kpi.rate': 'Completion rate', // ALTA
  'admin.analytics.kpi.rateNote': 'of those who started an exercise, what % finished', // ALTA
  'admin.analytics.kpi.time': 'Study time (estimated)', // ALTA
  'admin.analytics.kpi.timeNote': 'rough estimate, not the actual time spent -- see note below', // ALTA
  'admin.analytics.resumo.timeNote': '"Study time" is an approximation: for each session, we measure from the first to the last recorded event and add everything up. If a student stays idle in the middle (e.g. leaves to do something else and comes back), that idle time is also counted -- it is not an active-use stopwatch.', // ALTA
  'admin.analytics.resumo.xpNote': 'Want to see total XP and streak? That is in the Engagement tab, not here in the Summary.', // ALTA
  'admin.analytics.ativ.newActive': 'New (active in the period)', // ALTA
  'admin.analytics.ativ.returning': 'Returning', // ALTA
  'admin.analytics.ativ.note': '"New" = account created within the selected period (via profiles.created_at); "returning" = already existed before that. See limitations about accounts created before automatic profile creation.', // ALTA
  'admin.analytics.ativ.activeByDay': 'Active students per day', // ALTA
  'admin.analytics.ativ.sessionsByDay': 'Sessions per day', // ALTA
  'admin.analytics.ativ.frequency': 'Study frequency (active days in the period)', // ALTA
  'admin.analytics.nav.areas': 'Areas (tabs)', // ALTA
  'admin.analytics.nav.features': 'Features (exercise types)', // ALTA
  'admin.analytics.nav.featuresNote': 'Counts start + completion together (total use), not just completions.', // ALTA
  'admin.analytics.ex.col.exercise': 'Exercise', // ALTA
  'admin.analytics.ex.col.started': 'Start.', // ALTA
  'admin.analytics.ex.col.done': 'Done', // ALTA
  'admin.analytics.ex.col.rate': 'Rate', // ALTA
  'admin.analytics.ex.col.score': 'Score', // ALTA
  'admin.analytics.ex.byType': 'Exercises by type', // ALTA
  'admin.analytics.ex.note': '"—" = no start event (vocab_lesson/unit_checkpoint/challenge) or no score concept for that type. Popularity (completed) and performance (average score) are separate columns on purpose -- a heavily done exercise is not necessarily an exercise with a high score.', // ALTA
  'admin.analytics.funnel.started': 'Started', // ALTA
  'admin.analytics.funnel.completed': 'Completed', // ALTA
  'admin.analytics.funnel.goodScore': 'Scored well ✓', // ALTA
  'admin.analytics.funnel.avgScore': 'Average score', // ALTA
  'admin.analytics.funnel.title': 'Funnel: started → completed → scored well', // ALTA
  'admin.analytics.funnel.note': 'Only types with a start event enter the funnel (same limitation as the overall completion rate). "Answered" (per individual question) does not exist as an event -- the funnel goes straight from "started" to "completed". "Scored well" = average score ≥ 80%, same cutoff as the "Score over 80%" challenge.', // ALTA
  'admin.analytics.funnel.empty': 'No type with a start event had activity in the period.', // ALTA
  'admin.analytics.lang.events': 'Events by language', // ALTA
  'admin.analytics.lang.filterActive': 'Language filter active ({lang}) -- to compare languages side by side, select "All languages" in the filter above.', // ALTA
  'admin.analytics.lang.note': 'Segmentation by level/feature/exercise/cohort/user type already exists in the Progression, Exercises and Retention tabs and in the "Exclude my activity" toggle -- not repeated here as global filters to avoid meaningless combinations (e.g. level does not apply to a "tab_switch").', // ALTA
  'admin.analytics.prog.byLevel': 'Students by level', // ALTA
  'admin.analytics.prog.levelNote': 'Only covers units of the app language in which this Panel is open now -- events from the other language fall under "Unknown level" (each site only loads its own language content).', // ALTA
  'admin.analytics.prog.units': 'Units completed per student (checkpoints)', // ALTA
  'admin.analytics.prog.unitsNote': 'Not every unit has internal lessons (e.g. grammar units in French) -- those count as a single block of exercises, and completing them generates a checkpoint with no matching "lesson completed". Units with lessons only generate the checkpoint after going through all of them. That is why a student can appear here with more completed units than completed lessons.', // ALTA
  'admin.analytics.prog.lessons': 'Lessons completed per student', // ALTA
  'admin.analytics.prog.lessonsNote': '"Level advancement" (speed of progression between levels over time) is left for a future stage -- it would require tracking the same account across several periods, not just one slice.', // ALTA
  'admin.analytics.dev.noData': 'All events in the period are from before device collection existed (migration 009) -- that is why they fall under "unknown". New data is already classified.', // ALTA
  'admin.analytics.dev.type': 'Device type', // ALTA
  'admin.analytics.dev.browser': 'Browser', // ALTA
  'admin.analytics.dev.os': 'Operating system', // ALTA
  'admin.analytics.dev.osNote': 'Classification by navigator.userAgent (simple heuristic, no library) -- not 100% accurate, but it is the acceptable standard without third-party telemetry.', // ALTA
  'admin.analytics.eng.perSession': 'Exercises/session', // ALTA
  'admin.analytics.eng.reviewsDone': 'Reviews completed', // ALTA
  'admin.analytics.eng.challengesDone': 'Challenges completed', // ALTA
  'admin.analytics.eng.freqNote': 'Study frequency (active days per student) is already in the Activity tab -- not repeated here.', // ALTA
  'admin.analytics.eng.gamification': 'Gamification', // ALTA
  'admin.analytics.eng.xpTotal': 'Total XP (current week)', // ALTA
  'admin.analytics.eng.xpAvg': 'Average XP/student (current week)', // ALTA
  'admin.analytics.eng.streakAvg': 'Average streak (days)', // ALTA
  'admin.analytics.eng.streakNote': 'proxy calculated from events', // ALTA
  'admin.analytics.eng.streakMax': 'Longest streak (days)', // ALTA
  'admin.analytics.eng.badges': 'Achievements granted', // ALTA
  'admin.analytics.eng.leaderboardViews': 'Leaderboard views', // ALTA
  'admin.analytics.eng.badgedStudents': { one: '{n} student received', other: '{n} students received' }, // ALTA
  'admin.analytics.eng.xpNote2': 'Streak is an approximation calculated from the days with recorded activity, not the app\'s "official" streak (which has its own rules such as rest days and lives outside the reach of this panel).', // ALTA
  'admin.analytics.eng.badgedSuffix': 'at least one achievement in the period.', // ALTA
  'admin.analytics.eng.xpNote1': 'XP uses the same week (Monday to Sunday) already shown in the Leaderboard -- it is not "XP earned in the period selected above", it is always the current week. "Average XP/student" divides by the total of active students in the period (not just those who already earned XP this specific week) -- an active student with no XP this week still counts, with 0.', // ALTA
  'admin.analytics.tech.errors': 'Errors and failures', // ALTA
  'admin.analytics.tech.total': 'Recorded errors', // ALTA
  'admin.analytics.tech.affected': 'Affected students', // ALTA
  'admin.analytics.tech.noErrors': 'No technical errors recorded in the period.', // ALTA
  'admin.analytics.tech.note': 'Covers JavaScript errors, rejected promises, audio load/play failures and progress save failures -- all deduplicated per session (a repeating error does not inflate the count). There is no video category: the app has no video content.', // ALTA
  'admin.analytics.tech.perf': 'Performance', // ALTA
  'admin.analytics.tech.loadAvg': 'Average load time', // ALTA
  'admin.analytics.tech.loadMedian': 'Median load time', // ALTA
  'admin.analytics.tech.samples': { one: '{n} session measured (Navigation Timing API, one record per page load).', other: '{n} sessions measured (Navigation Timing API, one record per page load).' }, // ALTA
  'admin.analytics.tech.noPerf': 'No performance measurements in the period.', // ALTA
  'admin.analytics.tech.separateNote': 'This tab is conceptually separate from Learning/Product -- it never adds technical errors together with completion rate, average score, etc. A low TECHNICAL score here does not mean the content is hard, and the opposite also holds.', // ALTA
  'admin.analytics.ret.empty': 'No accounts found to build cohorts.', // ALTA
  'admin.analytics.ret.title': 'Retention by cohort (signup week)', // ALTA
  'admin.analytics.ret.col.cohort': 'Cohort', // ALTA
  'admin.analytics.ret.col.d1': 'Day 1', // ALTA
  'admin.analytics.ret.col.d7': 'Day 7', // ALTA
  'admin.analytics.ret.col.d14': 'Day 14', // ALTA
  'admin.analytics.ret.col.d30': 'Day 30', // ALTA
  'admin.analytics.ret.note': 'Cohort = students whose account was created in the same week (Monday to Sunday). "Day N" = had at least one recorded activity on the calendar day that falls exactly N days after account creation -- "—" when the cohort has not yet completed that number of days (never shown as 0%). Uses the full available history (up to the 5000 most recent events), not the period filter in the controls above -- retention is a question about all time, not a window.', // ALTA
  'adminChallenges.import.invalidJson': 'Invalid JSON: ', // ALTA
  'adminChallenges.import.expectedArray': 'Expected an array of challenges, or an object with "accepted" (direct pipeline output).', // ALTA
  'adminChallenges.import.itemN': 'item #{n}', // ALTA
  'adminChallenges.import.missing': '{label}: missing id/type/level', // ALTA
  'adminChallenges.import.badType': '{id}: invalid type ("{type}")', // ALTA
  'adminChallenges.import.badLevel': '{id}: invalid level ("{level}")', // ALTA
  'adminChallenges.import.dupId': '{id}: id already exists (duplicate)', // ALTA
  'adminChallenges.persist.failed': 'Could not save to the database: ', // ALTA
  'adminChallenges.import.importing': 'Importing…', // ALTA
  'adminChallenges.import.btn': 'Import', // ALTA
  'adminChallenges.import.dbFail': '❌ Failed to write to the database: {error}', // ALTA
  'adminChallenges.import.ok': '✅ {n} challenge(s) imported as pending review.', // ALTA
  'adminChallenges.import.skipped': '⚠ {n} skipped:', // ALTA
  'adminChallenges.audio.target': 'Target expression audio', // ALTA
  'adminChallenges.audio.ex1': 'Audio of Exemple 1', // ALTA
  'adminChallenges.audio.ex2': 'Audio of Exemple 2', // ALTA
  'adminChallenges.audio.sentence': 'Sentence audio', // ALTA
  'adminChallenges.audio.word': 'Word audio', // ALTA
  'adminChallenges.qa.audioMissing': '{label}: missing', // ALTA
  'adminChallenges.qa.audioStale': '{label}: outdated (text changed after the audio was generated)', // ALTA
  'adminChallenges.qa.audioOk': '{label}: available and up to date', // ALTA
  'adminChallenges.qa.correctSet': 'Correct answer set', // ALTA
  'adminChallenges.qa.fourOptions': '4 options', // ALTA
  'adminChallenges.qa.explanationFilled': 'Explanation filled in', // ALTA
  'adminChallenges.qa.microValid': 'Valid micro-activity', // ALTA
  'adminChallenges.qa.sentenceFilled': 'Sentence filled in', // ALTA
  'adminChallenges.qa.hintFilled': 'Hint filled in', // ALTA
  'adminChallenges.qa.oneTranslation': 'At least 1 accepted translation', // ALTA
  'adminChallenges.qa.wordFilled': 'Word/expression filled in', // ALTA
  'adminChallenges.qa.title': 'Quality control', // ALTA
  'adminChallenges.qa.loadingDuration': 'loading duration…', // ALTA
  'adminChallenges.qa.loadFail': '· could not load', // ALTA
  'adminChallenges.res.dictionary': 'Dictionary', // ALTA
  'adminChallenges.res.article': 'Linguistics article', // ALTA
  'adminChallenges.res.youtube': 'Video', // ALTA
  'adminChallenges.res.youglish': 'Authentic examples', // ALTA
  'adminChallenges.res.qHigh': 'High', // ALTA
  'adminChallenges.res.qMedium': 'Medium', // ALTA
  'adminChallenges.res.qLow': 'Low', // ALTA
  'adminChallenges.res.type': 'Type: {type}', // ALTA
  'adminChallenges.res.quality': 'Quality: {quality}', // ALTA
  'adminChallenges.res.checked': 'Link checked on {date}', // ALTA
  'adminChallenges.res.unchecked': 'Link not checked automatically — check before approving', // ALTA
  'adminChallenges.res.open': 'Open', // ALTA
  'adminChallenges.res.approve': '✅ Approve', // ALTA
  'adminChallenges.btn.reject': '❌ Reject', // ALTA
  'adminChallenges.res.none': 'No external resources found', // ALTA
  'adminChallenges.view.audioAvailable': '🔊 available', // ALTA
  'adminChallenges.view.absent': 'missing', // ALTA
  'adminChallenges.view.targetAudioNote': 'this is the audio played at the start of the challenge, not the contextual example', // ALTA
  'adminChallenges.view.example': 'Example (written context, no automatic audio)', // ALTA
  'adminChallenges.view.question': 'Question', // ALTA
  'adminChallenges.view.secondExample': '2nd example', // ALTA
  'adminChallenges.view.noAudio': '(no audio)', // ALTA
  'adminChallenges.view.micro': 'Micro-activity', // ALTA
  'adminChallenges.view.resources': 'Resources found (Pour aller plus loin)', // ALTA
  'adminChallenges.view.sentenceFr': 'Sentence (French)', // ALTA
  'adminChallenges.view.hint': 'Hint (cloze)', // ALTA
  'adminChallenges.view.translations': 'Accepted translations', // ALTA
  'adminChallenges.view.word': 'Word/expression', // ALTA
  'adminChallenges.edit.example': 'Example', // ALTA
  'adminChallenges.edit.options': 'Options (one per line — mark the correct one with * at the start)', // ALTA
  'adminChallenges.edit.microPrompt': 'Micro-activity — sentence', // ALTA
  'adminChallenges.edit.microAnswer': 'Micro-activity — answer', // ALTA
  'adminChallenges.edit.exampleHint': 'Editing the text of an example does not regenerate the audio automatically — let me know if any audio needs to be redone.', // ALTA
  'adminChallenges.edit.hint': 'Hint (cloze, with ______ for the hidden part)', // ALTA
  'adminChallenges.edit.translations': 'Accepted translations (one per line, the first is the "expected answer" shown in the feedback)', // ALTA
  'adminChallenges.edit.sentenceHint': 'Editing the sentence does not regenerate the audio automatically — let me know if it needs to be redone.', // ALTA
  'adminChallenges.edit.word': 'Word/expression (with correct accents)', // ALTA
  'adminChallenges.edit.wordHint': 'Editing the word does not regenerate the audio automatically — let me know if it needs to be redone.', // ALTA
  'adminChallenges.card.accentTitle': '✍️ Accent — {word}', // ALTA
  'adminChallenges.approve.blocked': 'Cannot approve — fix first:', // ALTA
  'adminChallenges.approve.warnings': 'Attention, I found possible problems:', // ALTA
  'adminChallenges.approve.anyway': 'Approve anyway?', // ALTA
  'adminChallenges.toast.published': 'Challenge published — now visible to students.', // ALTA
  'adminChallenges.toast.unpublished': 'Challenge unpublished — no longer shown to students.', // ALTA
  'adminChallenges.preview.label': '🔍 Preview — student version', // ALTA
  'adminChallenges.preview.showAnswer': 'Show expected answer', // ALTA
  'adminChallenges.preview.backToEdit': '← Back to editing', // ALTA
  'adminChallenges.preview.approve': '✅ Approve challenge', // ALTA
  'adminChallenges.preview.expected': 'Expected answer: ', // ALTA
  'adminChallenges.btn.save': '💾 Save', // ALTA
  'adminChallenges.btn.preview': '👁️ View student version', // ALTA
  'adminChallenges.btn.edit': '✏️ Edit', // ALTA
  'adminChallenges.btn.unpublish': '🚫 Unpublish', // ALTA
  'adminChallenges.btn.approvePublish': '✅ Approve and publish', // ALTA
  'adminChallenges.bulk.checkboxAria': 'Select for bulk approval', // ALTA
  'adminChallenges.filter.searchPh': 'Search by expression, sentence, word...', // ALTA
  'adminChallenges.filter.allTypes': 'All categories', // ALTA
  'adminChallenges.filter.allLevels': 'All levels', // ALTA
  'adminChallenges.section.loadMore': 'Load {n} more ({remaining} remaining)', // ALTA
  'adminChallenges.bulk.selectAll': 'Select all ({n})', // ALTA
  'adminChallenges.bulk.approveSelected': '✅ Approve selected ({n})', // ALTA
  'adminChallenges.loadFailed': '⚠ We could not load the challenges right now. Check your connection and try again -- this does NOT mean the queue is empty.', // ALTA
  'adminChallenges.section.noResults': 'No results in this section with the current filter.', // ALTA
  'adminChallenges.section.pending': 'Pending review', // ALTA
  'adminChallenges.section.pendingEmpty': 'No challenges pending review.', // ALTA
  'adminChallenges.section.published': 'Published', // ALTA
  'adminChallenges.section.publishedEmpty': 'No challenges published yet.', // ALTA
  'adminChallenges.section.unpublished': 'Unpublished', // ALTA
  'adminChallenges.section.unpublishedEmpty': 'No unpublished challenges.', // ALTA
  'adminChallenges.bulk.confirm': 'Approve and publish {n} selected challenge(s)? Only those with no problem in the quality checklist are published automatically -- the rest stay pending for individual review.', // ALTA
  'adminChallenges.bulk.approving': 'Approving…', // ALTA
  'adminChallenges.bulk.published': '{published} challenge(s) published.', // ALTA
  'adminChallenges.bulk.publishedSkipped': '{published} published. {skipped} skipped because of a problem in the checklist -- review one by one: {list}', // ALTA
  'adminChallenges.confirm.unpublish': 'Unpublish this challenge? It stops being shown to students immediately.', // ALTA
  'adminChallenges.toast.rejected': 'Challenge rejected.', // ALTA
  'adminChallenges.toast.savedBackToReview': 'Edit saved — challenge went back to review (it was published/approved and needs to be approved again).', // ALTA
  'adminChallenges.toast.saved': 'Edit saved.', // ALTA
  'admin.panel.sub': 'Special badges and platform usage metrics.', // ALTA
  'admin.panel.aria': 'Admin panel section', // ALTA
  'admin.panel.tab.badges': '🎖️ Badges', // ALTA
  'admin.panel.tab.analytics': '📊 Analytics', // ALTA
  'admin.panel.tab.reports': '⚑ Reports', // ALTA
  'admin.mode.pillAria': 'Turn Admin Mode on/off', // ALTA
  'admin.mode.pillTitle': 'Admin Mode: OFF simulates the experience of a regular student', // ALTA
  'admin.mode.pillLabel': '🔒 Admin:', // ALTA
  'admin.modal.manageBadge.title': 'Manage badge', // ALTA
  'admin.modal.manageBadge.hint': 'Check who should have this badge. Unchecking removes it.', // ALTA
  'admin.modal.saveChanges': 'Save changes', // ALTA
  'admin.modal.editTemplate.title': 'Edit variant', // ALTA
  'admin.modal.report.title': 'Report', // ALTA
  'admin.modal.report.sentBy': 'Sent by', // ALTA
  'admin.modal.report.description': 'Description', // ALTA
  'admin.modal.report.expected': 'What the person expected', // ALTA
  'admin.modal.report.severity': 'Perceived severity', // ALTA
  'admin.modal.report.context': 'Context captured automatically', // ALTA
  'admin.modal.report.status': 'Status', // ALTA
  'admin.modal.report.priority': 'Technical priority', // ALTA
  'admin.modal.report.note': 'Internal note', // ALTA
  'admin.modal.report.subject': 'Subject', // ALTA
  'admin.modal.report.message': 'Message', // ALTA
  'admin.modal.report.priorityNone': '(not set)', // ALTA
  'admin.modal.report.notePh': 'Only the team sees this', // ALTA
  'admin.modal.report.replyByEmail': 'Reply by email', // ALTA
  'admin.modal.report.replyPh': 'Thank you for letting us know! ...', // ALTA
  'admin.modal.report.noEmail': 'No email associated with this report (guest who did not provide an email) -- it is not possible to reply.', // ALTA
  'adminChallenges.bar.import': '📥 Import JSON', // ALTA
  'adminChallenges.bar.review': '🛠️ Review pending (', // ALTA
  'adminChallenges.modal.title': 'Import challenges via JSON', // ALTA
  'admin.mode.on': 'ON', // ALTA
  'admin.mode.off': 'OFF', // ALTA
  'admin.panel.tab.students': '🎓 Students', // ALTA
  'admin.panel.tab.flashcards': '📇 Flashcards', // ALTA
  'admin.panel.tab.classlogs': '📝 Classes', // ALTA
  'admin.panel.tab.materials': '📚 Study materials', // ALTA
  'admin.panel.tab.premium': '⭐ Premium', // ALTA
  'admin.panel.tab.tags': '🏷️ Tags', // ALTA
  'flashcardPreview.modal.hint': 'This is only a preview of how the card will look in Review -- nothing is saved or graded here.', // ALTA
  'publicFlashcard.modal.title': '👁 Card', // ALTA
  'content.untranslatedNotice': 'This lesson isn\'t available in English yet. Showing Portuguese.', // ALTA
  'ui.skipLink': 'Skip to content', // ALTA
  'ui.path.sub': 'Units organized by communication goal. Complete one unit to unlock the next.', // ALTA
  'ui.review.whatNow': 'What should you do now?', // ALTA
  'ui.review.myCardsBtn': '📇 My Cards', // ALTA
  'ui.review.settingsBtn': '⚙️ Session settings', // ALTA
  'ui.review.frequency': 'Review frequency', // ALTA
  'ui.review.freq.frequent': 'More frequent (reviews sooner and more often)', // ALTA
  'ui.review.freq.spaced': 'More spaced out (longer intervals between reviews)', // ALTA
  'ui.review.newPerDay': 'New words per day', // ALTA
  'ui.review.newPerDay.0': '0 (none, just review what you\'ve already seen)', // ALTA
  'ui.review.newPerDay.5': '5 (slower pace)', // ALTA
  'ui.review.newPerDay.15': '15 (faster pace)', // ALTA
  'ui.review.newPerDay.20': '20 (very fast pace)', // ALTA
  'ui.review.newPerDay.unlimited': 'No limit (all pending at once)', // ALTA
  'ui.review.intensity': 'Session intensity', // ALTA
  'ui.review.intensity.light': 'Light (shorter sessions)', // ALTA
  'ui.review.intensity.intense': 'Intense (longer sessions)', // ALTA
  'ui.review.practiceHint': 'Keep practicing whenever you like, even with no reviews due.', // ALTA
  'ui.conj.sub': 'Choose the verb tenses and verb categories. You always practice all 6 persons.', // ALTA
  'ui.conj.topN': 'Number of verbs (most common first)', // ALTA
  'ui.conj.start': 'Start practice', // ALTA
  'ui.conj.backToSelect': '← Back to selection', // ALTA
  'ui.leaderboard.sub': 'Who earned the most XP this week, overall and by language.', // ALTA
  'ui.stats.title': 'Your progress', // ALTA
  'ui.stats.sub': 'Track your consistency and achievements.', // ALTA
  'ui.stats.dailyActivity': 'Daily activity', // ALTA
  'ui.stats.wordsOverTime': 'Words learned over time', // ALTA
  'ui.goal.sub': 'Set how many lessons a day you want to study.', // ALTA
  'ui.goal.title': 'My study goal', // ALTA
  'ui.myCards.title': '📇 My cards', // ALTA
  'ui.myCards.sub': 'Create your own flashcards -- words and phrases you want to memorize, even if they\'re not in the path.', // ALTA
  'ui.materials.sub': 'Summaries, links and files your teacher shared with you.', // ALTA
  'ui.dictation.sub': 'Train your listening and spelling with dictations based on real tasks from each module.', // ALTA
  'ui.dictation.step1': 'Listen to the audio -- at normal speed or slowly, as many times as you like.', // ALTA
  'ui.dictation.step2': 'Type exactly what you heard, with accents and punctuation.', // ALTA
  'ui.dictation.step3': 'Click "Verificar" to compare your answer with the original text.', // MÉDIA
  'ui.dictation.step4': 'See what you got right and what needs review, word by word.', // ALTA
  'ui.challenges.backToCategories': '← Back to categories', // ALTA
  'ui.profileEdit.username': 'Your public identifier (permanent)', // ALTA
  'ui.profileEdit.publicProfile': 'Public profile', // ALTA
  'ui.profileEdit.publicProfileSub': 'Makes your name, badges, progress and your own cards visible to anyone with your profile link.', // ALTA
  'ui.profileEdit.featuredBadge': 'Featured badge (shown in the Leaderboard)', // ALTA
  'ui.kbd.title': '⌨️ Keyboard shortcuts', // ALTA
  'ui.kbd.choose': 'Pick an option by its position on screen', // ALTA
  'ui.kbd.confirm': 'Confirm a typed answer and move on to the next one', // ALTA
  'ui.kbd.replay': 'Play audio again', // ALTA
  'ui.kbd.note': 'The numbers only appear when an exercise has options to choose from -- never during typing or the sentence-ordering exercise. "r" repeats the last audio that played on screen.', // ALTA
  'ui.streak.sub': 'Keep it up: your streak will reset if you don\'t study tomorrow.', // ALTA
  'ui.reviewReminder.title': 'Shall we do a quick review?', // ALTA
  'ui.notNow': 'Not now', // ALTA
  'ui.update.title': 'New version available', // ALTA
  'ui.update.body': 'We updated the app. Reload when it\'s convenient to see what\'s new.', // ALTA
  'ui.path.sub14': '14 units organized by communication goal. Complete one unit to unlock the next.', // ALTA
  'ui.zh.unitManualBtn': '📖 Unit manual', // ALTA
  'ui.zh.unitManualTitle': 'Unit manual', // ALTA
  'ui.zh.hanziBackToLessons': '← Back to lessons', // ALTA
  'ui.zh.radicalsSub': 'The building blocks of the characters you\'ve already studied, sorted by frequency.', // ALTA
  'ui.zh.strokeOrder': 'Stroke order', // ALTA
  'ui.moreOptions': 'More options', // ALTA
  'ui.kbd.ariaTitle': 'Keyboard shortcuts', // ALTA
  'ui.exitLesson': 'Exit lesson', // ALTA
  'ui.review.shortcutsAria': 'Review shortcuts', // ALTA
  'ui.profileEdit.namePh': 'What would you like to be called', // ALTA
  'ui.profileEdit.country': 'Country of origin', // ALTA
  'ui.profileEdit.countryHint': 'Used in the course examples (e.g. "I\'m Brazilian"). If you don\'t choose, we assume Brazil.', // ALTA
  'ui.profileEdit.countryNone': 'Prefer not to say (Brazil)', // ALTA
  'ui.profileEdit.gender': 'Gender', // MÉDIA
  'ui.profileEdit.genderHint': 'Private: only you can see it. Used to pick the right word form in the course examples (e.g. French "brésilien" or "brésilienne"). If you don\'t choose, we show both forms (brésilien·ne).', // MÉDIA
  'ui.profileEdit.genderNone': 'Not set', // ALTA
  'ui.profileEdit.gender.masculine': 'Masculine', // ALTA
  'ui.profileEdit.gender.feminine': 'Feminine', // ALTA
  'ui.profileEdit.gender.other': 'Other', // ALTA
  'ui.profileEdit.gender.undisclosed': 'Prefer not to say', // ALTA
  'ui.profileEdit.bioPh.fr': 'Tell us a little about yourself and why you\'re learning French', // ALTA
  'ui.profileEdit.bioPh.zh': 'Tell us a little about yourself and why you\'re learning Mandarin', // ALTA
  'ui.zh.searchAria': 'Search by pinyin, hanzi or translation', // ALTA
  'ui.zh.searchPh': 'Search by pinyin, hanzi or translation...', // ALTA
  'feedback.almostArrow': 'Almost! → {expected}', // ALTA
  'feedback.correctAnswerColon': 'Correct answer:', // ALTA
  'feedback.whereSeen': 'Where you saw this before', // ALTA
  'feedback.header.revealed': '👀 Answer revealed', // ALTA
  'feedback.header.notThisTime': '❌ Not this time', // ALTA
  'feedback.label.fullSentence': 'Full sentence', // ALTA
  'feedback.label.answer': 'Answer', // ALTA
  'feedback.label.whyNot': 'Why it wasn\'t this one', // ALTA
  'feedback.label.correctAnswer': 'Correct answer', // ALTA
  'feedback.tone.wrong': '🎯 Almost! That\'s not the right tone', // ALTA
  'feedback.tone.missing': '🎯 Almost! The tone is missing', // ALTA
  'feedback.praise.1': 'Bullseye!', // MÉDIA
  'feedback.praise.2': 'Nice one!', // MÉDIA
  'feedback.praise.3': 'That\'s it!', // MÉDIA
  'feedback.praise.4': 'Perfect!', // MÉDIA
  'feedback.praise.5': 'Well done!', // MÉDIA
  'feedback.praise.6': 'You nailed it!', // MÉDIA
  'feedback.praise.7': 'Exactly!', // MÉDIA
  'feedback.praise.8': 'Nice!', // MÉDIA
  'feedback.praise.9': 'Absolutely!', // MÉDIA
  'feedback.praise.10': 'There you go!', // MÉDIA
  'feedback.praise.11': 'Keep it up!', // MÉDIA
  'feedback.praise.12': 'Awesome!', // MÉDIA
  'feedback.praise.13': 'Exactly right!', // MÉDIA
  'feedback.praise.14': 'Excellent!', // MÉDIA
  'feedback.praise.15': 'Great work!', // MÉDIA
  'feedback.praise.16': 'Wonderful!', // MÉDIA
  'feedback.combo.1': 'You\'re doing great!', // MÉDIA
  'feedback.combo.2': 'So proud of you!', // MÉDIA
  'feedback.combo.3': 'Wonderful, keep it up!', // MÉDIA
  'feedback.combo.milestone': 'Wow, {n} in a row!', // ALTA
  'review.filter.hard': 'Hardest first', // ALTA
  'review.filter.oldest': 'Oldest first', // ALTA
  'level.tier.beginner': 'Beginner', // ALTA
  'level.tier.basic': 'Basic', // ALTA
  'fr.level.A1.text': 'Ask and answer simple questions and introduce yourself to other people', // ALTA
  'fr.level.A2.text': 'Take part in simple everyday conversations and talk about your studies', // ALTA
  'zh.level.HSK1.text': 'Greet people, introduce yourself and hold basic everyday conversations in Mandarin', // ALTA
  'fr.reminder.title': 'Time to study French! 🇫🇷', // ALTA
  'zh.hanzi.inPhrase': '(in the phrase: "{phrase}")', // ALTA
  'fr.challenges.loading': 'Loading challenges...', // ALTA
  'fr.challenges.loadFailedList': 'Couldn\'t load the challenges right now. Check your connection and try again.', // ALTA
  'fr.challenges.countInCategory': { one: '{n} challenge', other: '{n} challenges' }, // ALTA
  'fr.challenge.complete': '✅ Complete', // ALTA
  'fr.challenge.yourAnswerColon': 'Your answer:', // ALTA
  'fr.challenge.inPortuguese': 'In Portuguese:', // ALTA
  'fr.challenge.row.yourAnswer': 'Your answer', // ALTA
  'fr.challenge.row.expected': 'Expected answer', // ALTA
  'fr.challenge.row.original': 'Original sentence', // ALTA
  'fr.challenge.lt.label': 'Type your translation:', // ALTA
  'fr.challenge.lt.placeholder': 'Your translation in {lang}...', // ALTA
  'lang.name.pt-BR': 'Portuguese', // ALTA
  'lang.name.en': 'English', // ALTA
  'fr.challenge.accent.label': 'Type what you heard:', // ALTA
  'fr.challenge.inEnglish': 'In English:', // ALTA
  'nav.study': 'Study', // ALTA
  'nav.challenges': 'Challenges', // ALTA
  'nav.profile': 'Profile', // ALTA
  'side.streakDays': 'day streak', // ALTA

  // Fase 11: nomes/descrições de conquistas.
  'badge.first_step.name': 'First Step', // ALTA
  'badge.first_step.desc': 'Did your first review', // ALTA
  'badge.streak_3.name': '3 Days in a Row', // ALTA
  'badge.streak_3.desc': 'Studied 3 days in a row', // ALTA
  'badge.streak_7.name': 'One Week!', // ALTA
  'badge.streak_7.desc': 'Studied 7 days in a row', // ALTA
  'badge.unit_1.name': 'Unit 1 Complete', // ALTA
  'badge.unit_1.desc': 'Completed the first unit', // ALTA
  'badge.unit_half.name': 'Halfway There', // ALTA
  'badge.unit_half.desc': 'Completed half of level A1', // ALTA
  'badge.unit_all.name': 'Level A1 Complete', // ALTA
  'badge.unit_all.desc': 'Completed the whole of level A1', // ALTA
  'badge.xp_100.name': '100 XP', // ALTA
  'badge.xp_100.desc': 'Earned 100 XP', // ALTA
  'badge.xp_500.name': '500 XP', // ALTA
  'badge.xp_500.desc': 'Earned 500 XP', // ALTA
  'badge.reviews_100.name': '100 Reviews', // ALTA
  'badge.reviews_100.desc': 'Did 100 reviews', // ALTA
  'badge.explorer.name': 'Explorer', // ALTA
  'badge.explorer.desc': 'Used review, speed review and the memory game', // ALTA
  'badge.trained_ear.name': 'Trained Ear', // ALTA
  'badge.trained_ear.desc': 'Played audio 100 times', // ALTA
  'badge.comeback.name': 'Back in the Game', // ALTA
  'badge.comeback.desc': 'Picked the streak back up within 3 days', // ALTA
  'badge.multitasker.name': 'Multitasker', // ALTA
  'badge.multitasker.desc': 'Practiced 5 different exercise formats on the same day', // ALTA
  'badge.weekend.name': 'Weekend', // ALTA
  'badge.weekend.desc': 'Studied on Saturday and Sunday in the same week', // ALTA
  'badge.unit_7.name': 'Halfway There', // ALTA
  'badge.unit_7.desc': 'Completed half of HSK1', // ALTA
  'badge.unit_14.name': 'HSK 1 Complete', // ALTA
  'badge.unit_14.desc': 'Completed the whole of HSK1', // ALTA
  'badge.founder.name': 'Founder', // ALTA
  'badge.founder.desc': 'Creator of the platform', // ALTA
  'badge.beta_tester.name': 'Beta Tester', // ALTA
  'badge.beta_tester.desc': 'Helped test the app before the official launch', // ALTA
  'badge.catalog.ambassador.name': 'Ambassador', // MÉDIA
  'badge.catalog.ambassador.desc': 'Spread the word about the app to other people', // MÉDIA
  'badge.catalog.pioneer.name': 'Pioneer', // MÉDIA
  'badge.catalog.pioneer.desc': 'Among the first people to use the app in its early phase', // MÉDIA
  'badge.catalog.student.name': 'Prof. Brune\'s student', // MÉDIA
  'badge.catalog.student.desc': 'Prof. Brune\'s student', // MÉDIA

  // Erros de envio de mídia e topo do site.
  'media.noFile': 'No file selected.', // ALTA
  'media.emptyFile': 'Empty file.', // ALTA
  'media.audioTooBig': 'File larger than 5 MB. Choose a smaller audio file.', // ALTA
  'media.audioBadType': 'Audio format not supported. Use MP3, M4A/AAC, OGG, WAV or WEBM.', // ALTA
  'media.imageTooBig': 'Image larger than 5 MB. Choose a smaller image.', // ALTA
  'media.imageBadType': 'Image format not supported. Use JPG, PNG, WEBP or GIF.', // ALTA
  'media.urlEmpty': 'Paste the audio link.', // ALTA
  'media.urlTooLong': 'Link too long.', // ALTA
  'media.urlNeedsHttps': 'The link must start with https://.', // ALTA
  'brand.title.fr': 'French', // ALTA
  'brand.title.zh': 'Chinese', // ALTA
  'brand.byline': 'with Prof. Brune', // ALTA
};
