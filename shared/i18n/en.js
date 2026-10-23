// Catálogo EN-US (i18n, Etapa 2 -- piloto). Carregado sob demanda.
// Chave faltando aqui cai em pt-BR. Comentário ao lado = confiança
// (ALTA/MÉDIA/BAIXA, mesmo critério do piloto A1-1: sentido/registro).
window.I18N_CATALOG = window.I18N_CATALOG || {};
window.I18N_CATALOG['en'] = {
  'common.close': 'Close', // ALTA

  'report.entry.label': 'Report a problem', // ALTA
  'report.entry.menuItem': '⚑ Report a problem', // ALTA

  'report.modal.title': '⚑ Report a problem or suggestion', // ALTA
  'report.modal.intro': 'Tell us what happened. It helps us improve your experience.', // ALTA
  'report.category.bug_tecnico.desc': 'Something froze, showed an error or didn\'t load.', // ALTA
  'report.category.erro_conteudo.desc': 'Some information in the lesson is wrong or out of date.', // ALTA
  'report.category.traducao.desc': 'The translation of a word or sentence is wrong.', // ALTA
  'report.category.audio.desc': 'The audio is wrong, cut off or badly pronounced.', // ALTA
  'report.category.visual.desc': 'Something looks cut off, misaligned or hard to read.', // ALTA
  'report.category.comportamento_inesperado.desc': 'A button or feature did something unexpected.', // ALTA
  'report.category.sugestao_melhoria.desc': 'An idea to make the site even better.', // ALTA
  'report.category.outro.desc': 'Something other than the options above.', // ALTA
  'report.modal.describeHint': 'Tell us what happened and, if you can, the steps you were following.', // ALTA
  'report.modal.sendReport': 'Send report', // ALTA
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
  'report.modal.privacyNote': 'If attached, the screenshot is visible only to the team. Nothing is sent automatically.', // ALTA
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
  'report.error.duplicate': 'You just sent this a moment ago. Thank you!', // ALTA
  'report.error.sendFailed': "Couldn't send. Check your connection and try again.", // ALTA
  'report.toast.success': '✓ Report sent. Thanks for helping!', // ALTA

  'premium.challenges.title': '🔒 Premium feature', // ALTA
  'premium.challenges.bodyHtml': '<strong>Module Challenges</strong> reinforce each topic in the course with Expressions, Listen and Translate, Accents, and extra Dictations.', // MÉDIA -- nomes das categorias de desafio ainda não traduzidos na aba Desafios; alinhar quando ela for migrada
  'premium.challenges.howToActivate': 'They\'re part of the Premium plan. To ask for Premium, contact Prof. Brune using the button below.', // ALTA -- Etapa 1/5: aprovado pela dona

  'flashcardLimit.modal.title': '🔒 Free plan limit', // ALTA
  'flashcardLimit.modal.bodyHtml': 'You\'ve reached the limit of <strong>{limit} active cards of your own</strong> on your account, counting all courses. To create more, delete a card you no longer use or ask for Premium: with it, your own cards are unlimited.', // MÉDIA -- política Free; PT e EN falam em apagar, a ação que a interface oferece (🗑); arquivar saiu na CONSOLIDAÇÃO-3
  'premiumContact.button': 'Contact Prof. Brune', // ALTA -- Etapa 5
  'premiumContact.subject': 'I\'d like Premium ({course})', // ALTA -- Etapa 5
  'premiumContact.body': 'Hi, Prof. Brune!\n\nI\'d like to ask for Premium on my account.\n\nMy username: {username}\nCourse: {course}\n\nThank you!', // ALTA -- Etapa 5
  'premiumContact.noUsername': '(no username yet)', // ALTA -- Etapa 5
  'flashcardLimit.wouldGenerate': { one: 'This card would create {n} study card, but you only have {remaining} left on your account.', other: 'This card would create {n} study cards, but you only have {remaining} left on your account.' }, // MÉDIA -- política Free; plural real em EN e PT

  'flashcardReset.modal.title': '⚠️ Confirm edit', // ALTA
  'flashcardReset.modal.headline': 'This edit will reset this card\'s review progress.', // ALTA
  'flashcardReset.modal.explain': 'It shows up as a new card in Review again. You\'ll keep studying normally after saving.', // ALTA
  'flashcardReset.modal.keepTip': 'If you want to keep your current progress, discard the edits: the card stays as it is.', // ALTA
  'flashcardReset.modal.yes': 'Yes, continue', // ALTA
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
  'courses.group.pt-BR': 'Courses for Portuguese speakers', // ALTA
  'courses.group.en': 'Courses for English speakers', // ALTA
  'courseMenu.title': 'My courses', // ALTA
  'courseMenu.add': 'Add a course', // ALTA
  'courseMenu.speakLabel': 'Language you speak', // ALTA
  'courseMenu.speak.pt-BR': 'I speak Portuguese', // ALTA
  'courseMenu.speak.en': 'I speak English', // ALTA
  'courses.beta': 'beta', // ALTA
  'courses.confirm.title': 'Switch course?', // ALTA
  'courses.confirm.intro': 'You are about to switch to the course', // ALTA
  'courses.confirm.p1': 'It is a separate course with its own progress: if you have never studied in it, you start from zero.', // ALTA
  'courses.confirm.p2': 'Your progress in the current course stays saved and comes back when you return to it.', // ALTA
  'courses.confirm.p3': 'Your day streak and achievements stay the same.', // ALTA
  'courses.confirm.stay': 'Keep studying', // ALTA
  'courses.confirm.go': 'Go to {course}', // ALTA
  'courses.confirm.newTitle': 'Ready for a new journey?', // ALTA
  'courses.confirm.backTitle': 'Back to {course}?', // ALTA
  'courses.confirm.newIntro': 'You\'re about to start the course:', // ALTA
  'courses.confirm.backIntro': 'You\'re going back to the course:', // ALTA
  'courses.confirm.tagline': 'A new language, new possibilities.', // ALTA
  'courses.confirm.newP': 'Each course has its own journey. In {course}, progress is separate and you build it at your own pace.', // ALTA
  'courses.confirm.backP': 'Your progress in {course} picks up right where you left off.', // ALTA
  'courses.confirm.safeTitle': 'Your progress is safe.', // ALTA
  'courses.confirm.safeText': 'Your progress in the current course stays saved and comes back when you return to it.', // ALTA
  'courses.confirm.keepTitle': 'Your journey continues.', // ALTA
  'courses.confirm.start': 'Start {course}', // ALTA
  'courses.first.title': 'Which course do you want to start?', // ALTA
  'courses.first.sub': 'You can switch or add courses later from the flag at the top of the screen. Each course keeps its own progress.', // ALTA

  // Fase 6 lote 1
  'settings.title': 'Settings', // ALTA
  'settings.subtitle': 'Your account, preferences, and data export.', // ALTA
  'settings.tab.general': 'General', // ALTA
  'settings.tab.notifications': '🔔 Notifications', // ALTA
  'settings.tab.export': '📦 Export', // ALTA
  'settings.section.account': 'Account', // ALTA
  'accountDelete.title': 'Delete my account', // ALTA
  'accountDelete.hint': 'Deletes your account and everything linked to it: progress, flashcards, achievements, friendships, photos and files. This cannot be undone.', // ALTA
  'accountDelete.btn': 'Delete my account', // ALTA
  'accountDelete.modal.title': 'Delete your account?', // ALTA
  'accountDelete.modal.explain': 'This deletes your progress, your flashcards, the records your teacher keeps about you (lessons and flashcards), and your files. This cannot be undone. Help requests you sent will lose your email and any screenshots.', // ALTA
  'accountDelete.modal.label': 'Type your email to confirm', // ALTA
  'accountDelete.modal.cancel': 'Cancel', // ALTA
  'accountDelete.modal.yes': 'Delete forever', // ALTA
  'accountDelete.err.mismatch': 'The email does not match.', // ALTA
  'accountDelete.err.teacher': 'Teacher and administrator accounts cannot be deleted here. Please contact the administrator.', // ALTA
  'accountDelete.err.generic': 'We could not delete it right now. Please try again in a moment.', // ALTA
  'accountDelete.done': 'Account deleted. See you!', // ALTA
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
  'settings.export.unit': 'Unit', // ALTA
  'settings.export.allUnits': 'All units', // ALTA
  'settings.export.button': 'Generate .apkg file', // ALTA
  'settings.pref.cloze.subFr': 'Instead of choosing from options, type the missing word (Clozemaster style).', // ALTA
  'settings.export.descFr': 'The exported deck includes the French word/phrase (with audio you can set up in Anki) and its translation, using the same question/answer pair as in the app.', // MÉDIA
  'settings.aria.section': 'Settings section', // ALTA
  'menu.profile': '👤 My profile', // ALTA
  'menu.ranking': '🏆 Leaderboard', // MÉDIA
  'menu.supportMaterials': '📚 Study materials', // MÉDIA
  'menu.settings': '⚙️ Settings', // ALTA
  'menu.admin': '🛠️ Admin panel', // ALTA
  'sidebar.collapse': 'Collapse menu', // ALTA
  'sidebar.expand': 'Expand menu', // ALTA
  'sidebar.more': 'More', // ALTA
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
  'preview.toast.noEffect': '👁️ Preview: nothing was saved or graded.', // ALTA
  'preview.toast.reviewMore': '👁️ Preview: "Review more" has no effect here.', // MÉDIA
  'notif.time.now': 'now', // ALTA
  'notif.time.min': '{n}min', // ALTA
  'notif.time.hour': '{n}h', // ALTA
  'notif.time.day': '{n}d', // ALTA
  'notif.empty': 'No notifications yet. Keep studying! 📚', // ALTA
  'notif.group.today': 'Today', // ALTA
  'notif.group.yesterday': 'Yesterday', // ALTA
  'notif.group.earlier': 'Earlier', // ALTA
  'notif.unread': 'Unread', // ALTA
  'notif.markAll': 'Mark all as read', // ALTA
  'notif.markOne': 'Mark as read', // ALTA
  'notif.new': 'New', // ALTA
  'notif.cat.estudo': '📘 Study', // ALTA
  'notif.cat.revisao': '🔄 Review', // ALTA
  'notif.cat.streak': '🔥 Streak', // ALTA
  'notif.cat.gamificacao': '⭐ Achievements and XP', // ALTA
  'notif.cat.ranking': '🏆 Leaderboard', // MÉDIA
  'notif.cat.desafios': '🎯 Challenges', // ALTA
  'notif.cat.conteudo': '📚 What\'s new', // ALTA
  'notif.cat.reengajamento': '👋 Come-back reminders', // MÉDIA -- Etapa 4: aprovado pela dona
  'notif.cat.sistema': '⚙️ System', // ALTA
  'notif.cat.amigos': '👥 Friends', // ALTA
  'notif.pref.inAppOnly': 'Friends only has in-app notifications', // ALTA
  'notif.pref.noEmail': 'Friends has no email notifications', // ALTA
  'notif.pref.guest': 'Create an account to set up notifications. Guest mode does not save preferences.', // ALTA
  'notif.pref.loadFailed': 'Could not load your preferences right now.', // ALTA
  'notif.pref.sectionTitle': 'Notifications', // ALTA
  'notif.pref.inApp.title': 'In-app notifications', // ALTA
  'notif.pref.inApp.sub': 'Bell at the top of the screen and notification center. Turning this off silences everything at once. To adjust each category, use "Customize by category" below.', // ALTA
  'notif.pref.push.title': 'Browser alerts (push)', // ALTA
  'notif.pref.push.sub': 'Notifies you even when the app is closed. This switch handles the browser permission and turns everything on at once. To choose by category, use "Customize by category" below.', // MÉDIA
  'notif.pref.email.title': 'Emails', // ALTA
  'notif.pref.email.sub': 'Sends to your account email in some cases (for example, when you disappear for a while). This switch turns everything on at once. To choose by category, use "Customize by category" below.', // MÉDIA
  'notif.pref.quiet.section': 'Quiet hours', // ALTA
  'notif.pref.quiet.title': 'Do not notify between', // ALTA
  'notif.pref.quiet.sub': 'Applies to automatically calculated notifications (review, streak...). Instant ones (XP, badge) still appear. Approximate time (not yet adjusted to your time zone).', // MÉDIA
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
  'notif.pref.push.blocked': 'Notifications are blocked in your browser settings. Allow them there and try again.', // ALTA
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
  'review.strength.hint': 'Not started = no study yet; Weak = not solid yet; Strong = known well for a while; Medium = somewhere in between. This is ALL your vocabulary, not today\'s reviews (above). So you can have medium words here even with no reviews due right now.', // MÉDIA -- texto longo; "firmou" sem equivalente direto
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
  'review.match.attempts': { one: '{n} attempt', other: '{n} attempts' }, // ALTA
  'review.match.playAgain': 'Play again', // ALTA
  'review.speed.insufficientBody': 'Speed Review needs words you have already studied successfully at least once. Keep studying units in Study.', // ALTA
  'review.speed.upToDateBody': 'No reviews due right now. Practice is still available whenever you like.', // ALTA
  'review.practice': 'Practice', // ALTA
  'review.speed.gameOver': 'Game over!', // ALTA
  'review.speed.points': '{n} pts', // ALTA
  'review.speed.answered': { one: 'You answered {n} word this round.', other: 'You answered {n} words this round.' }, // ALTA
  'review.back': 'Back', // ALTA
  'review.practiceMore': 'Practice more', // ALTA
  'review.complete.title': 'Review complete!', // ALTA
  'review.complete.reviewed': { one: 'You reviewed {n} card this session.', other: 'You reviewed {n} cards this session.' }, // ALTA
  'review.session.deckEmptyTitle': 'No cards in this Deck yet', // ALTA
  'review.session.classEmptyTitle': 'No lesson cards to review right now', // ALTA
  'review.session.tagsEmptyTitle': 'No cards with the selected tags', // ALTA
  'review.session.unitEmptyTitle': 'No cards in this unit yet', // ALTA
  'review.session.allDoneTitle': 'All caught up!', // ALTA
  'review.session.pendingOverall': { one: 'You still have {n} card due overall.', other: 'You still have {n} cards due overall.' }, // ALTA
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
  'trail.unit.lessonsProgress': { one: '{done} of {total} lesson', other: '{done} of {total} lessons' }, // ALTA
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
  'deck.countsFull': { one: '{total} card · New: {new} · Learning: {learning} · To review: {review} · Due: {due}', other: '{total} cards · New: {new} · Learning: {learning} · To review: {review} · Due: {due}' }, // ALTA
  'deck.publicBadge': '🌐 Public', // ALTA
  'deck.publish': '🔒 Private', // ALTA
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
  'myFlashcards.badge.limited': '🔒 {used}/{limit} cards on your account', // ALTA -- Etapa 5
  'myFlashcards.badge.premium': '⭐ Premium', // ALTA
  'myFlashcards.badge.premiumUnlimited': '⭐ Premium — unlimited cards', // ALTA
  'myFlashcards.edit.legacyConversionError': 'This card couldn\'t open in the new editor: {reason}', // ALTA
  'myFlashcards.new.title': 'New card', // ALTA
  'myFlashcards.free.hint': '🔒 On the free plan you create Normal cards, with image/audio upload per field (external URL also available). <strong>Premium</strong> unlocks Normal with reverse, Multiple choice, Fill in the blank, Type the answer, plus generating audio from text and recording audio with the microphone.', // MÉDIA
  'myFlashcards.cardType': 'Card type', // ALTA
  'myFlashcards.fields.title': 'Fields', // ALTA
  'myFlashcards.fields.hint': 'Add this card\'s fields, for example Front and Back for a Normal card. Each field has its own language and its own audio options.', // ALTA
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
  'myFlashcards.import.hint': 'Did you get a .json file from another student, or a share link? Import it here. Only cards in the SAME language you are studying ({lang}) can be imported.', // ALTA
  'myFlashcards.anki.title': '📥 Import from Anki (.apkg)', // ALTA
  'myFlashcards.anki.hint': 'Have an Anki deck? Choose the .apkg file exported from there. You\'ll see a summary (how many cards, types, warnings) before confirming; nothing is imported without your confirmation.', // ALTA
  'myFlashcards.row.createdOn': 'created on {date}', // ALTA
  'myFlashcards.row.previewTitle': 'Preview how it will appear in Review', // ALTA
  'myFlashcards.row.editTitle': 'Edit', // ALTA
  'myFlashcards.row.reactivateTitle': 'Reactivate (remove from the archive)', // MÉDIA
  'myFlashcards.row.hiddenTitle': 'Hidden from your profile. Click to make it visible', // ALTA
  'myFlashcards.row.visibleTitle': 'Visible on your profile (if your account is public). Click to hide', // ALTA
  'myFlashcards.row.deleteTitle': 'Delete permanently', // ALTA
  'myFlashcards.edit.useNative': '🧪 Use the new field editor (native): keeps the content you already typed', // MÉDIA
  'myFlashcards.edit.sideLanguage': 'Language of each side', // ALTA
  'myFlashcards.edit.front': 'Front', // ALTA
  'myFlashcards.edit.pinyin': 'Pinyin', // ALTA
  'myFlashcards.edit.back': 'Back', // ALTA
  'myFlashcards.edit.cancel': 'Cancel', // ALTA
  'myFlashcards.edit.save': 'Save edit', // ALTA
  'myFlashcards.toast.editedReset': '✓ Card edited. Its review progress was reset.', // ALTA
  'myFlashcards.toast.edited': '✓ Card edited.', // ALTA
  'myFlashcards.native.title': 'Edit card', // MÉDIA
  'myFlashcards.native.hint': 'This card uses the new field model. When you edit here, the content is saved only in that model, never in the old format.', // MÉDIA
  'myFlashcards.native.cardType': 'Card type', // MÉDIA
  'myFlashcards.toast.created': '✓ Card created. It\'s already in your review queue.', // ALTA
  'myFlashcards.err.previewLoad': 'Could not load this card to preview.', // ALTA
  'myFlashcards.confirm.delete': 'This will permanently delete the card and its entire review history. This cannot be undone. Continue?', // ALTA
  'myFlashcards.err.deleteFailed': 'Could not delete the card right now.', // ALTA
  'myFlashcards.toast.deleted': '✓ Card deleted.', // ALTA
  'myFlashcards.export.noneActive': 'You don\'t have any active cards to export.', // ALTA
  'myFlashcards.export.modalTitle': '⬇️ Export cards ({n})', // ALTA
  'myFlashcards.export.hint': 'Download a .json file to give to another student to import, or copy the share link. Both have the same content.', // ALTA
  'myFlashcards.export.download': '⬇️ Download .json', // ALTA
  'myFlashcards.export.copyLink': '🔗 Copy link', // ALTA
  'myFlashcards.export.linkCopied': '✓ Link copied!', // ALTA
  'myFlashcards.export.leftOut': { one: '{n} Fill-in-the-blank card was left out: this format only carries front and back.', other: '{n} Fill-in-the-blank cards were left out: this format only carries front and back.' }, // ALTA
  'myFlashcards.import.confirmCut': { one: 'The file has {total} card, but only the first {kept} fit in the free plan. Import those {kept}?', other: 'The file has {total} cards, but only the first {kept} fit in the free plan. Import those {kept}?' }, // ALTA
  'myFlashcards.import.errRead': 'Could not read this file. Make sure it is a .json exported from this screen.', // ALTA
  'myFlashcards.import.errEmpty': 'The file/link has no cards to import.', // ALTA
  'myFlashcards.import.errLang': 'These cards are in another language ({lang}). They can\'t be imported here.', // ALTA
  'myFlashcards.import.confirm': { one: 'Import {n} card into your account?', other: 'Import {n} cards into your account?' }, // ALTA
  'myFlashcards.import.done': { one: '✓ {n} card imported.', other: '✓ {n} cards imported.' }, // ALTA

  // Fase 6 lote 2: zh/app.js
  'zh.toast.chineseVoiceMissing': '🔇 No Chinese voice found — see the setup guide', // MÉDIA
  'zh.toast.operaAudioFailed': '🔇 Opera couldn\'t play this audio', // ALTA
  'zh.toast.storyDone': 'Story completed! 🎉', // ALTA
  'zh.toast.unitDone': 'Unit completed! 🏮', // ALTA
  'zh.toast.hanziLessonDone': 'Hanzi lesson completed! 🀄', // ALTA
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
  'zh.path.lessonDone.recapMissed': 'Words to review from the Checkpoint', // MÉDIA -- Etapa 4: aprovado pela dona
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
  'zh.path.unitDone.learnedWords': { one: 'What you learned: {n} new word', other: 'What you learned: {n} new words' }, // ALTA
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
  'trail.backToTrail': 'Back to the Study Path', // ALTA -- "Study Path", escolha da dona (2026-10-19)
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
  'zh.hint.listenAgain': 'Listen again, paying attention to the sounds. It is an expression from this unit\'s topic.', // MÉDIA
  'zh.hint.thinkContext': 'Think about the context of this unit\'s topic ("{title}"): in what situation would you use this word?', // ALTA
  'zh.hint.reorder': 'First identify who performs the action, then the action itself. Build the sentence following that line of thought, ignoring the blocks that do not belong to it.', // ALTA
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
  'zh.progress.chartPoint': { one: '{date}: {n} word', other: '{date}: {n} words' }, // ALTA
  'zh.progress.chartTotal': 'Total so far:', // ALTA
  'zh.progress.chartTotalSuffix': 'words and characters learned', // ALTA
  'zh.progress.heatCell': { one: '{n} activity on {date}', other: '{n} activities on {date}' }, // ALTA
  'zh.progress.heatLess': 'Less', // ALTA
  'zh.progress.heatMore': 'More', // ALTA
  'zh.hanzi.allCaughtUp': 'All caught up!', // ALTA
  'zh.hanzi.pendingChars': { one: 'You still have {n} character due.', other: 'You still have {n} characters due.' }, // ALTA
  'zh.hanzi.comeBackLater': 'Come back later for your next review, or move on to a new lesson.', // ALTA
  'zh.hanzi.sessionDone': 'Session complete!', // ALTA
  'zh.hanzi.sessionReviewed': { one: 'You reviewed {n} character in this session.', other: 'You reviewed {n} characters in this session.' }, // ALTA
  'zh.hanzi.lessonTag': 'Lesson {n}', // ALTA
  'zh.hanzi.tapToReveal': 'tap to see the pinyin and meaning', // ALTA
  'zh.hanzi.backToRadicals': '← Back to radicals', // ALTA
  'zh.hanzi.appearsInCount': { one: 'Appears in {n} character you have already studied', other: 'Appears in {n} characters you have already studied' }, // ALTA
  'zh.hanzi.countLabel': '{chars} characters in {lessons} lessons. See them, write them and test your memory.', // ALTA
  'zh.hanzi.lessonCompleted': 'Completed', // ALTA
  'zh.hanzi.charCount': { one: '{n} character', other: '{n} characters' }, // ALTA
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
  'fr.hint.listenAgain': 'Listen again, paying close attention to the sounds. It is an expression from this unit\'s topic.', // ALTA
  'fr.hint.thinkContext': 'Think about the context of this unit\'s topic ("{title}"): in what situation would you use this word?', // ALTA
  'fr.hint.reorderTranslate': 'First discard the blocks that don\'t belong to this sentence. Only then think about the order of the remaining words.', // ALTA
  'fr.hint.reorderOrder': 'First identify who performs the action and then the action itself. Build the sentence following that line of reasoning, ignoring the blocks that don\'t belong to it.', // ALTA
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
  'fr.conj.sessionSize': 'Verbs per session', // ALTA
  'fr.conj.sessionForms': '≈ {n} forms to fill in', // ALTA
  'fr.conj.reviewTitle': 'Forms to review ({n})', // ALTA
  'fr.conj.practiceMistakes': 'Practice only the ones I missed', // ALTA
  'fr.conj.almost': 'Almost', // ALTA
  'fr.conj.otherForm': '"{form}" is the {tense} form.', // ALTA
  'fr.conj.sel.verbs': 'Verbs', // ALTA
  'fr.conj.sel.searchLabel': 'Practice specific verbs (in French or Portuguese)', // ALTA
  'fr.conj.sel.searchPh': 'manger, être, aller...', // ALTA
  'fr.conj.sel.noMatch': 'This verb is not on the list yet.', // ALTA
  'fr.conj.sel.pickedNote': 'The session will use only these verbs. The filters below are set aside.', // ALTA
  'fr.conj.sel.removeVerb': 'Remove {verb}', // ALTA
  'fr.conj.sel.pickLimit': 'You can pick up to {n} verbs.', // ALTA
  'fr.conj.sel.orFilters': 'Or draw verbs with the filters', // ALTA
  'fr.conj.sel.onlyRegular': 'Regular verbs only', // ALTA
  'fr.conj.sel.onlyIrregular': 'Irregular verbs only', // ALTA
  'fr.conj.sel.tenses': 'Verb tenses', // ALTA
  'fr.conj.sel.langFr': 'French', // ALTA
  'fr.conj.sel.langPt': 'Portuguese', // ALTA
  'games.tabPractice': 'Practice', // ALTA
  'games.tabGames': 'Games', // ALTA
  'games.premium': 'Premium', // ALTA
  'games.locked': 'Locked', // ALTA -- Etapa 5
  'games.premiumModal.title': '🔒 Premium feature', // ALTA -- Etapa 5
  'games.premiumModal.bodyHtml': 'The <strong>Conjugation Games</strong> train the choices that confuse people the most, like passé composé or imparfait and être or avoir, with an explanation and audio for every sentence. Conjugation practice stays free.', // MÉDIA -- Etapa 5
  'games.premiumModal.howTo': 'They\'re part of the Premium plan. To ask for Premium, contact Prof. Brune using the button below.', // ALTA -- Etapa 5
  'games.perRound': '{n} sentences per round', // ALTA
  'games.play': 'Play', // ALTA
  'games.counter': 'Sentence {i} of {n}', // ALTA
  'games.right': 'Right!', // ALTA
  'games.wrong': 'Not this time.', // ALTA
  'games.answerWas': 'The answer is "{form}".', // ALTA
  'games.whyTense': 'Why {tense}?', // ALTA
  'games.listen': 'Listen to the sentence', // ALTA
  'games.next': 'Next sentence', // ALTA
  'games.seeResult': 'See result', // ALTA
  'games.resultTitle': 'End of round', // ALTA
  'games.reviewTitle': 'Sentences to review ({n})', // ALTA
  'games.perfect': 'You got them all right!', // ALTA
  'games.practiceMistakes': 'Practice only my mistakes', // ALTA
  'games.again': 'Play again', // ALTA
  'games.backToGames': '← Back to games', // ALTA
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
  'review.observation': 'Note from your teacher', // ALTA
  'review.almost': 'Almost there', // ALTA
  'review.almost.accent': 'Almost there: check the accents', // ALTA
  'review.almost.letter': 'Almost there: check the letters', // ALTA
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
  'review.deck.publish': '🔒 Private', // ALTA -- Revisão nova
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
  'review.panel.searchPlaceholder': 'Search cards', // ALTA -- Etapa 4: aprovado pela dona
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
  'review.week.notStudied': 'no study', // ALTA -- Etapa 4: aprovado pela dona
  'review.week.ariaFuture': '{day}: {due} to review, {new} new', // ALTA -- Revisão nova
  'review.week.alreadyStudied': ', already studied', // ALTA -- Revisão nova
  'review.week.title': 'Your review week', // ALTA -- Revisão nova
  'review.week.goalDone': 'Weekly goal reached', // ALTA -- Revisão nova
  'review.week.goal': 'Weekly goal', // ALTA -- Revisão nova
  'review.week.goalCount': { one: ': <b>{n} of {goal}</b> study day', other: ': <b>{n} of {goal}</b> study days' }, // ALTA -- Revisão nova
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
  'review.today.shortTitle': 'Short session: the cards you miss most and the ones waiting longest come first', // ALTA -- Etapa 4: aprovado pela dona
  'review.today.short': '⏱ 5 minutes', // ALTA -- Revisão nova
  'review.today.studyAll': 'Study all ({n})', // ALTA -- Revisão nova
  'review.today.studyPath': 'Study the path ({n})', // ALTA
  'review.today.upToDate': 'You\'re all caught up for today.', // ALTA -- Revisão nova
  'review.today.speedSplitAria': 'New {new}, Learning {learning}, Review {review}', // ALTA -- Revisão nova
  'review.backToDeck': '← Back to Deck', // ALTA -- Revisão nova
  'review.backToStudent': '← Back to Student', // ALTA
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
  'wizard.notif.sub': 'Get a reminder at the time you choose. This reminder only shows up while the site is open.', // ALTA -- Etapa 4: aprovado pela dona
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
  'auth.staleLocal': '⚠ Your progress here looks out of date compared to what was already saved. Reload the page if this persists.', // ALTA
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
  'profile.err.saveFailed': 'Couldn\'t save your profile. Check your connection and try again.', // ALTA
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
  'ankiImport.err.loadDb': 'We couldn\'t load the Anki file reader right now. Try again in a moment.', // ALTA
  'ankiImport.err.loadZip': "We couldn't load the .zip reader right now. Try again in a moment.", // ALTA
  'ankiImport.loadingPlan': 'Analyzing the cards...', // ALTA
  'ankiImport.noDeck': 'No deck', // ALTA
  'ankiImport.pillMedia': '🎧🖼️ media', // ALTA
  'ankiImport.pillDuplicate': '⚠️ possible duplicate', // ALTA
  'ankiImport.tags.title': '🏷️ Tags found ({n}):', // ALTA
  'ankiImport.tags.note': 'Tags will be saved on each item exactly as in Anki (normalized: lowercase, no accents, spaces become "-") and will be available for filtering once the Dashboard exists.', // MÉDIA -- Etapa 4: aprovado pela dona
  'ankiImport.summary.found': { one: '<strong>{n}</strong> card found in the file:', other: '<strong>{n}</strong> cards found in the file:' }, // ALTA
  'ankiImport.summary.ok': '<strong>{n}</strong> can be imported natively,', // ALTA
  'ankiImport.summary.skipped': "<strong>{n}</strong> couldn't be recognized safely (see the warnings below; they're left out).", // ALTA
  'ankiImport.summary.duplicates': '⚠️ {n} seem to already exist in your account (unchecked by default, but you can check them anyway).', // ALTA
  'ankiImport.summary.media': '🎧🖼️ {n} have audio/image. It is only downloaded/uploaded for the cards you actually confirm.', // ALTA
  'ankiImport.counterNone': 'No cards selected', // ALTA
  'ankiImport.counter': { one: '{n} card selected', other: '{n} cards selected' }, // ALTA
  'ankiImport.selectAll': 'Select all', // ALTA
  'ankiImport.clear': 'Clear selection', // ALTA
  'ankiImport.truncated': { one: '+ {n} more card not shown here (the "Select all" selection includes all of them anyway).', other: '+ {n} more cards not shown here (the "Select all" selection includes all of them anyway).' }, // ALTA
  'ankiImport.confirm': 'Confirm import', // ALTA
  'ankiImport.importing': 'Importing...', // ALTA
  'ankiImport.importingProgress': 'Importing {done}/{total}...', // ALTA
  'ankiImport.savingBatches': { one: 'Saving... ({n} batch ok)', other: 'Saving... ({n} batches ok)' }, // ALTA
  'ankiImport.saveError': 'Error saving.', // ALTA
  'ankiImport.skippedFallback': 'Card skipped.', // ALTA
  'ankiImport.result.ok': { one: '✓ <strong>{imported}</strong> of {n} selected card was imported successfully.', other: '✓ <strong>{imported}</strong> of {n} selected cards were imported successfully.' }, // ALTA
  'ankiImport.result.partial': '⚠️ The import stopped halfway. <strong>{imported}</strong> of {requested} cards were already saved successfully before the failure. Those already imported will NOT be duplicated if you try again (that attempt will detect the ones that already exist).', // ALTA
  'ankiImport.result.mediaWarn': { one: '⚠️ {n} media file could not be included (the card text was imported normally): {list}{more}', other: '⚠️ {n} media files could not be included (the card text was imported normally): {list}{more}' }, // ALTA
  'ankiImport.destDeck': '📚 Import into Deck:', // ALTA
  'ankiImport.keepFolders': 'Keep the Anki folders (recreate them as Decks inside the chosen Deck)', // ALTA
  'ankiImport.result.decksCreated': { one: '{n} Deck created from the Anki folders.', other: '{n} Decks created from the Anki folders.' }, // ALTA
  'ankiImport.result.cutTail': { one: '({n} Anki card was left out.)', other: '({n} Anki cards were left out.)' }, // ALTA
  'ankiImport.result.deckFailed': { one: '({n} card was not imported.)', other: '({n} cards were not imported.)' }, // ALTA
  'ankiImport.result.skippedTitle': 'Skipped cards ({n})', // ALTA
  'ankiExport.generating': 'Generating file...', // ALTA
  'ankiExport.empty': 'No cards to export in this selection.', // ALTA
  'ankiExport.mediaNote': { one: ' ({n} media file could not be included. The cards were exported anyway, just without that specific audio/image.)', other: ' ({n} media files could not be included. The cards were exported anyway, just without those specific audio/image files.)' }, // ALTA
  'ankiExport.done': { one: 'Exported! {n} card in the .apkg file — import it straight into Anki.{mediaNote}', other: 'Exported! {n} cards in the .apkg file — import them straight into Anki.{mediaNote}' }, // ALTA
  'ankiExport.failed': "We couldn't generate the file right now. Try again.", // ALTA
  // Etapa 3 (decisão da dona, 2026-10-19): nomes dentro do .apkg (Anki) no idioma do site.
  // Etapa 3 (c4): verso de preenchimento gravado no cartão (só exibição; o dado não muda).
  'flashcards.mirror.multipleChoice': '(multiple choice)', // ALTA
  'flashcards.mirror.cloze': '(fill in the blank)', // ALTA
  'flashcards.mirror.noTranslation': '(no translation)', // ALTA
  'ankiExport.appName.fr': 'French with Prof. Brune', // ALTA
  'ankiExport.appName.zh': 'Chinese with Prof. Brune', // ALTA
  'ankiExport.deckDesc': 'Exported from the {app} app', // ALTA
  'ankiExport.field.french': 'French', // ALTA
  'ankiExport.field.translation': 'Translation', // ALTA
  'ankiExport.field.character': 'Character', // ALTA
  'ankiExport.template.card1': 'Card 1', // ALTA
  'ankiExport.model.reverse': '{model} - Reverse', // ALTA
  'ankiExport.filename.fr.all': 'french-with-prof-brune-complete.apkg', // ALTA
  'ankiExport.filename.fr.unit': 'french-with-prof-brune-unit-{n}.apkg', // ALTA
  'ankiExport.filename.zh.all': 'chinese-with-prof-brune-complete.apkg', // ALTA
  'ankiExport.filename.zh.unit': 'chinese-with-prof-brune-unit-{n}.apkg', // ALTA
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
  'fieldEditor.audio.ttsLang.choose': 'Choose the language', // ALTA
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
  'mcEditor.err.notNative': 'This item was created in the old format and can\'t be edited here.', // ALTA -- Etapa 4: aprovado pela dona
  'mcEditor.err.notMcMode': 'This item isn\'t a Multiple choice item.', // ALTA -- Etapa 4: aprovado pela dona
  'mcEditor.err.unrecognized': { one: 'Multiple choice does not accept a Field with no role ({n} field without prompt/answer/distractor). Assign a role or remove it.', other: 'Multiple choice does not accept Fields with no role ({n} fields without prompt/answer/distractor). Assign a role or remove them.' }, // ALTA
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
  'mcEditor.noDistractors': 'No distractors yet. Add at least 1.', // ALTA
  'mcEditor.addDistractor': '+ Add distractor', // ALTA
  'mcEditor.maxDistractors': 'Maximum of {n} distractors reached.', // ALTA
  'mcEditor.othersTitle': 'Other fields (no role defined in this multiple choice)', // ALTA
  'mcEditor.othersHint': 'These fields came from another mode and don\'t have a role here yet. Remove them or assign a role so the structure becomes valid.', // ALTA
  'mcEditor.noRoleField': 'Field with no role {n}', // ALTA
  'mcEditor.valid': '✓ Multiple choice structure complete.', // ALTA
  'mcEditor.distractorsTitle': 'Distractors ({n}/{max})', // ALTA
  'taEditor.err.notNative': 'This item was created in the old format and can\'t be edited here.', // ALTA -- Etapa 4: aprovado pela dona
  'taEditor.err.notTaMode': 'This item isn\'t a Type the answer item.', // ALTA -- Etapa 4: aprovado pela dona
  'taEditor.err.selfPinyin': "A field can't point to itself as pinyin.", // ALTA
  'taEditor.err.unrecognized': { one: 'Type the answer does not accept a Field with no role ({n} field without prompt/answer). Assign a role or remove it.', other: 'Type the answer does not accept Fields with no role ({n} fields without prompt/answer). Assign a role or remove them.' }, // ALTA
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
  'taEditor.pinyinHint': 'Linked to another field as its pinyin. Editable as usual, never counts as a 3rd question/answer field.', // MÉDIA
  'taEditor.pinyinLabel': 'Pinyin {n}', // ALTA
  'taEditor.othersTitle': 'Other fields (no role defined in Type the answer)', // ALTA
  'taEditor.othersHint': 'These fields came from another mode and don\'t have a role here yet. Remove them or assign a role so the structure becomes valid.', // ALTA
  'taEditor.noRoleField': 'Field with no role {n}', // ALTA
  'taEditor.valid': '✓ Type the answer structure complete.', // ALTA
  'recorder.err.permissionDenied': 'Microphone permission denied. We couldn\'t record. You can allow microphone access in your browser settings and try again.', // ALTA
  'recorder.err.noDevice': 'No microphone available in this browser/device.', // ALTA
  'recorder.err.recordingError': 'An error occurred during recording. Try again.', // ALTA
  'recorder.err.uploadError': 'Recording finished, but we couldn\'t save it. Try again.', // ALTA
  'recorder.err.finishFailed': "We couldn't finish the recording.", // ALTA
  'recorder.err.uploadUnavailable': 'Recording upload is not available on this screen.', // ALTA
  'recorder.err.saveFailed': "We couldn't save the recording right now.", // ALTA
  'clozeEditor.err.notNative': 'This item was created in the old format and can\'t be edited here.', // ALTA -- Etapa 4: aprovado pela dona
  'clozeEditor.err.notClozeMode': 'This item isn\'t a Fill in the blank item.', // ALTA -- Etapa 4: aprovado pela dona
  'clozeEditor.err.emptySentence': 'The sentence with blanks cannot be empty.', // ALTA
  'clozeEditor.err.emptyTranslation': 'The translation cannot be empty.', // ALTA
  'clozeEditor.err.malformed': 'The sentence has a malformed blank marker. Remove it and mark again.', // ALTA
  'clozeEditor.err.noMarks': 'Select at least one part of the sentence and mark it as a blank.', // ALTA
  'clozeEditor.err.duplicateIds': 'Two blanks ended up with the same marker. Remove one of them and mark it again.', // ALTA
  'clozeEditor.err.emptyMark': 'One of the blanks has no text.', // ALTA
  'clozeEditor.err.missingPinyin': 'Missing pinyin for the blank "{answer}" (required for Mandarin). Click it to complete.', // ALTA
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
  'clozeEditor.othersHint': 'These fields came from another mode and don\'t have a role here yet. Remove them.', // ALTA
  'clozeEditor.noRoleField': 'Field with no role {n}', // ALTA
  'clozeEditor.valid': '✓ Fill in the blank structure complete.', // ALTA
  'clozeEditor.sentenceTitle': 'Sentence with blanks', // ALTA
  'clozeEditor.sentenceHint': 'Select a word or part of the sentence and click "Mark selection as blank". You can mark more than one part.', // ALTA
  'clozeEditor.translationTitle': 'Translation', // ALTA
  'clozeEditor.sel.selectFirst': 'Select a part of the sentence first.', // ALTA
  'clozeEditor.sel.outside': 'Select a part INSIDE the sentence.', // ALTA
  'clozeEditor.sel.whitespace': 'The selection must contain some text, not just spaces.', // ALTA
  'clozeEditor.sel.overlaps': 'That selection already includes (fully or partially) an existing blank. Mark a part outside the blanks already created.', // ALTA
  'clozeEditor.sel.outOfRange': 'Invalid selection.', // ALTA
  'clozeEditor.sel.failed': "We couldn't mark that selection.", // ALTA
  'clozeEditor.panel.emptyAnswer': 'The blank text cannot be empty.', // ALTA
  'fr.dictation.backToTrail': '← Back to the Study Path', // ALTA -- "Study Path", escolha da dona (2026-10-19)
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
  'admin.common.forNoStudent': ' (select a student first)', // ALTA
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
  'admin.students.removeConfirm': 'End the link with this student? Their progress and history are kept; they leave your list and lose your student badge.', // ALTA
  'admin.students.metrics.failed': 'We couldn\'t load the metrics right now.', // ALTA
  'admin.students.metrics.noCards': 'You haven\'t created any cards for this student yet, in the "📇 Flashcards" tab.', // ALTA
  'admin.students.metrics.noRecord': 'no record', // ALTA
  'admin.students.metrics.today': 'today', // ALTA
  'admin.students.metrics.yesterday': 'yesterday', // ALTA
  'admin.students.metrics.daysAgo': { one: '{n} day ago', other: '{n} days ago' }, // ALTA
  'admin.premium.adminOnly': 'Only the administration can access this section.', // ALTA
  'admin.premium.title': '⭐ Activate/remove Premium', // ALTA
  'admin.premium.hint': 'Search for an account by @username and activate the Premium plan for it. It works for ANY registered account, whether linked to you as a student or not. No real billing yet (no checkout set up): it is a manual grant, reversible at any time.', // ALTA
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
  'admin.classLogs.fieldNotes': '💬 Your private notes', // ALTA
  'admin.classLogs.topicOpt': 'Topic (optional)', // ALTA
  'admin.classLogs.homeworkOpt': 'Homework (optional)', // ALTA
  'admin.classLogs.observationsOpt': 'Observations (optional)', // ALTA
  'admin.classLogs.notesOpt': 'Your private notes, the student doesn\'t see them (optional)', // ALTA
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
  'admin.classLogs.notesPlaceholder': 'reminders for yourself about this class...', // ALTA
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
  'teacherLogs.err.needOneField': 'Fill in at least one field (attendance, skills, topic, homework, observations or free text).', // ALTA
  'teacherLogs.err.saveFailed': 'We couldn\'t save the record right now.', // ALTA
  'teacherMaterials.err.titleRequired': 'Enter a title for the material.', // ALTA
  'teacherMaterials.err.needContent': 'Fill in at least the description, a link or a file.', // ALTA
  'teacherMaterials.err.createFailed': 'We couldn\'t create the material right now.', // ALTA
  'teacherMaterials.err.saveFailed': 'We couldn\'t save right now.', // ALTA
  'teacherFlashcards.err.clozePinyinRequired': 'Enter the pinyin of the answer (it is what the student will type).', // ALTA
  'flashcardModel.tts.providerNotConfigured': 'Text-to-speech audio generation is not turned on on the server yet.', // ALTA
  'flashcardModel.tts.providerNotImplemented': 'Text-to-speech audio generation is not available yet.', // ALTA
  'flashcardModel.tts.providerError': 'The voice service couldn\'t generate the audio right now. Try again in a moment.', // ALTA
  'flashcardModel.tts.providerRateLimited': 'The voice service is overloaded. Try again in a few minutes.', // ALTA
  'flashcardModel.tts.monthlyQuotaExceeded': 'You\'ve reached the monthly limit of generated audio. Try again next month.', // ALTA
  'flashcardModel.tts.planRequired': 'Generating audio from text is part of the Premium plan.', // ALTA -- Etapa 5
  'flashcardModel.tts.quotaCheckFailed': 'We couldn\'t check your audio limit right now. Try again in a moment.', // ALTA
  'flashcardModel.tts.unsupportedLanguage': 'This language doesn\'t have a voice for audio generation yet.', // ALTA
  'flashcardModel.tts.invalidVoice': 'Invalid voice for this language. Leave the "Voice" field blank to use the default voice.', // ALTA
  'flashcardModel.tts.rateLimited': 'Too many audio generations in a short time. Wait a few minutes and try again.', // ALTA
  'flashcardModel.tts.notAuthorized': 'You don\'t have permission to generate audio for this card.', // ALTA
  'flashcardModel.tts.invalidSession': 'Session expired. Log in again.', // ALTA
  'flashcardModel.tts.textTooLong': 'Text too long (maximum {max} characters).', // ALTA
  'flashcardModel.tts.missingText': 'Enter the text to synthesize.', // ALTA
  'flashcardModel.tts.missingLanguage': 'Choose the synthesis language.', // ALTA
  'flashcardModel.tts.uploadFailed': 'Audio generated, but it could not be saved. Try again.', // ALTA
  'admin.flashcards.hint.flip': 'Image and audio appear next to the front of the card. Notes show up for the student after they answer.', // ALTA
  'admin.flashcards.hint.mc': 'Image and audio appear next to the question, above the multiple-choice options. Notes show up for the student after they answer.', // ALTA
  'admin.flashcards.hint.cloze': 'Image and audio appear next to the sentence with the blank. Notes show up for the student after they answer.', // ALTA
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
  'admin.flashcards.edit.mc1': 'Other options: wrong option 1', // ALTA
  'admin.flashcards.edit.mc2': 'Wrong option 2 (optional)', // ALTA
  'admin.flashcards.edit.mc3': 'Wrong option 3 (optional)', // ALTA
  'admin.flashcards.edit.clozeSentence': 'Sentence with a blank (use ___ to mark the space)', // ALTA
  'admin.flashcards.edit.clozeAnswer': 'Correct answer', // ALTA
  'admin.flashcards.edit.clozePinyin': 'Answer pinyin', // ALTA
  'admin.flashcards.edit.image': 'Image', // ALTA
  'admin.flashcards.edit.hasOne': ' (it already has one: choose a file only to replace it)', // ALTA
  'admin.flashcards.edit.ownAudio': 'Own audio', // ALTA
  'admin.flashcards.edit.hasOneAudio': ' (it already has one: choose a file only to replace it)', // ALTA
  'admin.flashcards.edit.err.front': 'Enter the front.', // ALTA
  'admin.flashcards.edit.err.back': 'Enter the back.', // ALTA
  'admin.flashcards.edit.err.oneWrongOption': 'Enter at least 1 wrong option.', // ALTA
  'admin.flashcards.edit.err.oneBlank': 'The sentence must have exactly one space marked with ___.', // ALTA
  'admin.flashcards.edit.err.answer': 'Enter the correct answer.', // ALTA
  'admin.flashcards.edit.err.pinyin': 'Enter the answer pinyin.', // ALTA
  'admin.flashcards.edit.err.trans': 'Enter the translation.', // ALTA
  'admin.flashcards.native.privateNote': 'Notes (the student sees them after answering)', // ALTA
  'admin.flashcards.dest.rootDefault': 'Teacher cards (default)', // ALTA
  'admin.flashcards.dest.noDeck': '📂 <em>no Deck (card created before Decks)</em> · ', // ALTA
  'admin.flashcards.dest.deckFallback': 'Deck', // ALTA
  'admin.flashcards.dest.moveTitle': 'Move this card to another of this student\'s Decks', // ALTA
  'admin.flashcards.dest.moveTo': 'Move to…', // ALTA
  'admin.flashcards.dest.deleteTitle': 'Delete this Deck (empty)', // ALTA
  'admin.flashcards.dest.deleteDisabledTitle': 'You can only delete a Deck with no subdecks and no cards', // ALTA
  'admin.flashcards.dest.countCards': { one: '({n} card', other: '({n} cards' }, // ALTA
  'admin.flashcards.dest.countSubdecks': { one: ', {n} subdeck', other: ', {n} subdecks' }, // ALTA
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
  'admin.flashcards.createdPartial': { one: '✓ {ok} card created; failed for: {failed}.', other: '✓ {ok} cards created; failed for: {failed}.' }, // ALTA
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
  'admin.reports.hint': 'Sent through the ⚑ flag (top bar, user menu or inside exercises). Guests can report too. Reports with no account and no email appear as "guest".', // ALTA
  'admin.reports.detail.suggestion': '💡 Suggestion', // ALTA
  'admin.reports.detail.problem': '⚑ Problem', // ALTA
  'admin.reports.detail.notInformed': '(not provided)', // ALTA
  'admin.reports.detail.screenshotView': '📎 View attached screenshot', // ALTA
  'admin.reports.detail.screenshotNone': '(no screenshot attached)', // ALTA
  'admin.reports.reply.lastSentTo': 'Last reply sent on {date} to {email}:', // ALTA
  'admin.reports.reply.lastSent': 'Last reply sent on {date}:', // ALTA
  'admin.reports.reply.err.forbidden': 'Session without admin permission. Sign in again.', // ALTA
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
  'admin.notifications.event.user_inactive_1': '👋 Re-engagement: 1 day inactive', // MÉDIA
  'admin.notifications.event.user_inactive_3': '👋 Re-engagement: 3 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_5': '👋 Re-engagement: 5 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_7': '👋 Re-engagement: 7 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_9': '👋 Re-engagement: 9 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_15': '👋 Re-engagement: 15 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_20': '👋 Re-engagement: 20 days inactive', // MÉDIA
  'admin.notifications.event.user_inactive_30': '👋 Re-engagement: 30 days inactive', // MÉDIA
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
  'admin.notifications.rule.hint': 'Controls when the XP notification fires, not its text (that is in the variants below). Reviews of well-known words give very low XP on purpose; below the minimum, the notification is not even created.', // ALTA
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
  'admin.notifications.new.hint': 'Push does not appear here: it reuses the text of the "In the app" variant of the same event, with no pool of its own. In email, the title becomes the subject. Placeholders like {{amount}}/{{days}} are replaced with the real event data. See the hint for each event above.', // ALTA
  'admin.notifications.new.titleLabel': 'Title (optional)', // ALTA
  'admin.notifications.new.titlePh': 'e.g. New achievement!', // ALTA
  'admin.notifications.new.icon': 'Emoji (optional)', // ALTA
  'admin.notifications.new.body': 'Text', // ALTA
  'admin.notifications.new.bodyPh': 'How about 5 minutes of study today? 🙂', // ALTA -- Etapa 4: aprovado pela dona
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
  'admin.analytics.tab.path': '🗺️ Path', // ALTA -- "Path", escolha da dona (2026-10-19)
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
  'admin.mode.sub': 'When off, your account browses and completes lessons exactly like a regular student (while still recognized as admin). Useful to test the real experience without admin shortcuts. Same control as the 🔒 Admin pill on the main screen.', // ALTA
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
  'admin.analytics.resumo.rateNote': 'The completion rate only uses exercises that have a recorded "start" (flashcards, speed review, memory game, hanzi, dictation, conjugation). Vocabulary lessons and unit checkpoints are not part of this calculation because we only know when they end, not when they start. That is why "Exercises completed" (above) is larger than "Exercises started": it adds up ALL types, those with a start and those without. To see each type separately, check the Exercises tab.', // ALTA
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
  'admin.analytics.kpi.timeNote': 'rough estimate, not the actual time spent; see note below', // ALTA
  'admin.analytics.resumo.timeNote': '"Study time" is an approximation: for each session, we measure from the first to the last recorded event and add everything up. If a student stays idle in the middle (e.g. leaves to do something else and comes back), that idle time is also counted. It is not an active-use stopwatch.', // ALTA
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
  'admin.analytics.ex.note': '"—" = no start event (vocab_lesson/unit_checkpoint/challenge) or no score concept for that type. Popularity (completed) and performance (average score) are separate columns on purpose: a heavily done exercise is not necessarily an exercise with a high score.', // ALTA
  'admin.analytics.funnel.started': 'Started', // ALTA
  'admin.analytics.funnel.completed': 'Completed', // ALTA
  'admin.analytics.funnel.goodScore': 'Scored well ✓', // ALTA
  'admin.analytics.funnel.avgScore': 'Average score', // ALTA
  'admin.analytics.funnel.title': 'Funnel: started → completed → scored well', // ALTA
  'admin.analytics.funnel.note': 'Only types with a start event enter the funnel (same limitation as the overall completion rate). "Answered" (per individual question) does not exist as an event: the funnel goes straight from "started" to "completed". "Scored well" = average score ≥ 80%, same cutoff as the "Score over 80%" challenge.', // ALTA
  'admin.analytics.funnel.empty': 'No type with a start event had activity in the period.', // ALTA
  'admin.analytics.lang.events': 'Events by language', // ALTA
  'admin.analytics.lang.filterActive': 'Language filter active ({lang}). To compare languages side by side, select "All languages" in the filter above.', // ALTA
  'admin.analytics.lang.note': 'Segmentation by level/feature/exercise/cohort/user type already exists in the Progression, Exercises and Retention tabs and in the "Exclude my activity" toggle, so it is not repeated here as global filters to avoid meaningless combinations (e.g. level does not apply to a "tab_switch").', // ALTA
  'admin.analytics.prog.byLevel': 'Students by level', // ALTA
  'admin.analytics.prog.levelNote': 'Only covers units of the app language in which this Panel is open now. Events from the other language fall under "Unknown level" (each site only loads its own language content).', // ALTA
  'admin.analytics.prog.units': 'Units completed per student (checkpoints)', // ALTA
  'admin.analytics.prog.unitsNote': 'Not every unit has internal lessons (e.g. grammar units in French): those count as a single block of exercises, and completing them generates a checkpoint with no matching "lesson completed". Units with lessons only generate the checkpoint after going through all of them. That is why a student can appear here with more completed units than completed lessons.', // ALTA
  'admin.analytics.prog.lessons': 'Lessons completed per student', // ALTA
  'admin.analytics.prog.lessonsNote': '"Level advancement" (speed of progression between levels over time) is left for a future stage: it would require tracking the same account across several periods, not just one slice.', // ALTA
  'admin.analytics.dev.noData': 'All events in the period are from before device collection existed (migration 009), which is why they fall under "unknown". New data is already classified.', // ALTA
  'admin.analytics.dev.type': 'Device type', // ALTA
  'admin.analytics.dev.browser': 'Browser', // ALTA
  'admin.analytics.dev.os': 'Operating system', // ALTA
  'admin.analytics.dev.osNote': 'Classification by navigator.userAgent (simple heuristic, no library). It is not 100% accurate, but it is the acceptable standard without third-party telemetry.', // ALTA
  'admin.analytics.eng.perSession': 'Exercises/session', // ALTA
  'admin.analytics.eng.reviewsDone': 'Reviews completed', // ALTA
  'admin.analytics.eng.challengesDone': 'Challenges completed', // ALTA
  'admin.analytics.eng.freqNote': 'Study frequency (active days per student) is already in the Activity tab, so it is not repeated here.', // ALTA
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
  'admin.analytics.eng.xpNote1': 'XP uses the same week (Monday to Sunday) already shown in the Leaderboard. It is not "XP earned in the period selected above", it is always the current week. "Average XP/student" divides by the total of active students in the period (not just those who already earned XP this specific week). An active student with no XP this week still counts, with 0.', // ALTA
  'admin.analytics.tech.errors': 'Errors and failures', // ALTA
  'admin.analytics.tech.total': 'Recorded errors', // ALTA
  'admin.analytics.tech.affected': 'Affected students', // ALTA
  'admin.analytics.tech.noErrors': 'No technical errors recorded in the period.', // ALTA
  'admin.analytics.tech.note': 'Covers JavaScript errors, rejected promises, audio load/play failures and progress save failures, all deduplicated per session (a repeating error does not inflate the count). There is no video category: the app has no video content.', // ALTA
  'admin.analytics.tech.perf': 'Performance', // ALTA
  'admin.analytics.tech.loadAvg': 'Average load time', // ALTA
  'admin.analytics.tech.loadMedian': 'Median load time', // ALTA
  'admin.analytics.tech.samples': { one: '{n} session measured (Navigation Timing API, one record per page load).', other: '{n} sessions measured (Navigation Timing API, one record per page load).' }, // ALTA
  'admin.analytics.tech.noPerf': 'No performance measurements in the period.', // ALTA
  'admin.analytics.tech.separateNote': 'This tab is conceptually separate from Learning/Product: it never adds technical errors together with completion rate, average score, etc. A low TECHNICAL score here does not mean the content is hard, and the opposite also holds.', // ALTA
  'admin.analytics.ret.empty': 'No accounts found to build cohorts.', // ALTA
  'admin.analytics.ret.title': 'Retention by cohort (signup week)', // ALTA
  'admin.analytics.ret.col.cohort': 'Cohort', // ALTA
  'admin.analytics.ret.col.d1': 'Day 1', // ALTA
  'admin.analytics.ret.col.d7': 'Day 7', // ALTA
  'admin.analytics.ret.col.d14': 'Day 14', // ALTA
  'admin.analytics.ret.col.d30': 'Day 30', // ALTA
  'admin.analytics.ret.note': 'Cohort = students whose account was created in the same week (Monday to Sunday). "Day N" = had at least one recorded activity on the calendar day that falls exactly N days after account creation; "—" when the cohort has not yet completed that number of days (never shown as 0%). Uses the full available history (up to the 5000 most recent events), not the period filter in the controls above: retention is a question about all time, not a window.', // ALTA
  'adminChallenges.import.invalidJson': 'Invalid JSON: ', // ALTA
  'adminChallenges.import.expectedArray': 'Expected an array of challenges, or an object with "accepted" (direct pipeline output).', // ALTA
  'adminChallenges.import.itemN': 'item #{n}', // ALTA
  'adminChallenges.import.missing': '{label}: missing id/type/level', // ALTA
  'adminChallenges.import.badType': '{id}: invalid type ("{type}")', // ALTA
  'adminChallenges.import.badLevel': '{id}: invalid level ("{level}")', // ALTA
  'adminChallenges.import.badRegister': '{id}: expression without a valid register (register: formal, neutral, familiar, slang or vulgar)', // ALTA
  'adminChallenges.import.dupId': '{id}: id already exists (duplicate)', // ALTA
  'adminChallenges.persist.failed': 'Could not save to the database: ', // ALTA
  'adminChallenges.import.importing': 'Importing…', // ALTA
  'adminChallenges.import.btn': 'Import', // ALTA
  'adminChallenges.import.dbFail': '❌ Failed to write to the database: {error}', // ALTA
  'adminChallenges.import.ok': { one: '✅ {n} challenge imported as pending review.', other: '✅ {n} challenges imported as pending review.' }, // ALTA
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
  'adminChallenges.loadFailed': '⚠ We could not load the challenges right now. Check your connection and try again. This does NOT mean the queue is empty.', // ALTA
  'adminChallenges.section.noResults': 'No results in this section with the current filter.', // ALTA
  'adminChallenges.section.pending': 'Pending review', // ALTA
  'adminChallenges.section.pendingEmpty': 'No challenges pending review.', // ALTA
  'adminChallenges.section.published': 'Published', // ALTA
  'adminChallenges.section.publishedEmpty': 'No challenges published yet.', // ALTA
  'adminChallenges.section.unpublished': 'Unpublished', // ALTA
  'adminChallenges.section.unpublishedEmpty': 'No unpublished challenges.', // ALTA
  'adminChallenges.bulk.confirm': { one: 'Approve and publish {n} selected challenge? Only those with no problem in the quality checklist are published automatically. The rest stay pending for individual review.', other: 'Approve and publish {n} selected challenges? Only those with no problem in the quality checklist are published automatically. The rest stay pending for individual review.' }, // ALTA
  'adminChallenges.bulk.approving': 'Approving…', // ALTA
  'adminChallenges.bulk.published': { one: '{published} challenge published.', other: '{published} challenges published.' }, // ALTA
  'adminChallenges.bulk.publishedSkipped': 'Published: {published}. Skipped because of a problem in the checklist: {skipped}. Review one by one: {list}', // ALTA
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
  'admin.modal.report.noEmail': 'No email associated with this report (guest who did not provide an email). It is not possible to reply.', // ALTA
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
  'flashcardPreview.modal.hint': 'This is only a preview of how the card will look in Review. Nothing is saved or graded here.', // ALTA
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
  'ui.conj.sub': 'Choose the verbs and the verb tenses.', // ALTA
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
  'ui.myCards.sub': 'Create your own flashcards: words and phrases you want to memorize, even if they\'re not in the path.', // ALTA
  'ui.materials.sub': 'Summaries, links and files your teacher shared with you.', // ALTA
  'ui.dictation.sub': 'Train your listening and spelling with dictations based on real tasks from each module.', // ALTA
  'ui.dictation.step1': 'Listen to the audio, at normal speed or slowly, as many times as you like.', // ALTA
  'ui.dictation.step2': 'Type exactly what you heard, with accents and punctuation.', // ALTA
  'ui.dictation.step3': 'Click "Verificar" to compare your answer with the original text.', // MÉDIA
  'ui.dictation.step4': 'See what you got right and what needs review, word by word.', // ALTA
  'ui.challenges.backToCategories': '← Back to categories', // ALTA
  'ui.profileEdit.username': 'Your public username', // ALTA
  // Editar perfil (2026-10-18): textos novos aprovados pela autora; perfil é o mesmo em todos os cursos.
  'ui.profileEdit.title': 'Your profile, your way', // ALTA
  'ui.profileEdit.identityTitle': 'Your identity', // ALTA
  'ui.profileEdit.identityText': 'Choose how people get to know you.', // ALTA
  'ui.profileEdit.subtitle': 'Choose how you show up in the community.', // ALTA
  'ui.profileEdit.changePhoto': 'Change photo', // ALTA
  'ui.profileEdit.changePhotoAria': 'Change profile photo', // ALTA
  'ui.profileEdit.removePhoto': 'Remove photo', // ALTA
  'ui.profileEdit.name': 'Display name', // ALTA
  'ui.profileEdit.nameHint': 'The name shown on your profile.', // ALTA
  'ui.profileEdit.usernamePh': 'yourusername', // ALTA
  'ui.profileEdit.usernameHint': 'Your username is permanent and can\'t be changed.', // ALTA
  'ui.profileEdit.bio': 'About you', // ALTA
  'ui.profileEdit.bioPh': 'Tell people a bit about you, your interests and what you\'re learning.', // ALTA
  'ui.profileEdit.shareTitle': 'Share your journey', // ALTA
  'ui.profileEdit.sharePublic': 'On: anyone with an account on the site can see your photo, your progress and your public Decks, and can find you in search.', // ALTA
  'ui.profileEdit.sharePrivate': 'Off: only your friends and your teacher, if you have one, can see that. Everyone else sees just your name, your @ and your featured achievement, and can only find you by your exact @.', // ALTA
  'ui.profileEdit.shareHelper': 'You decide what to share, and you can change it anytime.', // ALTA
  'ui.profileEdit.save': 'Save profile', // ALTA
  'ui.profileEdit.publicProfile': 'Public profile', // ALTA
  'ui.profileEdit.publicProfileSub': 'On: anyone with an account sees your photo, progress and public decks. Off: only friends and your teacher do; others see just your name, @ and badges, and can only find you by your exact @.', // ALTA
  'ui.profileEdit.featuredBadge': 'Featured badge (shown in the Leaderboard)', // ALTA
  'ui.kbd.title': '⌨️ Keyboard shortcuts', // ALTA
  'ui.kbd.choose': 'Pick an option by its position on screen', // ALTA
  'ui.kbd.confirm': 'Confirm a typed answer and move on to the next one', // ALTA
  'ui.kbd.replay': 'Play audio again', // ALTA
  'ui.kbd.note': 'The numbers only appear when an exercise has options to choose from, never during typing or the sentence-ordering exercise. "r" repeats the last audio that played on screen.', // ALTA
  'ui.streak.sub': 'Come back tomorrow to keep your streak going.', // ALTA
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
  'feedback.label.yourAnswer': 'Your answer', // ALTA
  'lesson.step.dialogueCheck': 'Did you understand?', // ALTA
  // Passo Diálogo das lições, fr e zh (antes era texto fixo em português).
  'dlg.label': 'Dialogue', // ALTA
  'dlg.playFromAria': '{name}: play from this line', // ALTA
  'dlg.lineTrAria': 'Show the translation of this line', // ALTA
  'dlg.playAll': '▶ Play all', // ALTA
  'dlg.stop': '⏸ Stop', // ALTA
  'dlg.autoOn': 'Autoplay audio: on', // ALTA
  'dlg.autoOff': 'Autoplay audio: off', // ALTA
  'dlg.showTr': '🌐 Show translations', // ALTA
  'dlg.hideTr': '🌐 Hide translations', // ALTA
  'dlg.legend': 'The colored words are from this unit\'s vocabulary. Tap one to see what it means.', // ALTA
  'dlg.tapToPlayToast': '🔇 Tap "Play all" to hear the conversation', // ALTA
  'dlg.checkScene': 'Without looking at the dialogue: what did you understand from the conversation?', // ALTA
  // Perguntas do diálogo das lições ("Você entendeu?"), fr e zh (antes eram texto fixo em português).
  'dlgCheck.fill': 'Complete the reply', // ALTA
  'dlgCheck.listen': 'Listen and choose the reply', // ALTA
  'dlgCheck.listenAria': 'Play the line', // ALTA
  'dlgCheck.tapAgain': 'tap to hear it again', // ALTA
  'dlgCheck.comprehension': 'Comprehension', // ALTA
  'dlgCheck.progressAria': 'Question {n} of {total}', // ALTA
  'dlgCheck.right': '✅ That\'s right!', // ALTA
  'dlgCheck.almost': 'Almost! The right answer was:', // ALTA
  'dlgCheck.finish': 'Finish', // ALTA
  'dlgCheck.next': 'Next question →', // ALTA
  'dlgCheck.summary': '{n} of {total} correct.', // ALTA
  'dlgCheck.allRight': 'You understood the conversation!', // ALTA
  'dlgCheck.tryAgain': 'Listen again and try once more whenever you like.', // ALTA
  'dlgCheck.redo': 'Redo the questions', // ALTA
  'lesson.vocabDots.aria': 'Word {pos} of {total}', // ALTA
  'zh.exercise.translateToChinese': 'Translate into Chinese', // ALTA
  'zh.reorder.tapHint': 'Tap the blocks in the right order. Tap a placed one to send it back.', // ALTA
  'fr.reorder.tapHint': 'Tap the words in the right order. Tap a placed one to send it back.', // ALTA
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
  'badge.catalog.ambassador.name.f': 'Ambassador', // ALTA -- Etapa 4: nome pelo gênero
  'badge.catalog.ambassador.name.m': 'Ambassador', // ALTA -- Etapa 4: nome pelo gênero
  'badge.catalog.ambassador.desc': 'Spread the word about the app to other people', // MÉDIA
  'badge.catalog.pioneer.name': 'Pioneer', // MÉDIA
  'badge.catalog.pioneer.name.f': 'Pioneer', // ALTA -- Etapa 4: nome pelo gênero
  'badge.catalog.pioneer.name.m': 'Pioneer', // ALTA -- Etapa 4: nome pelo gênero
  'badge.catalog.pioneer.desc': 'Among the first people to use the app in its early phase', // MÉDIA
  'badge.catalog.student.name': 'Prof. Brune\'s student', // MÉDIA
  'badge.catalog.student.desc': 'Studies with Prof. Brune', // MÉDIA -- Etapa 4: aprovado pela dona
  'badge.catalog.teacherClass.name': '{name}\'s class', // ALTA -- Etapa 4: badge de cada professora (student_<...>, 115)
  'badge.catalog.teacherClass.desc': 'Studies with this teacher.', // ALTA -- Etapa 4
  'badge.track.days.title': 'First Step', // ALTA
  'badge.track.days.1': 'First Step', // ALTA
  'badge.track.days.2': 'Getting the Hang of It', // ALTA
  'badge.track.days.3': 'Hitting the Road', // ALTA
  'badge.track.days.4': 'Good Pace', // ALTA
  'badge.track.days.5': 'Giant Leap', // ALTA
  'badge.track.days.6': 'Unstoppable', // ALTA
  'badge.track.days.goal': 'Study on {n} different days', // ALTA
  'badge.track.days.goal.1': 'Study for the first time', // ALTA
  'badge.track.review.title': 'Reviews', // ALTA
  'badge.track.review.1': 'Review Apprentice', // ALTA
  'badge.track.review.1.f': 'Review Apprentice', // ALTA
  'badge.track.review.1.m': 'Review Apprentice', // ALTA
  'badge.track.review.2': 'Junior Reviewer', // ALTA
  'badge.track.review.2.f': 'Junior Reviewer', // ALTA
  'badge.track.review.2.m': 'Junior Reviewer', // ALTA
  'badge.track.review.3': 'Senior Reviewer', // ALTA
  'badge.track.review.3.f': 'Senior Reviewer', // ALTA
  'badge.track.review.3.m': 'Senior Reviewer', // ALTA
  'badge.track.review.4': 'Review Master', // ALTA
  'badge.track.review.goal': 'Do {n} reviews', // ALTA
  'badge.track.streak.title': 'Streak', // ALTA
  'badge.track.streak.1': 'Spark', // ALTA
  'badge.track.streak.2': 'One Week!', // ALTA
  'badge.track.streak.3': 'Flame On', // ALTA
  'badge.track.streak.4': 'A Month on Fire', // ALTA
  'badge.track.streak.5': 'Bonfire', // ALTA
  'badge.track.streak.6': 'Volcano', // ALTA
  'badge.track.streak.7': 'Eternal Flame', // ALTA
  'badge.track.streak.goal': 'Study {n} days in a row', // ALTA
  'badge.track.xp.title': 'XP', // ALTA
  'badge.track.xp.1': 'First Points', // ALTA
  'badge.track.xp.2': 'Adding Up', // ALTA
  'badge.track.xp.3': 'A Thousand and Counting', // ALTA
  'badge.track.xp.4': 'Pile of Points', // ALTA
  'badge.track.xp.5': 'Mountain of XP', // ALTA
  'badge.track.xp.6': 'XP Legend', // ALTA
  'badge.track.xp.goal': 'Earn {n} XP', // ALTA
  'badge.track.course1.title': 'Level {level}', // ALTA
  'badge.track.course1.1': 'First Unit', // ALTA
  'badge.track.course1.2': 'Halfway Through {level}', // ALTA
  'badge.track.course1.3': '{level} Complete', // ALTA
  'badge.track.course1.4': '{level} Aced', // ALTA
  'badge.track.course1.goal.1': 'Finish the first unit of {level}', // ALTA
  'badge.track.course1.goal.2': 'Finish {n} units of {level}', // ALTA
  'badge.track.course1.goal.3': 'Finish every unit of {level}', // ALTA
  'badge.track.course1.goal.4': 'Score 100% on every checkpoint of {level}', // ALTA
  'badge.track.ear.title': 'Listening', // ALTA
  'badge.track.ear.1': 'Curious Ear', // ALTA
  'badge.track.ear.2': 'Trained Ear', // ALTA
  'badge.track.ear.3': 'Sharp Ear', // ALTA
  'badge.track.ear.4': 'Perfect Pitch', // ALTA
  'badge.track.ear.goal': 'Play {n} audio clips', // ALTA
  'badge.track.explore.title': 'Explorer', // ALTA
  'badge.track.explore.1': 'Looking Around', // ALTA
  'badge.track.explore.2': 'Exploring Everything', // ALTA
  'badge.track.explore.3': 'Knows Every Corner', // ALTA
  'badge.track.explore.goal': 'Use {n} different study modes', // ALTA
  'badge.track.explore.goal.3': 'Use every study mode on the site', // ALTA
  'badge.track.weekend.title': 'Weekends', // ALTA
  'badge.track.weekend.1': 'Weekend', // ALTA
  'badge.track.weekend.2': 'Sunday Study', // ALTA
  'badge.track.weekend.3': 'No Days Off', // ALTA
  'badge.track.weekend.4': 'Half a Year of Saturdays', // ALTA
  'badge.track.weekend.5': 'A Year Without a Break', // ALTA
  'badge.track.weekend.goal': 'Study on Saturday and Sunday on {n} weekends', // ALTA
  'badge.track.weekend.goal.1': 'Study on both Saturday and Sunday of one weekend', // ALTA
  'badge.track.vocab.title': 'Vocabulary', // ALTA
  'badge.track.vocab.1': 'First Words', // ALTA
  'badge.track.vocab.2': 'Word by Word', // ALTA
  'badge.track.vocab.3': 'Pocket Dictionary', // ALTA
  'badge.track.vocab.4': 'Walking Dictionary', // ALTA
  'badge.track.vocab.goal': 'Learn {n} words', // ALTA
  'badge.track.aced.title': 'Aced It', // ALTA
  'badge.track.aced.1': 'Aced It!', // ALTA
  'badge.track.aced.2': 'Bullseye', // ALTA
  'badge.track.aced.3': 'Sharpshooter', // ALTA
  'badge.track.aced.4': 'Perfect Score', // ALTA
  'badge.track.aced.goal': 'Score 100% on {n} checkpoints', // ALTA
  'badge.track.aced.goal.1': 'Score 100% on a checkpoint', // ALTA
  'badge.track.aced.goal.4': 'Score 100% on every checkpoint of {level}', // ALTA
  'badge.track.dictation.title': 'Dictation', // ALTA
  'badge.track.dictation.1': 'Careful Listener', // ALTA
  'badge.track.dictation.2': 'Sharp Listener', // ALTA
  'badge.track.dictation.3': 'Perfect Listener', // ALTA
  'badge.track.dictation.goal': 'Score 90% or more on {n} dictations (retries count too)', // ALTA
  'badge.track.challenge.title': 'Challenges', // ALTA
  'badge.track.challenge.1': 'Up for Anything', // ALTA
  'badge.track.challenge.2': 'Challenger', // ALTA
  'badge.track.challenge.3': 'Unbeatable', // ALTA
  'badge.track.challenge.goal': 'Finish {n} challenges', // ALTA
  'badge.track.challenge.goal.3': 'Finish every challenge', // ALTA
  'badge.track.podium.title': 'Podium', // ALTA
  'badge.track.podium.1': 'Top of the Podium', // ALTA
  'badge.track.podium.2': 'Champion of the Week', // ALTA
  'badge.track.podium.2.f': 'Champion of the Week', // ALTA
  'badge.track.podium.2.m': 'Champion of the Week', // ALTA
  'badge.track.podium.3': 'Dynasty', // ALTA
  'badge.track.podium.goal': 'Finish {n} weeks in 1st place among your friends', // ALTA
  'badge.track.podium.goal.1': 'Finish a week in 1st place among your friends', // ALTA
  'badge.track.friends.title': 'Friends', // ALTA
  'badge.track.friends.1': 'First Friend', // ALTA
  'badge.track.friends.2': 'Study Crew', // ALTA
  'badge.track.friends.3': 'Study Squad', // ALTA
  'badge.track.friends.goal': 'Have {n} friends', // ALTA
  'badge.track.friends.goal.1': 'Make your first friend', // ALTA
  'badge.track.comeback.title': 'Back in the Game', // ALTA
  'badge.track.comeback.1': 'Back in the Game', // ALTA
  'badge.track.comeback.goal.1': 'Come back to studying a few days after stopping', // ALTA
  'badge.ui.levelOf': 'Level {n} of {total}', // ALTA
  'badge.ui.locked': 'Locked', // ALTA
  'badge.ui.maxLevel': 'Max level', // ALTA
  'badge.ui.classic': 'Classic', // ALTA
  'badge.ui.newBadge': 'New achievement!', // ALTA
  'badge.ui.levelUp': 'Level up!', // ALTA
  'badge.ui.count': '{n} of {total} levels', // ALTA
  'badge.ui.classicTitle': 'Classics', // ALTA
  'friends.received.rowBadge': '{name} reacted {r} to your {badge} achievement', // ALTA
  'friends.feed.badgeLevel': '{name} reached {badge}', // ALTA

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
  // ---- Amigos + Ranking de Amigos ----
  'friends.timeNow': 'just now', // ALTA
  'friends.timeHours': { one: '{n} hour ago', other: '{n} hours ago' }, // ALTA
  'friends.timeDays': { one: '{n} day ago', other: '{n} days ago' }, // ALTA
  'friends.error.not_authenticated': 'Sign in to use friends.', // ALTA
  'friends.error.invalid_target': 'You can\'t add yourself.', // ALTA
  'friends.error.not_found': 'We couldn\'t find that person.', // ALTA
  'friends.error.already_friends': 'You\'re already friends.', // ALTA
  'friends.error.already_sent': 'You already sent a request to this person.', // ALTA
  'friends.error.declined_recently': 'That request was declined recently. Try again in a few days.', // ALTA
  'friends.error.daily_request_limit': 'You\'ve reached the limit of 20 requests per day. Try again tomorrow.', // ALTA
  'friends.error.friend_limit_reached': 'You\'ve reached the limit of 100 friends.', // ALTA
  'friends.error.target_friend_limit': 'This person has reached the friend limit.', // ALTA
  'friends.error.no_pending_request': 'That request doesn\'t exist anymore.', // ALTA
  'friends.error.not_friends': 'You\'re no longer friends.', // ALTA
  'friends.error.not_accepting_requests': 'This person isn\'t accepting new friend requests right now.', // ALTA
  'friends.error.generic': 'Couldn\'t complete that right now. Try again.', // ALTA
  'friends.ariaNewRequests': { one: 'Friends, {n} new request', other: 'Friends, {n} new requests' }, // ALTA
  'friends.chip.unavailable': 'Unavailable for now', // ALTA
  'friends.chip.sent': 'Request sent', // ALTA
  'friends.btn.cancel': 'Cancel', // ALTA
  'friends.btn.accept': 'Accept', // ALTA
  'friends.btn.decline': 'Decline', // ALTA
  'friends.btn.add': 'Add', // ALTA
  'friends.guestNote': 'Sign in to add friends and see the ranking among you.', // ALTA
  'friends.loading': 'Loading friends...', // ALTA
  'friends.loadError': 'Couldn\'t load your friends right now.', // ALTA
  'friends.retry': 'Try again', // ALTA
  'friends.inviteBanner': 'You opened {user}\'s invite. Tap "Add" to send the request.', // ALTA
  'friends.searchLabel': 'Search by name or @username', // ALTA
  'friends.section.friends': 'Your friends', // ALTA
  'friends.btn.remove': 'Unfriend', // ALTA
  'friends.section.outgoing': 'Sent requests', // ALTA
  'friends.loadingShort': 'Loading...', // ALTA
  'friends.scopeAll': 'All', // ALTA
  'friends.scopeAria': 'Friends\' ranking language', // ALTA
  'friends.rank.miniError': 'Couldn\'t load the ranking right now.', // ALTA
  'friends.rank.seeFull': 'See full ranking', // ALTA
  'friends.activity.error': 'Couldn\'t load the activity right now.', // ALTA
  'friends.activity.empty': 'Nothing new in the last 30 days. When your friends earn achievements, they show up here.', // ALTA
  'friends.activity.aFriend': 'A friend', // ALTA
  'friends.activity.earned': '{name} earned {badge}', // ALTA
  'friends.pref.notify_requests': 'Notify me when someone sends me a friend request', // ALTA
  'friends.pref.notify_accepts': 'Notify me when someone accepts my request', // ALTA
  'friends.pref.notify_overtakes': 'Notify me when a friend passes me in the ranking', // ALTA
  'friends.pref.accept_requests': 'Accept new friend requests', // ALTA
  'friends.prefs.error': 'Couldn\'t load your preferences right now.', // ALTA
  'friends.prefs.hint': 'If you turn off "Accept new requests", anyone who tries to add you sees that you aren\'t accepting requests right now. Your current friends don\'t change.', // ALTA
  'friends.toast.saveError': 'Couldn\'t save right now. Try again.', // ALTA
  'friends.toast.prefSaved': '✓ Preference saved.', // ALTA
  'friends.toast.linkError': 'Couldn\'t generate your link right now.', // ALTA
  'friends.shareText': 'Want to study with me? Come in and add me as a friend:', // ALTA
  'friends.shareTitle': 'Study with me', // ALTA
  'friends.toast.linkCopied': '✓ Link copied!', // ALTA
  'friends.promptCopy': 'Copy your invite link:', // ALTA
  'friends.searchMin': 'Type at least 3 letters.', // ALTA
  'friends.searching': 'Searching...', // ALTA
  'friends.searchError': 'Couldn\'t search right now.', // ALTA
  'friends.searchEmpty': 'No one found. Check the name or @username.', // ALTA
  'friends.confirmRemove': 'Unfriend? You\'ll no longer appear in each other\'s ranking.', // ALTA
  'friends.toast.nowFriends': 'You\'re now friends! 🎉', // ALTA
  'friends.toast.sent': 'Request sent!', // ALTA
  'friends.toast.accepted': 'Friendship accepted! 🎉', // ALTA
  'friends.toast.removed': 'Friendship removed.', // ALTA
  'friends.mode.aria': 'Ranking type', // ALTA
  'friends.mode.friends': 'Friends', // ALTA
  'friends.mode.all': 'Global', // ALTA
  'friends.rank.loadError': 'Couldn\'t load right now.', // ALTA
  'friends.rank.sideNoFriends': 'You don\'t have any friends in the ranking yet.', // ALTA
  'friends.rank.addFriendLink': 'Add a friend →', // ALTA
  'friends.rank.failTitle': 'Couldn\'t load', // ALTA
  'friends.rank.failText': 'Try again in a moment.', // ALTA
  'friends.rank.noFriendsTitle': 'Compare your XP with friends', // ALTA
  'friends.rank.noFriendsText': 'Add friends to see who is studying the most this week.', // ALTA
  'friends.rank.noFriendsBtn': 'Add a friend', // ALTA
  'friends.rank.footnoteFriends': 'The ranking resets every Monday. Friends who haven\'t earned XP yet appear at the end.', // ALTA
  'friends.title': 'Friends', // ALTA
  'friends.inviteBtn': '＋ Invite friends', // ALTA
  'friends.requests.title': { one: '{n} person wants to study with you', other: '{n} people want to study with you' }, // ALTA
  'friends.btn.notNow': 'Not now', // ALTA
  'friends.week.title': 'This week\'s challenge', // ALTA
  'friends.week.endsIn': { one: 'ends today', other: 'ends in {n} days' }, // ALTA
  'friends.week.you': 'You', // ALTA
  'friends.week.place': 'Place {n}', // ALTA
  'friends.duel.behind': { one: '{n} XP to go to pass {name}', other: '{n} XP to go to pass {name}' }, // ALTA
  'friends.duel.ahead': { one: 'You\'re in the lead, {n} XP ahead of {name}!', other: 'You\'re in the lead, {n} XP ahead of {name}!' }, // ALTA
  'friends.duel.tie': 'Tied with {name}! A little more study and you take the lead.', // ALTA
  'friends.duel.noOne': 'Nobody has scored yet this week. Study today and get ahead!', // ALTA
  'friends.card.more': 'Options for {name}', // ALTA
  'friends.card.viewProfile': 'View profile', // ALTA
  'friends.empty.title': 'Studying together is more fun', // ALTA
  'friends.empty.text': 'Invite someone to compete for XP with you every week.', // ALTA
  'friends.empty.searchLabel': 'Or search by name or @username', // ALTA
  'friends.empty.step1': 'A ranking just for you and your friends, every week', // ALTA
  'friends.empty.step2': 'A heads-up when a friend passes you', // ALTA
  'friends.empty.step3': 'See your friends\' achievements', // ALTA
  'friends.prefs.sectionTitle': 'Friends', // ALTA
  'friends.streak.aria': { one: '{n}-day streak', other: '{n}-day streak' }, // ALTA
  'friends.streak.today': 'studied today', // ALTA
  'friends.feed.streak': '{name} reached a {n}-day streak', // ALTA
  'friends.cheer.btn': '👏 Congratulate', // ALTA
  'friends.cheer.aria': 'Pick a reaction', // ALTA
  'friends.cheer.done': 'You reacted {r}', // ALTA
  'friends.cheer.thanked': '{name} said thanks 💛', // ALTA
  'friends.cheer.count': { one: '{n} cheer', other: '{n} cheers' }, // ALTA
  'friends.received.title': 'Cheers for you', // ALTA
  'friends.received.row': '{name} reacted {r} to your {n}-day streak', // ALTA
  'friends.received.thank': 'Say thanks 💛', // ALTA
  'friends.received.thanked': 'You said thanks ✓', // ALTA
  'friends.toast.cheered': 'Cheer sent! {r}', // ALTA
  'friends.toast.thanked': 'Thanks sent 💛', // ALTA
  'friends.error.daily_congrats_limit': 'You already sent 20 cheers today. More tomorrow!', // ALTA
  'friends.error.target_not_found': 'This milestone is no longer available.', // ALTA
  'friends.pref.notify_congrats': 'Notify me when a friend congratulates or thanks me', // ALTA
  'friends.qr.btn': 'Show QR code', // ALTA
  'friends.qr.title': 'Your invite QR code', // ALTA
  'friends.qr.text': 'Show it to someone next to you: they point their phone camera at it, open the site and can add you right away.', // ALTA
  'friends.qr.alt': 'QR code of your invite link', // ALTA
  'friends.qr.close': 'Close', // ALTA
  'friends.qr.noLink': 'Couldn\'t create your link right now.', // ALTA
  'friends.qr.error': 'Couldn\'t show the QR code right now.', // ALTA
  'friends.suggest.title': 'Friend suggestions', // ALTA
  'friends.suggest.add': 'Add', // ALTA
  'friends.suggest.dismissAria': 'Don\'t suggest {name}', // ALTA
  'friends.suggest.reason.invite': 'Joined from your invite', // ALTA
  'friends.suggest.reason.invitedBy': 'Invited you to the site', // ALTA
  'friends.suggest.reason.classmate': 'Studies with the same teacher', // ALTA
  'friends.suggest.reason.partner': 'Also studies {lang}', // ALTA
  'friends.suggest.reason.ranking': 'Close to you in this week\'s ranking', // ALTA
  'friends.pref.suggest_me': 'Show me in other people\'s friend suggestions', // ALTA
  'badge.track.duo.title': 'Duo Missions', // ALTA
  'badge.track.duo.1': 'Dynamic Duo', // ALTA
  'badge.track.duo.2': 'Power Partnership', // ALTA
  'badge.track.duo.3': 'Unbeatable Duo', // ALTA
  'badge.track.duo.goal': 'Complete {n} duo missions', // ALTA
  'badge.track.duo.goal.1': 'Complete a duo mission', // ALTA
  'friends.duo.title': 'Duo mission', // ALTA
  'friends.duo.invite': 'Invite to a mission', // ALTA
  'friends.duo.inviteAria': 'Invite {name} to a duo mission', // ALTA
  'friends.duo.emptyText': 'Every Monday the site pairs you with a friend who studied the week before, and you each study 4 days by Sunday. No partner this week? Invite a friend from their card.', // ALTA
  'friends.duo.offText': 'You\'re not taking part in duo missions. To join again, turn on "Take part in duo missions" in Settings > Notifications > Friends.', // ALTA
  'friends.duo.pairTitle': 'Your partner this week: {name}', // ALTA
  'friends.duo.weekdays': 'M,T,W,T,F,S,S', // ALTA
  'friends.duo.you': 'You', // ALTA
  'friends.duo.weekAria': 'You studied {mine} of {goal} days and {name} {theirs} of {goal}', // ALTA
  'friends.duo.stripTitle': 'Duo mission with {name}', // ALTA
  'friends.duo.stripSub': 'You {mine}/{goal} days · {name} {theirs}/{goal}', // ALTA
  'friends.duo.lessonDay': 'Day {n} of {goal} in your mission with {name} ✓', // ALTA
  'friends.duo.lessonDone': 'Duo mission with {name} complete! 🎉', // ALTA
  'friends.pref.join_duo_missions': 'Take part in duo missions (every Monday, with a friend)', // ALTA
  'friends.duo.doneDays': { one: 'You each studied {n} day. A new partner comes on Monday.', other: 'You each studied {n} days. A new partner comes on Monday.' }, // ALTA
  'friends.duo.goalText': { one: 'You each study {n} day by Sunday.', other: 'You each study {n} days by Sunday.' }, // ALTA
  'friends.duo.toast.startedDays': { one: 'Mission started! You each study {n} day by Sunday 🤝', other: 'Mission started! You each study {n} days by Sunday 🤝' }, // ALTA
  'friends.duo.lessonRest': { one: '{n} more day for you by Sunday.', other: '{n} more days for you by Sunday.' }, // ALTA
  'friends.duo.lessonWaitPartner': { one: 'Your part is done! {name} needs {n} more day.', other: 'Your part is done! {name} needs {n} more days.' }, // ALTA
  'friends.duo.with': 'You and {name}', // ALTA
  'friends.duo.progress': '{done} of {goal} XP', // ALTA
  'friends.duo.barAria': 'Mission progress: {done} of {goal} XP', // ALTA
  'friends.duo.mine': 'You: {n} XP', // ALTA
  'friends.duo.theirs': '{name}: {n} XP', // ALTA
  'friends.duo.endsToday': 'Ends today', // ALTA
  'friends.duo.done': 'Mission complete! 🎉', // ALTA
  'friends.duo.doneText': 'You earned {goal} XP together. A new mission starts next week.', // ALTA
  'friends.nudge.btn': 'Nudge', // ALTA
  'friends.nudge.aria': 'Nudge {name} to study today', // ALTA
  'friends.nudge.done': 'Nudged', // ALTA
  'friends.nudge.atRisk': 'One lesson from {name} today keeps your streak together going', // ALTA -- Etapa 4: aprovado pela dona
  'friends.toast.nudged': 'Nudge sent 👋', // ALTA
  'friends.error.nudges_off': 'This person chose not to get nudges.', // ALTA
  'friends.error.already_studied': 'This person already studied today 🎉', // ALTA
  'friends.error.daily_nudge_limit': 'You\'ve already nudged 20 friends today. More tomorrow!', // ALTA
  'friends.error.invalid_goal': 'Pick one of the goals.', // ALTA
  'friends.error.already_in_mission': 'You\'re already on a duo mission this week.', // ALTA
  'friends.error.friend_in_mission': 'This friend is already on a mission this week. Pick someone else.', // ALTA
  'friends.pref.accept_nudges': 'Get nudges from friends (study reminders)', // ALTA
  'friends.pref.notify_missions': 'Notify me about duo missions (start and goal reached)', // ALTA
  'friends.push.title': 'Know right away what your friends are up to', // ALTA
  'friends.push.firstTitle': 'You\'ve got a friend! 🎉', // ALTA
  'friends.push.text': 'Turn on notifications on this device to get nudges, duo mission invites and congrats from your friends right away, even with the site closed.', // ALTA
  'friends.push.enable': 'Turn on notifications', // ALTA
  'friends.push.later': 'Not now', // ALTA
  'friends.push.done': 'Done! Your friends\' notifications will reach this device 🔔', // ALTA
  'friends.push.iosText': 'On iPhone and iPad, notifications only work with the site on your Home Screen: tap Share, then "Add to Home Screen". Then open the site from there and turn on notifications.', // ALTA
  'friends.push.iosOk': 'Got it', // ALTA
  'friends.duo.endsIn': { one: 'Ends in {n} day', other: 'Ends in {n} days' }, // ALTA
  'friends.joint.label': { one: '{n} day together', other: '{n} days together' }, // ALTA
  'friends.joint.aria': { one: 'You both studied {n} day in a row', other: 'You both studied {n} days in a row' }, // ALTA
  'friends.suggest.reason.mutual': { one: '{n} mutual friend', other: '{n} mutual friends' }, // ALTA
  'profile.tabFriends': 'Friends', // ALTA
  'panel.admin.sub': 'Badges, metrics, notifications, reports and plans.', // ALTA
  'panel.tab.badges': 'Badges', // ALTA
  'panel.tab.analytics': 'Analytics', // ALTA
  'panel.tab.notifications': 'Notifications', // ALTA
  'panel.tab.reports': 'Reports', // ALTA
  'panel.tab.plans': 'Plans', // ALTA
  'panel.tab.privacy': 'Privacy', // ALTA
  'panel.teacher.title': 'Teacher panel', // ALTA
  'panel.teacher.sub': 'Your students, their cards and classes, and the materials you share.', // ALTA
  'panel.teacher.aria': 'Teacher panel section', // ALTA
  'panel.teacher.nav': 'Teacher', // ALTA
  'panel.teacher.menu': '🎓 Teacher panel', // ALTA
  'panel.tbell.title': 'Student notifications', // ALTA
  'panel.tbell.hint': 'Notifications about your students in every language: who went quiet, board posts and invites. Notifications about your own studies stay in the bell at the top.', // ALTA
  'panel.tbell.markAll': 'Mark all as read', // ALTA
  'panel.tbell.empty': 'No notifications about students yet.', // ALTA
  'panel.tbell.err': 'Couldn\'t load the notifications right now. Try again in a moment.', // ALTA
  'panel.tbell.new': 'New', // ALTA
  'panel.tbell.unread': { one: '{n} new student notification', other: '{n} new student notifications' }, // ALTA
  'panel.tbell.otherLang': 'To reply, open the {lang} board.', // MÉDIA
  'panel.tbell.lang.frances': 'French', // ALTA
  'panel.tbell.lang.mandarim': 'Chinese', // ALTA
  'panel.tbell.lang.portugues': 'Portuguese', // ALTA
  'panel.tbell.ev.inactive': 'A few days without practice over there: {list}. A note from you can help them get back into the rhythm.', // ALTA -- Etapa 4: aprovado pela dona (mesmo tom da 114)
  'panel.tbell.days': { one: '{n} day', other: '{n} days' }, // ALTA
  'panel.tbell.ev.accepted': '{name} accepted your invitation and now studies {lang} with you 🎉', // ALTA -- Etapa 4: aprovado pela dona
  'panel.tbell.ev.joinedLink': '{name} joined through your link and now studies {lang} with you 🎉', // ALTA -- Etapa 4: aprovado pela dona
  'panel.tbell.ev.declined': '{name} declined the invitation to {lang} classes.', // ALTA (mesma frase da 104)
  'panel.tbell.ev.post': '{name} posted on the board: {snippet}', // ALTA (mesma frase da 104)
  'panel.tbell.ev.postClass': '{name} posted on the board (class {classroom}): {snippet}', // ALTA (mesma frase da 104)
  'panel.tbell.ev.comment': '{name} commented on the board: {snippet}', // ALTA (mesma frase da 104)
  'panel.tbell.ev.joinClass': '{name} joined the class {classroom} through your link', // ALTA (mesma frase da 104)
  'panel.tbell.ev.joinClassNew': '{name} joined the class {classroom} through your link and now studies {lang} with you 🎉', // ALTA -- Etapa 4: aprovado pela dona
  'panel.tab.students': 'Students', // ALTA
  'panel.tab.cards': 'Cards', // ALTA
  'panel.tab.classlogs': 'Classes', // ALTA
  'panel.tab.materials': 'Study materials', // ALTA
  'myClassLogs.menu': '📝 My classes', // ALTA
  'myClassLogs.title': 'My classes', // ALTA
  'myClassLogs.sub': 'What you worked on in each class with your teacher.', // ALTA
  'myClassLogs.topic': 'Topic', // ALTA
  'myClassLogs.homework': 'Homework', // ALTA
  'myClassLogs.observations': 'Notes', // ALTA
  'myClassLogs.empty': 'Your teacher hasn\'t logged any classes yet.', // ALTA
  'plans.title': 'Plans', // ALTA
  'plans.sub': 'Who has which plan and what each plan unlocks. Changes apply right away for Free, Student and Premium.', // ALTA
  'plans.loading': 'Loading…', // ALTA
  'plans.confirm.cancel': 'Cancel', // ALTA
  'plans.confirm.revoke.title': 'Remove {role} from @{username}?', // ALTA
  'plans.confirm.revoke.text': 'The account loses what this plan unlocks right away. You can give the plan back anytime.', // ALTA
  'plans.confirm.revoke.confirm': 'Remove plan', // ALTA
  'plans.confirm.perm.title': 'Turn off "{perm}" for {role}?', // ALTA
  'plans.confirm.perm.text': 'All accounts of this type lose this right away, unless they have another plan that unlocks it.', // ALTA
  'plans.confirm.perm.confirm': 'Turn off', // ALTA
  'notifications.title': 'Notifications', // ALTA
  'notifications.sub': 'The texts people get for each event. Each time, the app picks one active variant; the more variants, the less repetitive it feels.', // ALTA
  'notifications.loading': 'Loading notifications…', // ALTA
  'notifications.menu': 'Actions', // ALTA
  'notifications.delete': 'Delete', // ALTA
  'notifications.lang.fr': 'French', // ALTA
  'notifications.lang.zh': 'Chinese', // ALTA
  'notifications.filter.event.aria': 'Event', // ALTA
  'notifications.filter.event.all': 'All events', // ALTA
  'notifications.filter.lang.aria': 'App language', // ALTA
  'notifications.filter.lang.all': 'All languages', // ALTA
  'notifications.filter.channel.aria': 'Channel', // ALTA
  'notifications.filter.channel.all': 'All channels', // ALTA
  'notifications.search.placeholder': 'Search the text', // ALTA
  'notifications.search.aria': 'Search variant', // ALTA
  'notifications.empty.text': 'Create the first variant using the form next to the list.', // ALTA
  'notifications.empty.filtered': 'No variant matches these filters.', // ALTA
  'notifications.form.clear': 'Clear', // ALTA
  'notifications.edit.fixed': 'Event, channel and language cannot change after creation. To change them, create a new variant and delete this one.', // ALTA
  'notifications.edit.cancel': 'Cancel', // ALTA
  'notifications.delete.title': 'Delete this variant?', // ALTA
  'notifications.delete.text': '"{text}" will no longer be picked and this cannot be undone.', // ALTA
  'notifications.delete.confirm': 'Delete variant', // ALTA
  'badges.title': 'Badges', // ALTA
  'badges.sub': 'Create special badges and choose who gets them. They show up on the winner\'s profile.', // ALTA
  'badges.loading': 'Loading badges…', // ALTA
  'badges.menu': 'Actions', // ALTA
  'badges.edit': 'Edit', // ALTA
  'badges.delete': 'Delete', // ALTA
  'badges.card.manage': 'Manage people', // ALTA
  'badges.card.idTitle': 'Badge identifier', // ALTA
  'badges.catalog.emptyText': 'Create the first badge using the form next to the list.', // ALTA
  'badges.builtin.hint': 'These are given automatically by the app and cannot be edited here.', // ALTA
  'badges.filter.aria': 'Filter by badge', // ALTA
  'badges.filter.all': 'All badges', // ALTA
  'badges.search.placeholder': 'Search person or note', // ALTA
  'badges.search.aria': 'Search grants', // ALTA
  'badges.grants.emptyFiltered': 'No grant matches these filters.', // ALTA
  'badges.grants.colPerson': 'Person', // ALTA
  'badges.grants.colBadge': 'Badge', // ALTA
  'badges.grants.colNote': 'Note', // ALTA
  'badges.grants.colDate': 'Granted on', // ALTA
  'badges.grants.revokeAria': 'Revoke {badge} from @{username}', // ALTA
  'badges.form.id': 'Identifier', // ALTA
  'badges.form.idHint': 'Use only lowercase letters, numbers and _ (e.g. collaborator).', // ALTA
  'badges.edit.title': 'Edit badge', // ALTA
  'badges.edit.idHint': 'If you change the identifier, the grants follow the badge.', // ALTA
  'badges.edit.cancel': 'Cancel', // ALTA
  'badges.members.noteAria': 'Note for @{username}', // ALTA
  'badges.members.partial': 'Some changes were not saved ({n}). Check the list and try again.', // ALTA
  'badges.delete.title': 'Delete the badge "{name}"?', // ALTA
  'badges.delete.textWith': { one: 'The badge disappears from the profile of {n} person who got it. This cannot be undone.', other: 'The badge disappears from the profile of {n} people who got it. This cannot be undone.' }, // ALTA
  'badges.delete.textNone': 'Nobody has this badge yet. This cannot be undone.', // ALTA
  'badges.delete.confirm': 'Delete badge', // ALTA
  'badges.toast.revoked': '✓ Badge revoked.', // ALTA
  'reports.title': 'Reports', // ALTA
  'reports.loading': 'Loading reports…', // ALTA
  'reports.menu': 'Actions', // ALTA
  'reports.row.replied': 'replied', // ALTA
  'reports.row.repliedTitle': 'You already replied by email', // ALTA
  'reports.row.openAria': 'Open report: {category}', // ALTA
  'reports.empty.search': 'No report matches this search.', // ALTA
  'reports.col.report': 'Report', // ALTA
  'reports.col.who': 'Sent by', // ALTA
  'reports.col.where': 'Where', // ALTA
  'reports.col.date': 'Date', // ALTA
  'reports.col.status': 'Status', // ALTA
  'reports.count': '{n} reports in the list.', // ALTA
  'reports.count.truncated': 'Showing the {n} most recent. Use the filters to find older ones.', // ALTA
  'reports.filter.status.aria': 'Status', // ALTA
  'reports.filter.kind.aria': 'Type', // ALTA
  'reports.filter.lang.aria': 'Language', // ALTA
  'reports.search.placeholder': 'Search text, person or screen', // ALTA
  'reports.search.aria': 'Search reports', // ALTA
  'reports.reply.confirm.title': 'Send the reply to {who}?', // ALTA
  'reports.reply.confirm.text': 'The email "{subject}" is sent right now and cannot be undone.', // ALTA
  'reports.reply.confirm.ok': 'Send email', // ALTA
  'reports.reply.confirm.cancel': 'Back', // ALTA
  'analytics.title': 'Analytics', // ALTA
  'analytics.sub': 'How people use the app: who studies, what they do and where they get stuck. Only student accounts are counted; yours is left out.', // ALTA
  'analytics.loading': 'Loading numbers…', // ALTA
  'analytics.custom.from': 'From', // ALTA
  'analytics.custom.to': 'To', // ALTA
  'analytics.delta.flatAria': 'No change from the previous period', // ALTA
  'analytics.delta.upAria': 'Up {pct}% from the previous period', // ALTA
  'analytics.delta.downAria': 'Down {pct}% from the previous period', // ALTA
  'analytics.truncated.main': 'Heads up: the query hit the limit of {n} events, so these numbers may be lower than the real ones. Pick a shorter period, or a single language or device, to see everything.', // ALTA
  'analytics.truncated.retention': 'Heads up: the retention query hit the limit of {n} events. The farthest days (7, 14 and 30) may be lower than the real ones.', // ALTA
  'analytics.truncated.tech': 'Heads up: the technical query hit the limit of {n} events, so errors may be lower than the real ones. Pick a shorter period.', // ALTA
  'plans.grant.title': 'Give or remove a plan', // ALTA
  'plans.grant.hint': 'Search the account by name or @username. No billing yet: the plan stays on until you remove it.', // ALTA
  'plans.search.label': 'Account', // ALTA
  'plans.search.placeholder': 'Name or @username', // ALTA
  'plans.search.none': 'No account found for "{q}".', // ALTA
  'plans.search.short': 'Type at least 2 letters.', // ALTA
  'plans.search.error': 'Couldn\'t search right now. Try again.', // ALTA
  'plans.role.user': 'Free', // ALTA
  'plans.role.student': 'Student', // ALTA
  'plans.role.premium_basic': 'Premium Basic', // ALTA
  'plans.role.premium_pro': 'Premium Pro', // ALTA
  'plans.role.teacher': 'Teacher', // ALTA
  'plans.role.admin': 'Admin', // ALTA
  'plans.role.studentNote': 'Comes from the link with a teacher; it isn\'t granted here.', // ALTA
  'plans.role.adminNote': 'Admin has access to everything.', // ALTA
  'plans.granted': '{role} turned on for @{username}.', // ALTA
  'plans.revoked': '{role} removed from @{username}.', // ALTA
  'plans.failed': 'Couldn\'t save. Try again.', // ALTA
  'plans.loadFailed': 'Couldn\'t load this account\'s plans.', // ALTA
  'plans.matrix.title': 'What each plan unlocks', // ALTA
  'plans.matrix.hint': 'Accounts with more than one plan get all of them combined. For numbers the highest wins, and an empty field means no limit.', // ALTA
  'plans.matrix.roleOnly': 'Comes from the Teacher role', // ALTA -- Etapa 5
  'plans.matrix.roleOnlyHint': 'The Teacher rows (panel, analytics, board and Review Bank) come from the Teacher role and can\'t be changed here.', // ALTA -- Etapa 5
  'plans.matrix.permission': 'Permission', // ALTA
  'plans.matrix.unlimited': 'no limit', // ALTA
  'plans.matrix.saved': 'Saved', // ALTA
  'plans.matrix.loadFailed': 'Couldn\'t load the permissions table.', // ALTA
  'perm.own_cards_limit': 'Own cards (how many, counting all courses)', // ALTA
  'perm.rich_card_formats': 'All card types (with reverse, multiple choice, type the answer, fill in the blank)', // ALTA
  'perm.tts_monthly_quota': 'Text-to-speech audio and microphone recording (text-to-speech audios per month)', // ALTA
  'perm.public_deck_import': 'Import public Decks', // ALTA
  'perm.public_deck_copy_count': 'See how many people copied my Deck', // ALTA
  'perm.challenges_premium': 'Premium challenges', // ALTA
  'perm.conj_games': 'Conjugation Games', // ALTA -- Etapa 5
  'perm.trail_skip_locked': 'Skip units (Checkpoint)', // ALTA -- "Study Path", escolha da dona (2026-10-19)
  'perm.class_logs_view': 'See My classes', // ALTA
  'perm.support_materials_view': 'See study materials', // ALTA
  'perm.teacher_panel': 'Teacher panel', // ALTA
  'perm.teacher_student_analytics': 'Student analytics', // ALTA
  'perm.teacher_board': 'Class board', // ALTA
  'perm.review_bank': 'Review Bank (automatic cards for the student)', // ALTA -- Etapa 5 (antes aparecia em português)
  'plans.chip.premium': 'Premium', // ALTA
  'panel.students.inviteSoon': 'For now, students are linked by the admin. Soon you will be able to invite a student, who accepts from their own profile.', // ALTA
  'students.title': 'Students', // ALTA
  'students.count': { one: '{n} active student', other: '{n} active students' }, // ALTA
  'students.link.btn': 'Link a student', // ALTA
  'students.refresh': 'Refresh data', // ALTA
  'students.alert.stopped': { one: '{n} student has not studied for 7 days or more.', other: '{n} students have not studied for 7 days or more.' }, // ALTA
  'students.alert.see': 'Show who', // ALTA
  'students.ind.active': 'Active students', // ALTA
  'students.ind.byLang': '{n} in {lang}', // ALTA
  'students.ind.today': 'Studied today', // ALTA
  'students.ind.todayPct': '{pct}% of the class', // ALTA
  'students.ind.due': 'Reviews due', // ALTA
  'students.ind.dueSum': 'total across all students', // ALTA
  'students.ind.attention': 'Need attention', // ALTA
  'students.ind.attentionDetail': '{stopped} stopped, {warn} to watch', // ALTA
  'students.search.placeholder': 'Search by name or @username', // ALTA
  'students.search.aria': 'Search students', // ALTA
  'students.filter.course.all': 'All courses', // ALTA
  'students.filter.course.aria': 'Course', // ALTA
  'students.filter.attention': 'Only those who need attention', // ALTA
  'students.col.student': 'Student', // ALTA
  'students.col.course': 'Course', // ALTA
  'students.col.last': 'Last study', // ALTA
  'students.col.streak': 'Streak', // ALTA
  'students.col.due': 'Reviews due', // ALTA
  'students.col.status': 'Status', // ALTA
  'students.open': 'Open', // ALTA
  'students.situation.ok': 'On track', // ALTA
  'students.situation.warn': 'Watch', // ALTA
  'students.situation.stopped': 'Stopped', // ALTA
  'students.situation.none': 'No study yet', // ALTA
  'students.situation.rule': 'Status: On track studied in the last 3 days, Watch 4 to 6 days ago, Stopped 7 days or more.', // ALTA
  'students.streak.days': { one: '{n} day', other: '{n} days' }, // ALTA
  'students.empty.title': 'No students linked yet', // ALTA
  'students.empty.text': 'Once you link someone, their progress shows up here.', // ALTA
  'students.empty.filtered': 'No students match these filters.', // ALTA
  'students.loading': 'Loading students…', // ALTA
  'students.loading.count': '{done} of {total}', // ALTA
  'students.error.partial': { one: 'Could not load the data of {n} student. They appear without a status.', other: 'Could not load the data of {n} students. They appear without a status.' }, // ALTA
  'students.dialog.hint': 'A link applies to one course. The same person can be linked to another course later.', // ALTA
  'students.dialog.cancel': 'Cancel', // ALTA
  'students.crumb.aria': 'You are here', // ALTA
  'students.ficha.kicker': 'Student · {lang} · linked on {date}', // ALTA
  'students.ficha.level': 'Level {level} · {pct}%', // ALTA
  'students.act.class': 'Log a class', // ALTA
  'students.act.card': 'Create a card', // ALTA
  'students.act.more': 'More', // ALTA
  'students.act.remove': 'Remove link', // ALTA
  'students.remove.title': 'Remove the link with {name}?', // ALTA
  'students.remove.text': 'Progress and history are kept. You can link again later. The person just stops appearing in your list.', // ALTA
  'students.remove.confirm': 'Remove link', // ALTA
  'students.removed': 'Link removed.', // ALTA
  'students.ind.last': 'Last study', // ALTA
  'students.ind.lastAccess': 'last access: {when}', // ALTA
  'students.ind.noRecord': 'no record', // ALTA
  'students.ind.streak': 'Streak', // ALTA
  'students.ind.activeDays': { one: '{n} active day in the last 30', other: '{n} active days in the last 30' }, // ALTA
  'students.ind.dueCount': 'Reviews due', // ALTA
  'students.ind.dueOf': 'of {total} in the queue', // ALTA
  'students.ind.accuracy': 'Accuracy (7 days)', // ALTA
  'students.ind.accuracyOf': { one: 'over {n} reviewed card', other: 'over {n} reviewed cards' }, // ALTA
  'students.ind.accuracyNone': 'no reviews yet', // ALTA
  'students.block.progress': 'Course progress', // ALTA
  'students.progress.units': 'Units completed', // ALTA
  'students.progress.unitsValue': '{done} ({started} started)', // ALTA
  'students.progress.checkpoints': 'Checkpoints', // ALTA
  'students.progress.checkpointsNone': 'none yet', // ALTA
  'students.progress.checkpointsValue': 'best score {pct}%', // ALTA
  'students.progress.challenges': 'Challenges completed', // ALTA
  'students.progress.lessons': 'Lesson average (30 days)', // ALTA
  'students.progress.lessonsAvg': '{pct}% avg.', // ALTA
  'students.progress.level': 'Level {level} ({pct}%)', // ALTA
  'students.block.activity': 'Activity in the last 30 days', // ALTA
  'students.block.queue': 'Review queue', // ALTA
  'students.queue.new': 'new', // ALTA
  'students.queue.learning': 'learning', // ALTA
  'students.queue.review': 'to review', // ALTA
  'students.queue.weak': 'weak (wrong 2+ times)', // ALTA
  'students.queue.empty': 'No cards in the queue yet.', // ALTA
  'students.block.created': 'Cards you created', // ALTA
  'students.created.empty.title': 'No cards created for {name} yet', // ALTA
  'students.created.empty.titleBare': 'No cards created yet', // ALTA
  'students.created.empty.text': 'The cards you create appear here, with the strength of each one.', // ALTA
  'students.created.empty.btn': 'Create the first card', // ALTA
  'students.created.total': 'Items created for this student', // ALTA
  'students.created.studied': 'Items studied', // ALTA
  'students.created.studiedValue': '{studied} of {total} ({notStarted} not started)', // ALTA
  'students.created.strength': 'Item strength', // ALTA
  'students.created.strengthValue': '{notStarted} not started · {weak} weak · {medium} medium · {strong} strong', // ALTA
  'students.created.cards': 'Cards generated', // ALTA
  'students.created.cardsValue': '{total} ({n} new · {learning} learning · {review} to review · {due} due)', // ALTA
  'students.created.archived': 'Archived (not counted)', // ALTA
  'students.created.failed': 'Could not load this student\'s cards right now.', // ALTA
  'students.block.recent': 'Recent activity', // ALTA
  'students.recent.empty': 'No activity recorded yet.', // ALTA
  'students.block.classes': 'Recent classes', // ALTA
  'students.classes.all': 'See all classes', // ALTA
  'students.classes.empty': 'No classes logged for this student.', // ALTA
  'students.block.answers': 'Review accuracy', // ALTA
  'students.answers.7': 'Last 7 days', // ALTA
  'students.answers.30': 'Last 30 days', // ALTA
  'students.answers.value': { one: '{pct}% over {n} card', other: '{pct}% over {n} cards' }, // ALTA
  'students.answers.none': 'Review accuracy history starts being recorded from {date}.', // ALTA
  'students.noProgress': 'There is no saved progress on this account yet.', // ALTA
  'students.otherSite': 'No progress in {lang}: studying on the {others} site.', // ALTA
  'students.lang.switch.aria': 'Progress language', // ALTA
  'students.overviewFailed': 'Could not load this student\'s data right now.', // ALTA
  'students.back': 'Back to Students', // ALTA
  'students.ev.tab.path': 'Path', // ALTA
  'students.ev.tab.review': 'Review', // ALTA
  'students.ev.tab.profile': 'Profile', // ALTA
  'students.ev.tab.challenges': 'Challenges', // ALTA
  'students.ev.tab.conjugaison': 'Conjugation', // ALTA
  'students.ev.tab.leaderboard': 'Leaderboard', // ALTA
  'students.ev.tab.progress': 'Progress', // ALTA
  'students.ev.tab.dictation': 'Dictations', // ALTA
  'students.ev.tab.my-flashcards': 'My cards', // ALTA
  'students.ev.tab.settings': 'Settings', // ALTA
  'students.ev.tab.goals': 'Goals', // ALTA
  'students.ev.tab.support-materials': 'Support materials', // ALTA
  'students.ev.tab.admin-badges': 'Admin panel', // ALTA
  'students.ev.tab.hanzi': 'Hanzi', // ALTA
  'students.ev.act.vocab_lesson': 'path lesson', // ALTA
  'students.ev.act.unit_checkpoint': 'checkpoint', // ALTA
  'students.ev.act.flashcard_review': 'flashcard review', // ALTA
  'students.ev.act.match_game': 'Match game', // ALTA
  'students.ev.act.speed_review': 'speed review', // ALTA
  'students.ev.act.dictation': 'dictation', // ALTA
  'students.ev.act.conjugation_session': 'conjugation', // ALTA
  'students.ev.act.challenge': 'challenge', // ALTA
  'students.ev.act.hanzi_lesson': 'hanzi lesson', // ALTA
  'students.ev.act.hanzi_review': 'hanzi review', // ALTA
  'students.ev.openedTab': 'Opened the {tab} tab', // ALTA
  'students.ev.report': 'Sent a problem report or suggestion', // ALTA
  'students.ev.started': 'Started {what}{unit}', // ALTA
  'students.ev.completed': 'Completed {what}{unit}{score}', // ALTA
  'students.ev.score.pct': ' · {n}% correct', // ALTA
  'students.ev.score.dictation': ' · score {n}', // ALTA
  'students.ev.score.cards': { one: ' · {n} card', other: ' · {n} cards' }, // ALTA
  'students.n.activeDays': { one: '{n} active day', other: '{n} active days' }, // ALTA
  'students.n.lessonsDone': { one: '{n} lesson completed', other: '{n} lessons completed' }, // ALTA
  'students.n.items': { one: '{n} item', other: '{n} items' }, // ALTA
  'students.n.cards': { one: '{n} card', other: '{n} cards' }, // ALTA
  'classlogs.title': 'Classes', // ALTA
  'classlogs.sub': 'Your class diary. Only you can see these records.', // ALTA
  'classlogs.filter.student.aria': 'Student', // ALTA
  'classlogs.filter.student.all': 'All students', // ALTA
  'classlogs.search.placeholder': 'Search the records', // ALTA
  'classlogs.search.aria': 'Search classes', // ALTA
  'classlogs.card.single': '{name}, {lang}', // ALTA
  'classlogs.card.group': 'Group class · {names}', // ALTA
  'classlogs.card.noTopic': 'Class without a topic', // ALTA
  'classlogs.card.groupAria': 'Group class with {n} people', // ALTA
  'classlogs.field.homework': 'Homework', // ALTA
  'classlogs.field.observations': 'Observations', // ALTA
  'classlogs.field.notes': 'Your private notes', // ALTA
  'classlogs.menu': 'Actions', // ALTA
  'classlogs.edit': 'Edit', // ALTA
  'classlogs.delete': 'Delete', // ALTA
  'classlogs.empty.title': 'No classes logged yet', // ALTA
  'classlogs.empty.text': 'Log the first class in the form. The history shows up here.', // ALTA
  'classlogs.empty.filtered': 'No classes match these filters.', // ALTA
  'classlogs.noStudents.title': 'No students linked yet', // ALTA
  'classlogs.noStudents.text': 'Link a student in the Students tab to log classes for them.', // ALTA
  'classlogs.loading': 'Loading classes…', // ALTA
  'classlogs.fail': 'Could not load the classes right now.', // ALTA
  'classlogs.form.title': 'Log a class', // ALTA
  'classlogs.form.who': 'Who had the class', // ALTA
  'classlogs.form.pick': 'Choose people', // ALTA
  'classlogs.form.pickHint': 'Choose one person, or several for a group class.', // ALTA
  'classlogs.form.none': 'Nobody chosen yet', // ALTA
  'classlogs.form.removePerson': 'Remove {name}', // ALTA
  'classlogs.form.date': 'Date', // ALTA
  'classlogs.form.topic': 'Topic', // ALTA
  'classlogs.form.homework': 'Homework', // ALTA
  'classlogs.form.observations': 'Observations', // ALTA
  'classlogs.form.notes': 'Your private notes (the student does not see them)', // ALTA
  'classlogs.form.atLeastOne': 'Fill in at least one field.', // ALTA
  'classlogs.form.clear': 'Clear', // ALTA
  'classlogs.form.submit': { one: 'Log class', other: 'Log class for {n} students' }, // ALTA
  'classlogs.form.needStudent': 'Choose who had the class.', // ALTA
  'classlogs.form.partial': 'The class was logged for {ok} of {total} people. Try again for the others.', // ALTA
  'classlogs.edit.title': 'Edit class', // ALTA
  'classlogs.edit.group': { one: 'This class was logged for {n} person.', other: 'This class was logged for {n} people. The change applies to all of them.' }, // ALTA
  'classlogs.edit.save': 'Save', // ALTA
  'classlogs.edit.cancel': 'Cancel', // ALTA
  'classlogs.delete.title': 'Delete this class?', // ALTA
  'classlogs.delete.text': 'The record disappears from your diary and cannot be undone.', // ALTA
  'classlogs.delete.textGroup': 'This class was logged for {n} people and disappears for all of them. This cannot be undone.', // ALTA
  'classlogs.delete.confirm': 'Delete class', // ALTA
  'classlogs.form.submitOne': 'Log class', // ALTA
  'materials.title': 'Support materials', // ALTA
  'materials.sub': 'Summaries, links and files you share with your students. Each student only sees what was sent to them.', // ALTA
  'materials.filter.student.aria': 'Student', // ALTA
  'materials.filter.student.all': 'All students', // ALTA
  'materials.search.placeholder': 'Search materials', // ALTA
  'materials.search.aria': 'Search material', // ALTA
  'materials.card.single': '{name}, {lang}', // ALTA
  'materials.card.group': 'Sent to {names}', // ALTA
  'materials.card.groupAria': 'Material sent to {n} people', // ALTA
  'materials.card.link': 'Link: {host}', // ALTA
  'materials.card.file': 'File: {name}', // ALTA
  'materials.card.fileNoName': 'attached file', // ALTA
  'materials.card.sentOn': 'Sent on {date}', // ALTA
  'materials.menu': 'Actions', // ALTA
  'materials.edit': 'Edit', // ALTA
  'materials.delete': 'Delete', // ALTA
  'materials.empty.title': 'No material sent yet', // ALTA
  'materials.empty.text': 'Send the first material using the form next to this list. It shows up here and on each student\'s screen.', // ALTA
  'materials.empty.filtered': 'No material matches these filters.', // ALTA
  'materials.noStudents.title': 'No students linked yet', // ALTA
  'materials.noStudents.text': 'Link a student in the Students tab to send them material.', // ALTA
  'materials.loading': 'Loading materials…', // ALTA
  'materials.fail': 'Could not load the materials right now.', // ALTA
  'materials.form.title': 'Send material', // ALTA
  'materials.form.who': 'Who will get it', // ALTA
  'materials.form.pick': 'Choose people', // ALTA
  'materials.form.pickHint': 'Choose one person, or several to send the same material.', // ALTA
  'materials.form.none': 'Nobody chosen yet', // ALTA
  'materials.form.removePerson': 'Remove {name}', // ALTA
  'materials.form.titleLabel': 'Title', // ALTA
  'materials.form.desc': 'Description (optional)', // ALTA
  'materials.form.link': 'Link (optional)', // ALTA
  'materials.form.file': 'File (optional)', // ALTA
  'materials.form.fileTooBig': 'The file is over 50 MB. Choose a smaller one or send it as a link.', // ALTA
  'materials.form.atLeastOne': 'Fill in the description, a link or a file.', // ALTA
  'materials.form.clear': 'Clear', // ALTA
  'materials.form.submitOne': 'Send material', // ALTA
  'materials.form.needStudent': 'Choose who will get the material.', // ALTA
  'materials.form.partial': 'The material was sent to {ok} of {total} people. Try again for the others.', // ALTA
  'materials.edit.title': 'Edit material', // ALTA
  'materials.edit.fileKept': 'The attached file ({name}) cannot be changed here. To replace it, delete and send again.', // ALTA
  'materials.edit.save': 'Save', // ALTA
  'materials.edit.cancel': 'Cancel', // ALTA
  'materials.delete.title': 'Delete this material?', // ALTA
  'materials.delete.text': 'The material disappears from the student\'s screen and this cannot be undone.', // ALTA
  'materials.delete.textGroup': 'This material was sent to {n} people and disappears for all of them. This cannot be undone.', // ALTA
  'materials.delete.confirm': 'Delete material', // ALTA
  'teacherMaterials.err.badLink': 'The link must start with http:// or https://.', // ALTA
  'materials.form.submit': { one: 'Send material', other: 'Send material to {n} students' }, // ALTA
  'materials.edit.group': { one: 'This material was sent to {n} person.', other: 'This material was sent to {n} people. The change applies to all of them.' }, // ALTA
  'cards.title': 'Cards', // ALTA
  'cards.sub': 'Create cards for one or more people and keep track of the ones you created.', // ALTA
  'cards.tab.aria': 'Cards sections', // ALTA
  'cards.tab.create': 'Create card', // ALTA
  'cards.tab.list': 'Created cards', // ALTA
  'cards.step.who': '1. Who is it for', // ALTA
  'cards.step.type': '2. Card type', // ALTA
  'cards.step.content': '3. Content', // ALTA
  'cards.who.none': 'Nobody chosen yet', // ALTA
  'cards.who.pick': 'Choose people', // ALTA
  'cards.who.hint': 'Choose one person, or several for the same card. Each person gets their own copy.', // ALTA
  'cards.who.langHint': 'A card belongs to one language. To mix languages, create one card for each.', // ALTA
  'cards.who.removePerson': 'Remove {name}', // ALTA
  'cards.who.langAria': 'Students language', // ALTA
  'cards.type.normal.desc': 'Front and back. The person sees one side and recalls the other.', // ALTA
  'cards.type.normalReversed.desc': 'Also asks in the opposite direction: each card becomes two.', // ALTA
  'cards.type.multipleChoice.desc': 'One right answer and some wrong options.', // ALTA
  'cards.type.typeAnswer.desc': 'The person types the answer.', // ALTA
  'cards.type.cloze.desc': 'A sentence with gaps. Each gap becomes a card.', // ALTA
  'cards.summary.title': 'Ready to create', // ALTA
  'cards.summary.people': { one: '{n} person', other: '{n} people' }, // ALTA
  'cards.summary.none': 'Choose who will get the card.', // ALTA
  'cards.summary.warn': 'If you edit the content later, the person loses their progress on that card. We warn you before saving.', // ALTA
  'cards.list.studentAll': 'All students', // ALTA
  'cards.list.studentAria': 'Student', // ALTA
  'cards.list.statusAria': 'Card status', // ALTA
  'cards.list.statusActive': 'Active', // ALTA
  'cards.list.statusArchived': 'Archived', // ALTA
  'cards.list.search': 'Search card content', // ALTA
  'cards.list.searchAria': 'Search cards', // ALTA
  'cards.list.title': { one: '{n} card', other: '{n} cards' }, // ALTA
  'cards.col.card': 'Card', // ALTA
  'cards.col.for': 'For', // ALTA
  'cards.col.deck': 'Deck', // ALTA
  'cards.col.tags': 'Tags', // ALTA
  'cards.col.format': 'Format', // ALTA
  'cards.col.created': 'Created on', // ALTA
  'cards.noDeck': 'no Deck', // ALTA
  'cards.menu': 'Actions', // ALTA
  'cards.act.preview': 'Preview', // ALTA
  'cards.act.edit': 'Edit', // ALTA
  'cards.act.move': 'Move to another Deck', // ALTA
  'cards.act.reactivate': 'Reactivate', // ALTA
  'cards.act.delete': 'Delete', // ALTA
  'cards.empty.title': 'No cards created yet', // ALTA
  'cards.empty.text': 'Create the first one in the Create card tab.', // ALTA
  'cards.empty.btn': 'Create card', // ALTA
  'cards.empty.filtered': 'No cards match these filters.', // ALTA
  'cards.noStudents.title': 'No students linked yet', // ALTA
  'cards.noStudents.text': 'Link a student in the Students tab to create cards for them.', // ALTA
  'cards.page.aria': 'Pages', // ALTA
  'cards.page.prev': 'Previous', // ALTA
  'cards.page.next': 'Next', // ALTA
  'cards.page.range': '{from} to {to} of {total}', // ALTA
  'cards.loading': 'Loading cards…', // ALTA
  'cards.fail': 'Could not load the cards right now.', // ALTA
  'cards.edit.title': 'Edit card', // ALTA
  'cards.edit.for': 'Card for {name}', // ALTA
  'cards.edit.legacyNote': 'This is an old card, from before the field editor. The old editor is still available just for it.', // ALTA
  'cards.edit.save': 'Save', // ALTA
  'cards.edit.cancel': 'Cancel', // ALTA
  'cards.edit.resetTitle': 'Save and restart progress?', // ALTA
  'cards.edit.resetText': 'Changing the card content restarts the person\'s review progress on it.', // ALTA
  'cards.edit.resetConfirm': 'Save and restart', // ALTA
  'cards.move.title': 'Move card', // ALTA
  'cards.move.to': 'To the Deck', // ALTA
  'cards.move.confirm': 'Move', // ALTA
  'cards.delete.title': 'Delete this card?', // ALTA
  'cards.delete.text': 'The card and all of the person\'s review history on it are deleted and this cannot be undone.', // ALTA
  'cards.delete.confirm': 'Delete card', // ALTA
  'cards.deck.delete.title': 'Delete the Deck?', // ALTA
  'cards.deck.delete.text': 'The Deck "{name}" is empty and disappears for the student. This cannot be undone.', // ALTA
  'cards.deck.delete.confirm': 'Delete Deck', // ALTA
  'cards.deck.folders': 'See Decks and cards of {name}', // ALTA
  'cards.deck.newSub': 'New subdeck', // ALTA

  // ---- Banco de Revisão (Professora > Cartões) ----
  'rb.sub.cards': 'Cards', // ALTA
  'rb.sub.bank': 'Review Bank', // ALTA
  'rb.intro': 'Everything that comes out of your class notebooks. Pick a student, then approve or cut items. Items for students with an account become cards in Teacher cards. Items with a doubt stay in Pending for you to check.', // ALTA
  'rb.autoLabel': 'Create cards automatically', // ALTA
  'rb.autoOn': 'Automatic creation is on.', // ALTA
  'rb.autoOff': 'Automatic creation is off.', // ALTA
  'rb.tabStudents': 'Students', // ALTA
  'rb.tabOverview': 'Overview', // ALTA
  'rb.tabManual': 'Notes manual', // ALTA
  'rb.lang.frances': 'French', // ALTA
  'rb.lang.portugues': 'Portuguese', // ALTA
  'rb.lang.mandarim': 'Mandarin', // ALTA
  'rb.type.vocabulario': 'Vocabulary', // ALTA
  'rb.type.estrutura': 'Structure', // ALTA
  'rb.type.verbo': 'Verb', // ALTA
  'rb.type.erro': 'Corrected mistake', // ALTA
  'rb.type.pronuncia': 'Pronunciation', // ALTA
  'rb.f.pendente': 'Pending', // ALTA
  'rb.f.aprovado': 'Approved', // ALTA
  'rb.f.cortado': 'Cut', // ALTA
  'rb.f.todos': 'All', // ALTA
  'rb.st.pendente': 'pending', // ALTA
  'rb.st.cortado': 'cut', // ALTA
  'rb.field.question': 'meaning / prompt', // ALTA
  'rb.field.answer': 'correct form', // ALTA
  'rb.field.wrong_form': 'wrong form', // ALTA
  'rb.ref.pt': 'Portuguese', // ALTA
  'rb.ref.en': 'English', // ALTA
  'rb.ref.fr': 'French', // ALTA
  'rb.mode.recap': 'Recap', // ALTA
  'rb.mode.ultima': 'Last class', // ALTA
  'rb.mode.erros': 'Mistakes', // ALTA
  'rb.classEmpty.recap': 'There is no Recap for this student yet. Approve some items and create the Recap in the panel.', // ALTA
  'rb.classEmpty.ultima': 'There are no approved items with a class date for this student yet.', // ALTA
  'rb.classEmpty.erros': 'No recent mistakes to go over. Good sign!', // ALTA
  'rb.oAttOpt0': 'All', // ALTA
  'rb.oAttOpt1': 'With pending items', // ALTA
  'rb.oAttOpt2': 'Notebook idle (3 weeks or more)', // ALTA
  'rb.oAttOpt3': 'Accuracy under 60%', // ALTA
  'rb.oAttOpt4': 'Recap created and unused', // ALTA
  'rb.oLessonOpt0': 'Any date', // ALTA
  'rb.oLessonOpt1': 'Today', // ALTA
  'rb.oLessonOpt2': 'In the next 7 days', // ALTA
  'rb.cItems': 'items', // ALTA
  'rb.cApproved': 'approved', // ALTA
  'rb.cToCheck': 'to check', // ALTA
  'rb.cCut': 'cut', // ALTA
  'rb.oStudents': 'active students', // ALTA
  'rb.oPending': 'pending items', // ALTA
  'rb.oStale': 'notebook idle', // ALTA
  'rb.oAccuracy': 'accuracy, 30 days', // ALTA
  'rb.colName': 'Student', // ALTA
  'rb.colNext': 'Next class', // ALTA
  'rb.colPending': 'Pending', // ALTA
  'rb.colApproved': 'Approved', // ALTA
  'rb.colEntry': 'Last notebook read', // ALTA
  'rb.colRecap': 'Recap used', // ALTA
  'rb.colAccuracy': 'Accuracy (30 days)', // ALTA
  'rb.colErrors': 'Mistakes (30 days)', // ALTA
  'rb.colReason': 'Most common reason', // ALTA
  'rb.active': 'Active', // ALTA
  'rb.addStudent': '+ Add student', // ALTA
  'rb.all': 'All', // ALTA
  'rb.allTypes': 'All types', // ALTA
  'rb.answerHidden': 'Answer hidden', // ALTA
  'rb.approve': 'Approve', // ALTA
  'rb.approved': 'Item approved.', // ALTA
  'rb.archived': 'Archived', // ALTA
  'rb.backToPanel': 'Back to the panel', // ALTA
  'rb.backToPending': 'Back to pending', // ALTA
  'rb.cancel': 'Cancel', // ALTA
  'rb.cardDelivered': 'This item already became a card for the student', // ALTA
  'rb.cardTag': 'Card delivered', // ALTA
  'rb.chooseStudent': 'Choose a student', // ALTA
  'rb.classNoAccount': 'This student has no linked account yet: answers are only kept in the class record.', // ALTA
  'rb.classOf': 'class of {d}', // ALTA
  'reqChange.menuAria': 'More options for this card', // ALTA
  'reqChange.opt.cortar': 'Ask to cut', // ALTA
  'reqChange.opt.cortarSub': 'This card isn\'t useful for me', // ALTA
  'reqChange.opt.corrigir': 'Suggest a fix', // ALTA
  'reqChange.opt.corrigirSub': 'I know how it should be', // ALTA
  'reqChange.opt.errado': 'Looks wrong', // ALTA
  'reqChange.opt.erradoSub': 'I\'m not sure, my teacher will check', // ALTA
  'reqChange.title.cortar': 'Ask to cut', // ALTA
  'reqChange.title.corrigir': 'Suggest a fix', // ALTA
  'reqChange.title.errado': 'Looks wrong', // ALTA
  'reqChange.hint.cortar': 'Your teacher decides. Meanwhile, the card is paused only for you.', // ALTA
  'reqChange.hint.corrigir': 'Your teacher checks it and, if you are right, updates the card.', // ALTA
  'reqChange.hint.errado': 'Your teacher checks it. Meanwhile, the card is paused only for you.', // ALTA
  'reqChange.fixLabel': 'How it should be', // ALTA
  'reqChange.whyFix': 'What\'s wrong (optional)', // ALTA
  'reqChange.whyOpt': 'Want to explain? (optional)', // ALTA
  'reqChange.send': 'Send request', // ALTA
  'reqChange.cancel': 'Back', // ALTA
  'reqChange.needFix': 'Write how it should be.', // ALTA
  'reqChange.sent': 'Request sent to your teacher.', // ALTA
  'reqChange.sentPaused': 'Request sent. The card stays paused until your teacher answers.', // ALTA
  'reqChange.notBank': 'This card can\'t take requests here. Talk to your teacher.', // ALTA
  'reqChange.error': 'That didn\'t work. Try again.', // ALTA
  'rb.reqTitle': 'Student request', // ALTA
  'rb.reqKind.cortar': '{n} asked to cut this', // ALTA
  'rb.reqKind.corrigir': '{n} suggested a fix', // ALTA
  'rb.reqKind.errado': '{n} thinks this is wrong', // ALTA
  'rb.reqReason': 'Reason:', // ALTA
  'rb.reqSuggestion': 'Suggestion:', // ALTA
  'rb.reqApproveCut': 'Approve the cut', // ALTA
  'rb.reqDecline': 'Decline', // ALTA
  'rb.reqKeep': 'It\'s right, keep it', // ALTA
  'rb.reqApplySug': 'Approve the suggestion', // ALTA
  'rb.reqEditApprove': 'Edit and approve', // ALTA
  'rb.reqDeclined': 'Request declined. The card is back for them.', // ALTA
  'rb.reqApplied': 'Suggestion applied.', // ALTA
  'rb.editTitle': 'Edit this item', // ALTA
  'rb.cutThis': '✂ Cut this item', // ALTA
  'rb.cutWarnAll': 'Cutting applies to every student who has this item.', // ALTA
  'rb.cut': 'Cut', // ALTA
  'rb.cutDone': 'Item cut.', // ALTA
  'rb.daysAgo': '{n} days ago', // ALTA
  'rb.edit': 'Edit', // ALTA
  'rb.editStudent': 'Edit student', // ALTA
  'rb.emptyFilter': 'No items in this filter.', // ALTA
  'rb.emptyStudent': 'No items for this student yet. Add the first one with "+ New item".', // ALTA
  'rb.endAll': 'All correct this round.', // ALTA
  'rb.endHelped': 'Got it with help', // ALTA
  'rb.endMissed': 'To go over again', // ALTA
  'rb.endRedo': 'Review the missed ones', // ALTA
  'rb.endSome': '{n} to go over again.', // ALTA
  'rb.endTitle': 'End of the round', // ALTA
  'rb.error': 'Could not finish.', // ALTA
  'rb.fAnswer': 'Correct form', // ALTA
  'rb.fCheck': 'To check (only for you)', // ALTA
  'rb.fDate': 'Class date', // ALTA
  'rb.fGap': 'Gap word (alternatives: separate with /)', // ALTA
  'rb.fObservation': 'Notes (the student sees them after answering)', // ALTA
  'rb.fQuestion': 'Meaning / prompt', // ALTA
  'rb.fReset': 'The meaning changed: restart the student\'s progress on this card', // ALTA
  'rb.fResetHint': 'Leave it unchecked to fix typos, accents or the explanation: the student keeps their progress.', // ALTA
  'rb.fType': 'Type', // ALTA
  'rb.fWrong': 'Wrong form (mistakes only)', // ALTA
  'rb.filterAria': 'Filter by status', // ALTA
  'rb.fix': 'Fix it:', // ALTA
  'rb.fullscreen': 'Full screen', // ALTA
  'rb.generateReady': 'Create cards', // ALTA
  'rb.generated': '{n} cards created.', // ALTA
  'rb.generatedPartial': '{ok} created, {fail} failed.', // ALTA
  'rb.keys': 'Space shows · 1 Again · 2 Hard · 3 Good (right arrow) · 4 Easy', // ALTA
  'rb.classEmpty': 'No students in the class yet', // ALTA
  'rb.classMembers': '{n} in the class: {names}', // ALTA
  'rb.classPick': 'Class', // ALTA
  'rb.linkClass': 'Link to class', // ALTA
  'rb.linkedClass': 'Class', // ALTA
  'rb.linkedClassDone': "Class linked. {n} cards delivered to whoever didn't have them yet.", // ALTA
  'rb.noClassrooms': 'No class in this language (create one in Mural).', // ALTA
  'rb.noRecipients': 'The class has no students yet: there is no one to deliver to.', // ALTA
  'rb.orClass': 'or', // ALTA
  'rb.link': 'Link to student', // ALTA
  'rb.linkPick': 'Student account', // ALTA
  'rb.linked': 'Linked', // ALTA
  'rb.linkedAccount': 'Linked account', // ALTA
  'rb.linkedDone': 'Student linked.', // ALTA
  'rb.loadError': 'Could not load the Review Bank. Reload the page.', // ALTA
  'rb.loading': 'Loading…', // ALTA
  'rb.manualEdit': 'Edit manual', // ALTA
  'rb.manualEmpty': 'There is no manual yet. Click "Edit manual" to write your note-taking rules.', // ALTA
  'rb.manualHint': 'Write in simple markdown: headings with #, lists with -, **bold** and tables with |.', // ALTA
  'rb.missing': 'Missing: {f}.', // ALTA
  'rb.modesAria': 'What to review', // ALTA
  'rb.more': 'Show more', // ALTA
  'rb.newItem': '+ New item', // ALTA
  'rb.noAccount': 'No account on the site yet', // ALTA
  'rb.noLinkable': 'No account with an active link in this language to connect.', // ALTA
  'rb.noPermission': 'The Review Bank is part of the Teacher plan.', // ALTA
  'rb.noReason': 'No reason', // ALTA
  'rb.noStudents': 'There are no students in the Review Bank yet.', // ALTA
  'rb.none': '–', // ALTA
  'rb.oAtt': 'Attention', // ALTA
  'rb.oEmpty': 'No students in this filter.', // ALTA
  'rb.oLesson': 'Class', // ALTA
  'rb.openClass': 'Open class mode', // ALTA
  'rb.popupBlocked': 'The browser blocked the print window. Allow pop-ups for this site.', // ALTA
  'rb.preview': 'Preview', // ALTA
  'rb.printAnswers': 'Print with answers', // ALTA
  'rb.printStudent': 'Print for the student', // ALTA
  'rb.proposal': 'Review suggestion', // ALTA
  'rb.proposalApplied': 'Suggestion applied.', // ALTA
  'rb.proposalApply': 'Apply', // ALTA
  'rb.proposalDismiss': 'Dismiss', // ALTA
  'rb.readyBanner': '{n} items are ready to become cards.', // ALTA
  'rb.recapDone': 'Recap created with {n} items.', // ALTA
  'rb.recapEmpty': 'The Recap shows up here. Approve some items and create the Recap for the next class.', // ALTA
  'rb.recapHint': 'Ask, then wait for the answer in the target language.', // ALTA
  'rb.recapMake': 'Create Recap for the class of {d}', // ALTA
  'rb.recapNext': 'Next Recap', // ALTA
  'rb.recapNone': 'No approved item is ready for the Recap.', // ALTA
  'rb.recapRemake': 'Create again for {d}', // ALTA
  'rb.recapTitle': 'Recap of the class of {d}', // ALTA
  'rb.recapUnused': 'created on {d}, not used', // ALTA
  'rb.refresh': 'Refresh', // ALTA
  'rb.restore': 'Restore', // ALTA
  'rb.restored': 'Item went back to pending.', // ALTA
  'rb.sByClass': 'Accuracy per class', // ALTA
  'rb.sByType': 'Mistakes by item type', // ALTA
  'rb.tabsAria': 'Student sections', // ALTA
  'rb.tab.desempenho': 'Performance', // ALTA
  'rb.tab.aulas': 'Lessons', // ALTA
  'rb.tab.itens': 'All items', // ALTA
  'rb.lessonOf': 'Lesson of {d}', // ALTA
  'rb.lessonNoDate': 'No lesson date', // ALTA
  'rb.sInClass': 'In class', // ALTA
  'rb.sAtHome': 'At home', // ALTA
  'rb.sDays': 'classes reviewed', // ALTA
  'rb.sHelp': 'with help', // ALTA
  'rb.sHint': 'since tracking started', // ALTA
  'rb.sNoMiss': 'No mistakes recorded.', // ALTA
  'rb.sNoReason': 'No reasons noted.', // ALTA
  'rb.sOk': 'got it', // ALTA
  'rb.sReasons': 'Reasons for mistakes', // ALTA
  'rb.sTip': '{d}: {a} correct, {h} with help, {e} mistakes', // ALTA
  'rb.sNote': 'In class: answers given in Class mode. At home: answers from when the student reviews the cards on the site (recorded since 10/19/2026; anything earlier is not shown here).', // ALTA
  'rb.sTitle': 'Performance (class and home)', // ALTA
  'rb.sTop': 'Most missed', // ALTA
  'rb.sTotal': 'answers', // ALTA
  'rb.sWrong': 'missed', // ALTA
  'rb.save': 'Save', // ALTA
  'rb.saveApprove': 'Save and approve', // ALTA
  'rb.saved': 'Saved.', // ALTA
  'rb.savedDelivered': 'Saved and delivered to the student.', // ALTA
  'rb.savedReset': 'Saved. The student\'s progress on this card was restarted.', // ALTA
  'rb.say': 'How do you say:', // ALTA
  'rb.search': 'Search items', // ALTA
  'rb.searchStudent': 'Search student', // ALTA
  'rb.sfDateAdd': 'Add date', // ALTA
  'rb.sfDateDel': 'Remove date', // ALTA
  'rb.sfDates': 'Dates of the next classes', // ALTA
  'rb.sfLang': 'Language studied', // ALTA
  'rb.sfName': 'Name', // ALTA
  'rb.sfNeedName': 'Write the student\'s name.', // ALTA
  'rb.sfNoDates': 'No dates yet.', // ALTA
  'rb.sfAgent': 'Update automatically every night', // ALTA
  'rb.sfAgentHint': "Turn this on only when this student already uses the site (linked account). The nightly routine then brings new items from the notebook and creates the cards. While it is off, the old Bank (artifact) owns this student's data.", // ALTA
  'rb.sfRef': 'Student\'s reference language', // ALTA
  'rb.sfStatus': 'Status', // ALTA
  'rb.showAnswer': 'Show answer', // ALTA
  'rb.skip': 'Skip', // ALTA
  'rb.statsEmpty': 'No answers recorded yet. Numbers show up after the next class mode.', // ALTA
  'rb.studentsAria': 'Students', // ALTA
  'rb.toCheck': 'To check', // ALTA
  'rb.toCheckColon': 'To check:', // ALTA
  'rb.today': 'Today', // ALTA
  'rb.typeAria': 'Type', // ALTA
  'rb.unlink': 'Unlink', // ALTA
  'rb.unlinkedDone': 'Student unlinked. Cards already delivered stay with them.', // ALTA
  'rb.updatedAt': 'Updated {d}', // ALTA
  'rb.whyMissed': 'Why was it missed?', // ALTA
  'rb.imp.title': 'Import data from the old Review Bank', // ALTA
  'rb.imp.hint': 'Choose the .json file exported from the old Review Bank. Nothing is delivered to anyone: items come in as they were, and cards are only created after you link the student and click Create cards.', // ALTA
  'rb.imp.note': 'Importing again is safe: what already exists here is not overwritten or duplicated.', // ALTA
  'rb.imp.cStudents': 'students', // ALTA
  'rb.imp.cItems': 'items', // ALTA
  'rb.imp.cPending': 'pending', // ALTA
  'rb.imp.cRecaps': 'recaps', // ALTA
  'rb.imp.cReviews': 'answers', // ALTA
  'rb.imp.warn': '{n} records in the file were skipped because data was missing.', // ALTA
  'rb.imp.manual': 'Replace the current Manual with the one in the file', // ALTA
  'rb.imp.run': 'Import', // ALTA
  'rb.imp.progress': 'Importing {name}…', // ALTA
  'rb.imp.done': 'Imported: {s} students and {i} items. Now link the students who have an account.', // ALTA
  'rb.imp.errRun': 'The import stopped.', // ALTA
  'rb.imp.err.json': 'This file is not valid JSON.', // ALTA
  'rb.imp.err.format': 'This file is not in the Review Bank format.', // ALTA
  'rb.imp.err.empty': 'The file has no students to import.', // ALTA
  'rb.reason.nao_lembrou': 'Didn\'t remember', // ALTA
  'rb.reason.em_parte': 'Partly remembered', // ALTA
  'rb.reason.confundiu': 'Mixed up with another word', // ALTA
  'rb.reason.genero': 'Gender or article', // ALTA
  'rb.reason.conjugacao': 'Wrong conjugation', // ALTA
  'rb.reason.tempo': 'Wrong tense', // ALTA
  'rb.reason.auxiliar': 'Wrong auxiliary', // ALTA
  'rb.reason.ordem': 'Word order', // ALTA
  'rb.reason.preposicao': 'Preposition', // ALTA
  'rb.reason.concordancia': 'Agreement', // ALTA
  'rb.reason.repetiu': 'Made the same mistake', // ALTA
  'rb.reason.corrigiu_parte': 'Partly corrected', // ALTA
  'rb.reason.som': 'Wrong sound', // ALTA
  'rb.reason.tonico': 'Stress', // ALTA
  'rb.sensitiveTag': 'Sensitive', // ALTA
  'rb.sensitiveHint': 'Personal content or strong language: it does not become a card on its own.', // ALTA
  'rb.fSensitive': 'Sensitive content: it does not become a card on its own, you decide', // ALTA
  'publicProfile.loginToSee': 'Log in to see the full profile.', // ALTA
  'publicProfile.loginCta': 'Log in or sign up', // ALTA
  'publicDeckCopies.tab': 'Public decks', // ALTA
  'publicDeckCopies.adminHint': 'How many people added each public deck (each account counts once; re-copies only add to "Copies"). Counted since Oct 12, 2026.', // ALTA
  'publicDeckCopies.none': 'No public decks yet.', // ALTA
  'publicDeckCopies.error': 'Couldn\'t load public decks right now.', // ALTA
  'publicDeckCopies.people': 'People', // ALTA
  'publicDeckCopies.copies': 'Copies', // ALTA
  'publicDeckCopies.last': 'Last copy', // ALTA
  'publicDeckCopies.unpublished': 'unpublished', // ALTA
  'publicDeckCopies.ownerCount': { one: '{n} person added this deck', other: '{n} people added this deck' }, // ALTA
  'publicDeckCopies.lastOn': 'Last time on {date}', // ALTA
  'publicDeckCopies.premiumHint': 'With Premium you can see how many people added this deck.', // ALTA
  'studentAnalytics.open': 'Student analytics ({lang})', // ALTA
  'studentAnalytics.title': '{name}\'s analytics', // ALTA
  'studentDecks.title': 'Student decks', // ALTA
  'studentDecks.deck': 'Deck', // ALTA
  'studentDecks.hint': 'You see each deck\'s name and numbers (subdecks included), without opening the cards. Only what the student has already synced counts.', // ALTA
  'studentDecks.empty': 'The student has no cards in decks yet.', // ALTA
  'studentDecks.error': 'Couldn\'t load the student\'s decks right now.', // ALTA
  'panel.tab.mural': 'Board', // ALTA
  'panel.classLog.attendance': 'Attendance', // ALTA
  'panel.classLog.attendanceNone': 'Not recorded', // ALTA
  'panel.classLog.skills': 'Skills practiced', // ALTA
  'panel.classLog.skill.conversacao': 'Speaking', // ALTA
  'panel.classLog.skill.gramatica': 'Grammar', // ALTA
  'panel.classLog.skill.escrita': 'Writing', // ALTA
  'panel.classLog.skill.leitura': 'Reading', // ALTA
  'panel.classLog.skill.vocabulario': 'Vocabulary', // ALTA
  'panel.classLog.skill.escuta': 'Listening', // ALTA
  'panel.classLog.skill.pronuncia': 'Pronunciation', // ALTA
  'panel.classLog.classrooms': 'Classes', // ALTA
  'panel.classLog.classroomsHint': 'A class lesson is logged once and shows up for every student in the class.', // ALTA
  'panel.classLog.labels.name': 'Label name', // ALTA
  'panel.classLog.labels.color': 'Color', // ALTA
  'panel.classLog.labels.archive': 'Archive', // ALTA
  'panel.classLog.labels.needName': 'Give the label a name.', // ALTA
  'panel.classLog.labels.duplicate': 'You already have a label with that name.', // ALTA
  'panel.classLog.color.green': 'Green', // ALTA
  'panel.classLog.color.red': 'Red', // ALTA
  'panel.classLog.color.yellow': 'Yellow', // ALTA
  'panel.classLog.color.orange': 'Orange', // ALTA
  'panel.classLog.color.blue': 'Blue', // ALTA
  'panel.classLog.color.purple': 'Purple', // ALTA
  'panel.classLog.color.gray': 'Gray', // ALTA
  'panel.classLog.color.pink': 'Pink', // ALTA
  'panel.classLog.color.brown': 'Brown', // ALTA
  'panel.classLog.labels.createPlaceholder': 'Type a name and press Enter to create a label', // ALTA
  'panel.classLog.labels.edit': 'Edit the {name} label', // ALTA
  'panel.classLog.labels.done': 'Done', // ALTA
  'panel.classLog.time': 'Time (optional)', // ALTA
  'panel.classLog.durationMin': 'Length', // ALTA
  'panel.classLog.repeatWeekly': 'Repeat every week', // ALTA
  'panel.classLog.repeatUntil': 'Until', // ALTA
  'panel.classLog.repeatHint': 'Creates one lesson a week, same day and time, until that date (52 at most).', // ALTA
  'panel.classLog.views': 'How to see the lessons', // ALTA
  'panel.classLog.view.register': 'Log', // ALTA
  'panel.classLog.view.calendar': 'Calendar', // ALTA
  'panel.classLog.cal.prev': 'Previous month', // ALTA
  'panel.classLog.cal.next': 'Next month', // ALTA
  'panel.classLog.cal.today': 'Today', // ALTA
  'panel.classLog.cal.legend': 'The color is the attendance one; no color = scheduled lesson or not logged yet.', // ALTA
  'panel.classLog.cal.empty': 'No lessons on this day.', // ALTA
  'panel.classLog.cal.schedule': 'Schedule a lesson on this day', // ALTA
  'myClassLogs.upcoming': 'Upcoming lessons', // ALTA
  'myClassLogs.feed.title': 'See your lessons in your calendar (Google, Apple, Outlook)', // ALTA
  'myClassLogs.feed.intro': 'Subscribe to this link once and your lessons show up in your calendar on their own, in your time zone. When a lesson changes here, your calendar follows.', // ALTA
  'myClassLogs.feed.google': 'Open in Google Calendar', // ALTA
  'myClassLogs.feed.apple': 'Apple or Outlook', // ALTA
  'myClassLogs.feed.linkLabel': 'Or copy the link and paste it into "Add calendar from URL"', // ALTA
  'myClassLogs.feed.copy': 'Copy link', // ALTA
  'myClassLogs.feed.copied': 'Link copied', // ALTA
  'myClassLogs.feed.delayHint': 'Google Calendar checks the link on its own every few hours, so a new lesson may take a while to show up there.', // ALTA
  'myClassLogs.feed.privacyHint': 'Anyone with this link can see your lesson dates, topics and homework. Don\'t share it. Shared it by mistake?', // ALTA
  'myClassLogs.feed.reset': 'Create a new link', // ALTA
  'myClassLogs.feed.resetConfirm': 'Create a new link? The old one will stop working and you\'ll need to subscribe to the new one in your calendar.', // ALTA
  'myClassLogs.feed.resetDone': 'New link created. Subscribe to it again in your calendar.', // ALTA
  'myClassLogs.feed.error': 'Couldn\'t create the link right now. Please try again in a moment.', // ALTA
  'myClassLogs.view.list': 'List', // ALTA
  'myClassLogs.classLabel': 'Lesson', // ALTA
  'panel.classLog.cal.count': { one: '{n} lesson', other: '{n} lessons' }, // ALTA
  'panel.classLog.review.title': { one: 'Review from Notion ({n} lesson)', other: 'Review from Notion ({n} lessons)' }, // ALTA
  'panel.classLog.review.hint': 'These texts came from Notion and may include notes meant only for you, so the student can\'t see them yet. Edit anything you want and choose: show to the student or keep for yourself. The original text stays in your Notes.', // ALTA
  'panel.classLog.review.toTopic': 'Topic (the student sees it)', // ALTA
  'panel.classLog.review.toHomework': 'For next lesson (the student sees it)', // ALTA
  'panel.classLog.review.show': 'Show to student', // ALTA
  'panel.classLog.review.keep': 'Keep for myself', // ALTA
  'panel.classLog.review.shown': 'The student can see this text now.', // ALTA
  'panel.classLog.review.kept': 'Kept only in your Notes.', // ALTA
  'panel.classLog.classroomsSelected': { one: '{n} class', other: '{n} classes' }, // ALTA
  'panel.classLog.membersCount': { one: '{n} student', other: '{n} students' }, // ALTA
  'studentPanel.menu': '🎒 Student', // ALTA
  'studentPanel.nav': 'Student', // ALTA
  'studentPanel.title': 'Student', // ALTA
  'studentPanel.sub': 'Everything from your teacher: notes, lessons, materials and review.', // ALTA
  'studentPanel.aria': 'Student section', // ALTA
  'studentPanel.tab.classlogs': 'Lessons', // ALTA
  'studentPanel.tab.materials': 'Study materials', // ALTA
  'studentPanel.tab.review': 'Review', // ALTA
  'studentPanel.newCount': { one: '{n} new', other: '{n} new' }, // ALTA
  'studentPanel.review.hint': 'Cards your teacher made from your lessons. Answer, read her note and the site schedules the next review.', // ALTA
  'studentPanel.review.empty': 'Your teacher hasn\'t sent any review cards from your lessons yet.', // ALTA
  'studentPanel.review.start': 'Review ({n})', // ALTA
  'studentPanel.review.total': { one: '{n} lesson card in total', other: '{n} lesson cards in total' }, // ALTA
  'studentPanel.review.dueCount': { one: '{n} card to review today', other: '{n} cards to review today' }, // ALTA
  'mural.menu': '📌 Board', // ALTA
  'mural.title': 'Board', // ALTA
  'mural.sub': 'Notes, materials and conversations with your teacher and your class.', // ALTA
  'mural.newCount': { one: '{n} new', other: '{n} new' }, // ALTA
  'mural.teacherIntro': 'Pick a class (a note for everyone or just one student) or a student who is not in a class. New notes show up in the bell, no e-mail.', // ALTA
  'mural.studentIntro': '{lang} board with {name}', // ALTA
  'mural.mode.classrooms': 'Classes', // ALTA
  'mural.mode.students': 'Students', // ALTA
  'mural.newClassroom': '+ New class', // ALTA
  'mural.newClassroomPh': 'Class name (e.g. Thursday class)', // ALTA
  'mural.create': 'Create', // ALTA
  'mural.cancel': 'Cancel', // ALTA
  'mural.save': 'Save', // ALTA
  'mural.edit': 'Edit', // ALTA
  'mural.delete': 'Delete', // ALTA
  'mural.edited': 'edited', // ALTA
  'mural.teacherTag': 'Teacher', // ALTA
  'mural.onlyFor': '🔒 Only for {name}', // ALTA
  'mural.individualChip': 'With {name}', // ALTA
  'mural.noClassrooms': 'You have no classes yet. Create one, add your students or send the class link.', // ALTA
  'mural.pickClassroom': 'Pick a class to see its board.', // ALTA
  'mural.noStudents': 'You have no students in this language yet. Invite them in the Students tab.', // ALTA
  'mural.allInClassrooms': 'All your students are in a class. To talk to just one, open the class and pick the student under "To".', // ALTA
  'mural.pickStudent': 'Pick a student to see their personal board.', // ALTA
  'mural.noTeacher': 'The board shows up when you have a teacher in this language.', // ALTA
  'mural.empty': 'Nothing on the board yet. Why not start?', // ALTA
  'mural.composer.label': 'New post', // ALTA
  'mural.composer.placeholderTeacher': 'Write a note', // ALTA
  'mural.composer.placeholderStudent': 'Write on the board', // ALTA
  'mural.composer.attach': '📎 Attach', // ALTA
  'mural.composer.attachHint': 'Attachments: PDF or image, up to 5 files of 10 MB.', // ALTA
  'mural.composer.toLabel': 'To', // ALTA
  'mural.composer.toAll': 'The whole class', // ALTA
  'mural.composer.toOne': 'Only {name}', // ALTA
  'mural.composer.publish': 'Post', // ALTA
  'mural.composer.sending': 'Sending...', // ALTA
  'mural.composer.removeFile': 'Remove {name}', // ALTA
  'mural.comment.label': 'Comment', // ALTA
  'mural.comment.placeholder': 'Write a comment', // ALTA
  'mural.comment.send': 'Send', // ALTA
  'mural.deletePostConfirm': 'Delete this post? Its comments and attachments go too.', // ALTA
  'mural.deleteCommentConfirm': 'Delete this comment?', // ALTA
  'mural.file.badType': '"{name}" is not a PDF or an image.', // ALTA
  'mural.file.tooBig': '"{name}" is over 10 MB.', // ALTA
  'mural.file.tooMany': 'Up to 5 files per post.', // ALTA
  'mural.manage.summary': '⚙️ Students ({n}), link and class name', // ALTA
  'mural.manage.name': 'Class name', // ALTA
  'mural.manage.saveName': 'Save name', // ALTA
  'mural.manage.members': 'Students in this class', // ALTA
  'mural.manage.membersHint': 'Only your students with an active link in this language show up. A student can be in several classes.', // ALTA
  'mural.manage.filter': 'Search by name or @', // ALTA
  'mural.manage.saveMembers': 'Save students', // ALTA
  'mural.manage.saved': 'Class updated!', // ALTA
  'mural.manage.link': 'Class link', // ALTA
  'mural.manage.linkHint': 'Whoever opens the link joins the class and, if not your student yet, becomes one.', // ALTA
  'mural.manage.linkCreate': 'Create class link', // ALTA
  'mural.manage.linkWhatsText': 'Hi! This is the link for the {name} class. Just open it and join: {url}', // ALTA
  'mural.manage.delete': 'Delete class', // ALTA
  'mural.manage.deleteConfirm': 'Delete the class "{name}"? Its notes, comments and attachments disappear for everyone. The students remain your students.', // ALTA
  'mural.join.kicker': 'Class invite', // ALTA
  'mural.join.title': '{classroom}', // ALTA
  'mural.join.sub': 'With {name}, {lang} lessons', // ALTA
  'mural.join.perkMural': 'Class board with notes and materials', // ALTA
  'mural.join.perkTalk': 'Post and comment with the class', // ALTA
  'mural.join.perkTeacher': 'Your teacher follows your {lang} progress', // ALTA
  'mural.join.accept': 'Join the class', // ALTA
  'mural.join.login': 'Sign in to join', // ALTA
  'mural.join.later': 'Not now', // ALTA
  'mural.join.done': 'Done! You are in the {classroom} class 🏫', // ALTA
  'mural.join.already': 'You are already in this class.', // ALTA
  'mural.err.generic': 'That did not work. Try again.', // ALTA
  'mural.err.has_class_logs': 'This class has lessons logged, so it can\'t be deleted. The lessons stay in the history.', // ALTA
  'mural.err.not_authorized': 'You do not have access to this board.', // ALTA
  'mural.err.not_member': 'This student is not in the class.', // ALTA
  'mural.err.empty': 'Write something or attach a file.', // ALTA
  'mural.err.too_long': 'Text too long.', // ALTA
  'mural.err.daily_limit': 'You reached today\'s limit. Try tomorrow.', // ALTA
  'mural.err.invalid_attachments': 'An attachment was not accepted (PDF or image, up to 10 MB).', // ALTA
  'mural.err.invalid_name': 'Use a name with 1 to 60 characters.', // ALTA
  'mural.err.classroom_limit': 'You reached the limit of 50 classes.', // ALTA
  'mural.err.not_found': 'Class not found.', // ALTA
  'mural.err.no_teacher': 'You do not have a teacher in this language.', // ALTA
  'mural.err.upload': 'Could not upload the file. Try again.', // ALTA
  'mural.err.invalid_code': 'This class link no longer works. Ask your teacher for a new one.', // ALTA
  'mural.err.student_has_teacher': 'You already have a teacher in this language (one per language).', // ALTA
  'mural.err.invalid_target': 'This class is yours.', // ALTA
  'tinvite.lang.frances': 'French', // ALTA
  'tinvite.lang.mandarim': 'Chinese', // ALTA
  'tinvite.lang.portugues': 'Portuguese', // ALTA
  'tinvite.title': 'Invite a student', // ALTA
  'tinvite.hint': 'Pick the language and invite through search or send the link. The student accepts, gets your badge and shows up here. Invites last 14 days.', // ALTA
  'tinvite.langLabel': 'Class language', // ALTA
  'tinvite.search.title': 'By search', // ALTA
  'tinvite.send': 'Invite for {lang}', // ALTA
  'tinvite.sentToast': 'Invite sent! The student sees it in the bell and at the top of the Path.', // ALTA
  'tinvite.link.title': 'By link', // ALTA
  'tinvite.link.hint': 'Anyone who opens this link and accepts becomes your student right away. Good for WhatsApp or your class group.', // ALTA
  'tinvite.link.copy': 'Copy link', // ALTA
  'tinvite.link.copied': 'Link copied!', // ALTA
  'tinvite.link.whatsapp': 'Send on WhatsApp', // ALTA
  'tinvite.link.reset': 'Make a new link', // ALTA
  'tinvite.link.resetConfirm': 'Make a new link? The old link stops working right away.', // ALTA
  'tinvite.link.whatsText': 'Hi! Here is my invite to the {lang} classes. Just open it and accept: {url}', // ALTA
  'tinvite.pending.title': 'Pending invites ({n})', // ALTA
  'tinvite.pending.daysLeft': { one: 'expires in {n} day', other: 'expires in {n} days' }, // ALTA
  'tinvite.pending.expired': 'expired', // ALTA
  'tinvite.pending.resend': 'Resend', // ALTA
  'tinvite.pending.cancel': 'Cancel', // ALTA
  'tinvite.pending.cancelConfirm': 'Cancel this invite? The student will no longer see it.', // ALTA
  'tinvite.direct.title': 'Link directly (admin only)', // ALTA
  'tinvite.direct.hint': 'Creates the link right away, without the student accepting. Only use it for someone who already agreed to classes with you.', // ALTA
  'tinvite.banner.title': '{name} invited you to {lang} classes', // ALTA
  'tinvite.banner.see': 'See invite', // ALTA
  'tinvite.card.kicker': 'Class invite', // ALTA
  'uchoice.title': 'Choose your name and your @', // ALTA
  'uchoice.sub': 'This is how your friends and your teacher will find you on the site.', // ALTA
  'uchoice.nameLabel': 'Your name', // ALTA
  'uchoice.namePlaceholder': 'E.g. Raissa Lima', // ALTA
  'uchoice.userLabel': 'Your @', // ALTA
  'uchoice.rules': 'Lowercase letters, numbers and dots (e.g. raissa.lima), 3 to 24 characters.', // ALTA
  'uchoice.warn': 'Heads up: you can only choose your @ now. It can\'t be changed later. You can change your name anytime in your profile.', // ALTA
  'uchoice.save': 'Save', // ALTA
  'uchoice.status.ok': 'This @ is available ✓', // ALTA
  'uchoice.status.taken': 'This @ is already taken. Try another one.', // ALTA
  'uchoice.status.reserved': 'This @ can\'t be used. Try another one.', // ALTA
  'uchoice.status.invalid': 'Use only lowercase letters, numbers and dots between them, 3 to 24 characters.', // ALTA
  'uchoice.status.checking': 'Checking…', // ALTA
  'uchoice.status.error': 'Something went wrong. Please try again in a moment.', // ALTA
  'uchoice.err.name': 'Please enter your name.', // ALTA
  'uchoice.done': 'Done! Your @ is @{user}', // ALTA
  'tinvite.card.title': '{name} invited you to their {lang} classes', // ALTA -- Etapa 4: aprovado pela dona
  'tinvite.card.perkProgress': 'Follow-up on your {lang} progress', // ALTA
  'tinvite.card.perkCards': 'Cards and class notes made for you', // ALTA
  'tinvite.card.perkBadge': 'A student badge on your profile', // ALTA
  'tinvite.card.accept': 'Accept invite', // ALTA
  'tinvite.card.loginToAccept': 'Log in to accept', // ALTA
  'tinvite.card.decline': 'Decline', // ALTA
  'tinvite.card.later': 'Not now', // ALTA
  'tinvite.card.foot': 'To end the link later, just talk to whoever invited you.', // ALTA
  'tinvite.acceptedToast': 'Done! You now study {lang} with {name} 🎓', // ALTA -- Etapa 4: aprovado pela dona
  'tinvite.declinedToast': 'Invite declined.', // ALTA
  'tinvite.err.not_authorized': 'Only accounts with the Teacher plan can invite students.', // ALTA
  'tinvite.err.invalid_language': 'Invalid language.', // ALTA
  'tinvite.err.invalid_target': 'This invite is yours: you can\'t be your own student.', // ALTA
  'tinvite.err.not_found': 'I couldn\'t find that account.', // ALTA
  'tinvite.err.student_has_teacher': 'This account already has a teacher for this language. Only one per language.', // ALTA
  'tinvite.err.already_student': 'This account already studies this language with you.', // ALTA -- Etapa 4: aprovado pela dona
  'tinvite.err.already_invited': 'You already invited this account. The invite is still valid.', // ALTA
  'tinvite.err.daily_invite_limit': 'You reached the limit of 30 invites per day. Try again tomorrow or send the link.', // ALTA
  'tinvite.err.no_pending_invite': 'This invite is no longer valid.', // ALTA
  'tinvite.err.invalid_code': 'This invite link no longer works. Ask whoever invited you for a new one.', // ALTA
  'tinvite.err.not_authenticated': 'Log in to answer the invite.', // ALTA
  'tinvite.err.generic': 'That didn\'t work right now. Try again in a moment.', // ALTA

  // Ditado do francês: explicação de cada erro (família latina, fase 2, 2026-10-15). needs_review: tradução nova,
  // ainda não revisada pela dona; confiança no comentário de cada linha. Antes estes textos apareciam em
  // português também no site em inglês.
  'fr.dict.youWrote': 'you wrote “{typed}”', // ALTA
  'fr.dict.light.hyphen': '“{core}” has a hyphen ({you}).', // ALTA
  'fr.dict.light.apostrophe': '“{core}” has an apostrophe ({you}).', // ALTA
  'fr.dict.light.ligature': '“{core}” uses the letter “œ”, which is a single letter ({you}).', // ALTA
  'fr.dict.light.accent': '“{core}”: check the accents ({you}).', // ALTA
  'fr.dict.light.spelling': '“{core}”: small spelling difference ({you}).', // ALTA
  'fr.dict.light.multiple': '“{core}”: check {list} ({you}).', // ALTA
  'fr.dict.part.hyphen': 'the hyphen', // ALTA
  'fr.dict.part.apostrophe': 'the apostrophe', // ALTA
  'fr.dict.part.ligature': 'the letter “œ”', // ALTA
  'fr.dict.part.accent': 'the accents', // ALTA
  'fr.dict.part.and': ' and ', // ALTA
  'fr.dict.err.homophone': '“{shown}” (you wrote “{typed}”): words that sound alike. {note}', // ALTA
  'fr.dict.err.agreement': '“{shown}” (you wrote “{typed}”): only the ending is different (-{suffix}). If the word agrees with another one, check gender, number or the verb form against the rest of the sentence; otherwise it may just be a typo.', // MÉDIA -- "concorda" sem equivalente curto; alternativa: "If it is a word that has to agree..."
  'fr.dict.err.other': '“{shown}”: not the expected word (you wrote “{typed}”).', // ALTA
  'fr.dict.punctMissing': 'This punctuation mark is missing (no points lost)', // ALTA
  'fr.dict.hom.a': '“a” is the verb avoir (il a); “à” is a preposition (à Paris).', // ALTA
  'fr.dict.hom.et': '“et” means “and”; “est” is the verb être (il est).', // ALTA
  'fr.dict.hom.son': '“son” means “his/her”; “sont” is the verb être (ils sont).', // ALTA
  'fr.dict.hom.ou': '“ou” means “or”; “où” means “where”.', // ALTA
  'fr.dict.hom.on': '“on” is a pronoun (“we”, “one”); “ont” is the verb avoir (ils ont).', // MÉDIA -- "a gente" vira "we/one"
  'fr.dict.hom.la': '“la” is an article or a pronoun; “là” means “there”.', // ALTA
  'fr.dict.hom.ce': '“ce” is a demonstrative (“this/that”); “se” is a reflexive pronoun (il se lève).', // ALTA
  'fr.dict.hom.ces': '“ces” = “these/those”; “ses” = “his/her” (plural); “c\'est” = “it is/this is”; “s\'est” = pronoun + être (il s\'est levé).', // ALTA
  'fr.dict.hom.mes': '“mes” means “my” (plural); “mais” means “but”.', // ALTA
  'fr.dict.hom.peu': '“peu” means “little, not much”; “peux”/“peut” are forms of pouvoir (je peux, il peut).', // ALTA
  'fr.dict.hom.leur': '“leurs” goes before a plural noun; “leur” before a singular noun or as a pronoun (je leur parle).', // ALTA
  'fr.dict.hom.quel': 'Same pronunciation: “quel” changes with the gender and number of the noun.', // ALTA

  // ---- tela de entrada (index.html da raiz), 2026-10-18 ----
  'gate.brand': 'Languages with Prof.\u00a0Brune', // ALTA
  'gate.loading': 'Loading...', // ALTA
  'gate.theme': 'Switch between light and dark theme', // ALTA
  'gate.siteLang.label': 'Site language', // ALTA
  'gate.login.google': 'Continue with Google', // ALTA
  'gate.login.divider': 'or', // ALTA
  'gate.login.password': 'Your password', // ALTA
  'gate.login.forgot': 'Forgot your password?', // ALTA
  'gate.login.submit': 'Log in', // ALTA
  'gate.login.signupSubmit': 'Create free account', // ALTA
  'gate.login.signupLink': 'Create a free account', // ALTA
  'gate.login.googleRedirect': 'Taking you to Google...', // ALTA
  'gate.login.googleError': 'Couldn\'t connect to Google. Try again.', // ALTA
  'gate.login.alreadyRegistered': 'This email already has an account. Try logging in.', // ALTA
  'gate.login.signupFailed': 'Couldn\'t create your account right now.', // ALTA
  'gate.login.notConfirmed': 'Your account isn\'t confirmed yet. We sent a new code to your email.', // ALTA
  'gate.login.wrong': 'Wrong email or password.', // ALTA
  'gate.forgot.needEmail': 'Type your email in the field above first.', // ALTA
  'gate.forgot.failed': 'Couldn\'t send the email right now.', // ALTA
  'gate.forgot.sent': 'We sent you a link to reset your password.', // ALTA
  'gate.verify.title': 'Confirm your email', // ALTA
  'gate.verify.subBefore': 'We sent a code to ', // ALTA
  'gate.verify.subAfter': '. Enter it here to activate your account.', // ALTA
  'gate.verify.codeLabel': 'Confirmation code', // ALTA
  'gate.verify.submit': 'Confirm', // ALTA
  'gate.verify.resend': 'Resend code', // ALTA
  'gate.verify.resendIn': 'Resend code ({s}s)', // ALTA
  'gate.verify.back': 'Use another email', // ALTA
  'gate.verify.note': 'Didn\'t get it? Check your spam folder. You can also tap the "Activate my account" button in the email.', // ALTA
  'gate.verify.incomplete': 'Enter the full code.', // ALTA
  'gate.verify.invalid': 'That code doesn\'t work. Check the numbers or tap "Resend code".', // ALTA
  'gate.verify.activated': 'Account activated! Logging you in...', // ALTA
  'gate.verify.activatedElsewhere': 'Your account was activated! Logging you in...', // ALTA
  'gate.verify.resendFailed': 'Couldn\'t resend right now. Wait a bit and try again.', // ALTA
  'gate.verify.resent': 'We sent a new code.', // ALTA
  'gate.newPass.title': 'Create a new password', // ALTA
  'gate.newPass.sub': 'Choose the password you\'ll use from now on.', // ALTA
  'gate.newPass.label': 'New password', // ALTA
  'gate.newPass.ph': 'New password (at least 6 characters)', // ALTA
  'gate.newPass.repeat': 'Repeat the new password', // ALTA
  'gate.newPass.submit': 'Save new password', // ALTA
  'gate.newPass.mismatch': 'The two passwords don\'t match.', // ALTA
  'gate.newPass.same': 'The new password has to be different from the old one.', // ALTA
  'gate.newPass.failed': 'Couldn\'t save right now. Ask for a new link in "Forgot your password?".', // ALTA
  'gate.newPass.saved': 'New password saved!', // ALTA
  'gate.link.confirmar.title': 'Activate your account', // ALTA
  'gate.link.confirmar.sub': 'Tap the button to confirm your email and log in.', // ALTA
  'gate.link.confirmar.btn': 'Activate my account', // ALTA
  'gate.link.confirmar.fail': 'This link was already used or has expired. If you already activated your account, just log in with your email and password.', // ALTA
  'gate.link.entrar.title': 'Log in to the app', // ALTA
  'gate.link.entrar.sub': 'Tap the button to log in to your account.', // ALTA
  'gate.link.entrar.ok': 'Done! Logging you in...', // ALTA
  'gate.link.entrar.fail': 'This link was already used or has expired. Log in with your email and password or ask for a new link.', // ALTA
  'gate.link.novaSenha.sub': 'Tap the button to choose your new password.', // ALTA
  'gate.link.novaSenha.btn': 'Create new password', // ALTA
  'gate.link.novaSenha.fail': 'This link was already used or has expired. Ask for another one in "Forgot your password?".', // ALTA
  'gate.link.trocarEmail.title': 'Confirm your new email', // ALTA
  'gate.link.trocarEmail.sub': 'Tap the button to confirm the email change.', // ALTA
  'gate.link.trocarEmail.btn': 'Confirm email', // ALTA
  'gate.link.trocarEmail.ok': 'Email confirmed! Logging you in...', // ALTA
  'gate.link.trocarEmail.fail': 'This link was already used or has expired. Ask for the email change again.', // ALTA
  'gate.link.toLogin': 'Go to login', // ALTA
  'gate.link.otherAddress': 'Confirmed! Now also tap the button in the email sent to your other address.', // ALTA
  'gate.choose.title': 'Which language do you want to learn?', // ALTA
  'gate.choose.foot': 'You can add more courses later from the flag menu.', // ALTA
  'gate.exp.title': 'Do you already know some {lang}?', // ALTA
  'gate.exp.sub': 'This only adjusts how you start. You can change it later, anytime.', // ALTA
  'gate.exp.beginner': 'I\'m a beginner', // ALTA
  'gate.exp.knows': 'I know the basics', // ALTA
  'gate.choose.footTitle': 'You can change this later', // ALTA
  'gate.exp.beginnerDesc': 'You start from the first lesson.', // ALTA
  'gate.exp.knowsDesc': 'You get an invite to the Level Test and skip what you already know.', // ALTA
  'gate.login.emailLabel': 'Email', // ALTA
  'gate.login.emailPh': 'you@email.com', // ALTA
  'gate.login.passwordLabel': 'Password', // ALTA
  'gate.login.noAccount': 'Don\'t have an account?', // ALTA
  'gate.signup.back': 'Back', // ALTA
  'gate.signup.step': 'Step {n} of 3', // ALTA
  'gate.signup.haveAccount': 'Already have an account?', // ALTA
  'gate.signup.loginLink': 'Log in', // ALTA
  'gate.signup.methodTitle': 'Create your account and start learning {lang}', // ALTA
  'gate.signup.methodSub': 'It\'s free. Choose how you\'d like to sign up.', // ALTA
  'gate.signup.withEmail': 'Continue with email', // ALTA
  'gate.signup.dataTitle': 'Your details', // ALTA
  'gate.signup.dataSub': 'Your name and your @ appear on your profile.', // ALTA
  'gate.signup.name': 'Name', // ALTA
  'gate.signup.namePh': 'Your name', // ALTA
  'gate.signup.username': 'Your @', // ALTA
  'gate.signup.userFree': '@{u} is available.', // ALTA
  'gate.signup.userTaken': '@{u} is already taken. How about one of these?', // ALTA
  'gate.signup.userTakenNoSugg': '@{u} is already taken.', // ALTA
  'gate.signup.userReserved': '@{u} can\'t be used. How about one of these?', // ALTA
  'gate.signup.userReservedNoSugg': '@{u} can\'t be used.', // ALTA
  'gate.signup.userInvalid': 'Use 3 to 24 letters or numbers, with dots only between them.', // ALTA
  'gate.signup.userChecking': 'Checking...', // ALTA
  'gate.signup.userCheckFailed': 'Couldn\'t check right now. If the @ is taken, you\'ll pick another one after the code.', // ALTA
  'gate.signup.userHelp': 'We build your @ from your name; you can change it now. Use letters, numbers and dots. Once your account is created, it can\'t be changed.', // ALTA
  'gate.signup.userPickFree': 'Pick an available @.', // ALTA
  'gate.signup.needName': 'Enter your name.', // ALTA
  'gate.signup.badEmail': 'Check the email address.', // ALTA
  'gate.signup.shortPassword': 'The password needs at least 6 characters.', // ALTA
  'gate.signup.retryTitle': 'Choose another @', // ALTA
  'gate.signup.retrySub': 'Someone took @{u} while you were creating your account. Pick another one to continue.', // ALTA
  'gate.signup.retrySave': 'Save and continue', // ALTA
  'gate.signup.passwordPh': 'Create a password (at least 6 characters)', // ALTA
  // Etapa 3, lote A (2026-10-19): trilha, cartão Continuar, Revisão do módulo e mapa da trilha. needs_review:
  // tradução nova, ainda não revisada pela dona; confiança no comentário de cada linha. Antes estes textos
  // apareciam em português também no site em inglês.
  'common.start': 'Start', // ALTA
  'trail.lessonsCompleted': { one: '{done} of {total} lesson completed', other: '{done} of {total} lessons completed' }, // ALTA
  'trail.continue.eyebrowDone': 'Your path', // ALTA -- "Path", escolha da dona (2026-10-19)
  'trail.continue.allDone': 'You\'ve completed the whole Study Path 🎉', // ALTA -- "Study Path", escolha da dona (2026-10-19)
  'trail.continue.lessonOf': 'lesson {i} of {n}', // ALTA
  'classBanner.title': { one: '{n} card from your teacher today', other: '{n} cards from your teacher today' }, // ALTA
  'classBanner.titleShort': { one: '{n} card today', other: '{n} cards today' }, // ALTA
  'classBanner.eyebrow': 'From your teacher', // ALTA
  'classBanner.sub': 'From your latest classes', // ALTA
  'classBanner.subReview': 'From your latest classes. A few minutes keeps everything fresh.', // ALTA
  'classBanner.cta': 'Review now ({n})', // ALTA
  'trail.continue.eyebrowResume': 'Pick up where you left off', // ALTA
  'trail.continue.eyebrowStart': 'Start here', // ALTA
  'trail.moduleReview.title': 'Module review', // ALTA
  'trail.moduleReview.chip': 'Review', // ALTA
  'trail.moduleReview.locked': 'Locked: unlock the module (complete the previous unit) to review.', // ALTA
  'trail.moduleReview.empty': 'Nothing to review yet: study this module\'s units and come back here.', // ALTA
  'trail.moduleReview.doneOn': 'Reviewed on {date} (optional)', // ALTA
  'trail.moduleReview.doneOnAgain': 'Reviewed on {date} · to review again now: {why} (optional)', // MÉDIA -- "de novo agora" sem equivalente curto; alternativa: "· again now: {why}"
  'trail.moduleReview.recommended': 'Recommended before moving on (optional)', // ALTA
  'trail.moduleReview.reason.itemWord.one': 'item', // ALTA
  'trail.moduleReview.reason.itemWord.other': 'items', // ALTA
  'trail.moduleReview.reason.learning': '{n} with recent mistakes', // ALTA
  'trail.moduleReview.reason.due': '{n} due today', // ALTA
  'trail.moduleReview.reason.weak': '{n} with weaker memory', // MÉDIA -- termo do FSRS em linguagem simples; alternativa: "{n} you remember less well"
  'trail.moduleReview.reason.fresh.one': '{n} new', // ALTA
  'trail.moduleReview.reason.fresh.other': '{n} new', // ALTA
  'trail.checkpoint.skipLockedToast': 'Skipping units is a Premium plan feature (or for the teacher\'s students). On the free plan, follow the units in order. 🔒', // ALTA
  'trail.known.siblingStudied': 'You already studied this word with the reverse card.', // ALTA
  'zh.path.levelTitle': 'Level 1 · Beginner', // ALTA
  'trail.view.aria': 'Path view mode', // ALTA -- "Path", escolha da dona (2026-10-19)
  'trail.view.trail': 'Path', // ALTA -- "Path", escolha da dona (2026-10-19)
  'trail.view.map': 'Map', // ALTA
  'trail.map.closePanel': 'Close panel', // ALTA
  'trail.map.note.done': '✓ Completed', // ALTA
  'trail.map.note.skipped': '↷ Skipped', // ALTA
  'trail.map.note.current': 'You are here', // ALTA
  'trail.map.note.locked': '🔒 Locked', // ALTA
  'trail.map.note.empty': 'Nothing yet', // ALTA
  'trail.map.state.done': 'Completed', // ALTA
  'trail.map.state.current': 'Current', // ALTA
  'trail.map.state.available': 'Available', // ALTA
  'trail.map.state.empty': 'No items', // ALTA
  'trail.map.aria.grammarSuffix': ', grammar', // ALTA
  'trail.map.aria.review': 'Module {n} review, optional', // ALTA
  'trail.map.aria.reviewEmptySuffix': ', nothing to review yet', // ALTA
  'trail.map.aria.checkpoint': 'Module {n} checkpoint', // ALTA
  'trail.map.aria.story': 'Story: {title}, {state}', // ALTA
  'trail.map.checkpointShort': 'Checkpoint', // MÉDIA -- rótulo curto do nó; "Ponto" sozinho não tem tradução curta melhor
  'trail.map.unitsSection': 'Units', // ALTA
  'trail.map.unit.eyebrow': 'Unit', // ALTA
  'trail.map.unit.toReview': '🔁 {n} to review', // ALTA
  'trail.map.unit.lockedHint': 'Complete the previous unit to unlock this one.', // ALTA
  'trail.map.unit.skipCta': 'Take the Checkpoint to skip', // ALTA
  'trail.map.unit.openAgain': 'Open again', // ALTA
  'trail.map.review.statusDone': 'Reviewed', // ALTA
  'trail.map.review.statusReady': 'Recommended', // ALTA
  'trail.map.review.goal': 'Optional: a short session with what most needs review in this module. It never blocks your progress.', // ALTA
  'trail.map.review.lastSession': 'Last session: {date}', // ALTA
  'trail.map.review.cta': 'Review now', // ALTA
  'trail.map.checkpoint.lockedHint': 'Unlock the module (complete the previous unit) to take the Checkpoint.', // ALTA
  'trail.map.checkpoint.redo': 'Retake the checkpoint', // ALTA
  'trail.map.checkpoint.take': 'Take the Checkpoint', // ALTA
  'trail.map.checkpoint.passed': 'Passed (best score {score}%)', // ALTA
  'trail.map.checkpoint.locked': 'Locked', // ALTA
  'trail.map.checkpoint.goal': 'Test the whole module at once. If you do well (70% or more), its units are marked as skipped.', // ALTA
  'trail.map.story.eyebrow': 'Story', // ALTA
  'trail.map.story.lockedHint': 'Complete the previous unit to unlock this story.', // ALTA
  'trail.map.story.readAgain': 'Read again', // ALTA
  'trail.map.story.read': 'Read the story', // ALTA
  // Etapa 3, lote B (2026-10-19): lição, janela de sequência, aviso de cartões, Perfil (Metas/Progresso), foto do
  // perfil, Hanzi e frases de carregamento. needs_review: tradução nova, ainda não revisada pela dona.
  'common.backArrow': '← Back', // ALTA
  'streak.modal.headline.one': 'You\'re on a {n}-day streak!', // ALTA
  'streak.modal.headline.other': 'You\'re on a {n}-day streak!', // ALTA
  'ui.reviewReminder.subRest': 'cards are waiting for you. Sharpen your memory by reviewing what you\'ve already seen.', // ALTA -- o travessão virou ponto; o número fica antes, no <span>
  'ui.reviewReminder.cta': 'Review now', // ALTA
  'profile.goals.title': 'My goals', // ALTA
  'profile.goals.edit': 'Edit goal', // ALTA
  'progress.stat.teacherContent': 'Teacher\'s content studied', // MÉDIA -- alternativa: "Studied from your teacher"
  'progress.stat.ownContent': 'My content studied', // MÉDIA -- alternativa: "Your own content studied"
  'profile.err.photoLoginRequired': 'Sign in to your account to save a photo.', // ALTA
  'profile.err.photoNotImage': 'Choose an image file (JPG, PNG...).', // ALTA
  'zh.hanzi.reviewAll': '🔁 Review characters', // ALTA
  'loading.phrase.loading': 'Loading...', // ALTA
  'loading.phrase.oneSec': 'Just a second...', // ALTA
  'loading.phrase.almost': 'Almost there...', // ALTA
  'loading.phrase.fetching': 'Getting the data...', // ALTA
  'loading.phrase.preparing': 'Getting everything ready...', // ALTA
  'loading.phrase.moment': 'One moment...', // ALTA
  'zh.hanzi.radicals': '🧬 Radicals', // ALTA (achado extra: botão e título da tela de Radicais)
  // Etapa 3, lote C (2026-10-19): gerenciador de Tags, excluir Deck, importação cortada, Meus cartões, validação de
  // tags, novo editor, importação .apkg e Decks públicos. Texto pt idêntico ao que estava escrito direto no JS/HTML.
  'tagManager.err.systemRename': 'Attribution tags (criado-por-…) are system tags and can\'t be renamed.', // ALTA
  'tagManager.err.systemReserved': 'Names that start with "criado-por" are reserved for the system.', // ALTA
  'tagManager.err.invalidName': 'Enter a valid tag name (letters, numbers and hyphens).', // ALTA
  'tagManager.err.invalidTag': 'Invalid tag name.', // ALTA
  'tagManager.err.invalidScope': 'Invalid scope.', // ALTA
  'tagManager.err.systemProtected': 'Attribution tags (criado-por-…) are system tags and can\'t be created, renamed or deleted.', // ALTA
  'tagManager.err.generic': 'We couldn\'t finish this right now. Try again.', // ALTA
  'tagManager.unchanged': 'No changes.', // ALTA
  'tagManager.rename.newName': 'New name:', // ALTA
  'tagManager.rename.affected.one': 'item will be changed', // ALTA -- Etapa 4: aprovado pela dona
  'tagManager.rename.affected.other': 'items will be changed', // ALTA -- Etapa 4: aprovado pela dona
  'tagManager.rename.collision.one': 'item already uses', // ALTA -- Etapa 4: aprovado pela dona
  'tagManager.rename.collision.other': 'items already use', // ALTA -- Etapa 4: aprovado pela dona
  'tagManager.rename.collisionMerge': ': the two tags will be merged (no duplicates).', // ALTA
  'tagManager.note.one': 'item', // ALTA -- Etapa 4: aprovado pela dona
  'tagManager.note.other': 'items', // ALTA -- Etapa 4: aprovado pela dona
  'tagManager.rename.inputAria': 'New name for tag {tag}', // ALTA
  'tagManager.rename.confirm': 'Confirm rename', // ALTA
  'tagManager.cancel': 'Cancel', // ALTA
  'tagManager.delete.askHtml': 'Delete <strong>#{tag}</strong>? This tag will be removed from {notes}. The removal applies everywhere in your scope and can\'t be undone.', // ALTA
  'tagManager.delete.confirm': 'Delete tag', // ALTA
  'tagManager.systemTag': 'permanent attribution (system)', // MÉDIA -- alternativa: "permanent credit (system)"
  'tagManager.rename': 'Rename', // ALTA
  'tagManager.delete.title': 'Delete tag', // ALTA
  'tagManager.delete.aria': 'Delete tag {tag}', // ALTA
  'tagManager.loading': 'Loading tags…', // ALTA
  'tagManager.hint.teacher': 'Tags on your student cards (all students and languages). Renaming or deleting applies to all of them.', // ALTA
  'tagManager.hint.own': 'Tags on your own cards. Tags on your teacher\'s cards don\'t show up here and you can\'t change them.', // ALTA
  'tagManager.retry': 'Try again', // ALTA
  'tagManager.empty': 'You\'re not using any tags yet.', // ALTA
  'tagManager.renaming': 'Renaming…', // ALTA
  'tagManager.deleting': 'Deleting…', // ALTA
  'tagManager.done.merged': ', {n} merged', // ALTA
  'tagManager.done.removedFrom': '✓ #{tag} removed from {n} {notes}.', // ALTA
  'deck.delete.err.notOwn': 'You can only delete a personal Deck of your own.', // ALTA
  'deck.delete.err.checkFailed': 'We couldn\'t check this Deck\'s cards right now. Nothing was changed.', // ALTA
  'deck.delete.err.mismatch': 'This Deck\'s cards don\'t match what\'s on the screen. Reload the page and try again. Nothing was changed.', // ALTA
  'deck.delete.err.chooseDest': 'Choose a personal Deck outside this one to receive the cards.', // ALTA
  'deck.delete.err.moveFailed': 'We couldn\'t move the cards right now. Nothing was deleted.', // ALTA
  'deck.delete.err.deleteCardsFailed': 'We couldn\'t delete the cards right now. Nothing was deleted.', // ALTA
  'deck.delete.err.invalidOp': 'Invalid operation.', // ALTA
  'deck.delete.err.movedButDeck': 'The cards were moved, but we couldn\'t delete the Deck right now. Try again.', // ALTA
  'deck.delete.err.deletedButDeck': 'The cards were deleted, but we couldn\'t delete the Deck right now. Try again.', // ALTA
  'flashcardLimit.cut.title': '🔒 Import limited by the free plan', // ALTA
  'flashcardLimit.cut.ctaStrong': '⭐ With Premium, your own cards are unlimited.', // ALTA
  'flashcardLimit.cut.ctaBody': 'To ask for Premium, contact Prof. Brune using the button below. You can also delete cards you no longer use to free up space.', // ALTA
  'myFlashcards.tags.teacher': 'Tags on your teacher\'s cards:', // ALTA
  'myFlashcards.tags.filterNotice': 'Tag filter on in Review: {chips} — it also applies to "Study this Deck".', // ALTA
  'myFlashcards.tags.clear': 'Clear', // ALTA
  'myFlashcards.export.noneFits': 'None of the selected cards fit this format (front and back only).', // ALTA
  'tags.err.tooLong': 'Tag too long (up to {max} characters): "{tag}…".', // ALTA
  'tags.err.tooMany': 'Up to {max} tags per card ({n} were given).', // ALTA
  'noteConvert.err.noBlank': 'This fill-in sentence has no "___" marking the blank, so we can\'t tell where the answer goes. Fix the sentence in the usual form before using the new editor.', // ALTA
  'noteConvert.err.manyBlanks': 'This fill-in sentence has more than one "___". The old form only supports 1 blank per card, so we can\'t tell automatically which one becomes the new blank. Fix the sentence in the usual form before using the new editor.', // ALTA
  'noteConvert.err.mcNoAnswer': 'This multiple choice card has no correct answer set (the back is empty), so we can\'t tell which answer is right. Fill in the back in the usual form before using the new editor.', // ALTA
  'noteEditor.err.emptySides': 'Both content fields (front/back) need text.', // ALTA
  'import.tagsDropped.limit': { one: '{n} tag was skipped for going over the limit ({max} tags per card, {len} characters per tag).', other: '{n} tags were skipped for going over the limit ({max} tags per card, {len} characters per tag).' }, // ALTA
  'import.tagsDropped.system': { one: '{n} system tag (author credit) isn\'t imported from a file or link: only a copy made in the app creates it.', other: '{n} system tags (author credit) aren\'t imported from a file or link: only a copy made in the app creates them.' }, // MÉDIA -- alternativa: "authorship attribution"
  'ownFlashcards.err.copyFailed': 'We couldn\'t copy the card right now.', // ALTA
  'review.tagLabel.unitPrefix': '#unit-', // MÉDIA -- só o prefixo do rótulo; o resto é o slug do título da unidade
  'ankiImport.parse.invalid_zip': 'This file is not a valid .apkg/.zip.', // ALTA
  'ankiImport.parse.missing_collection': 'This .apkg doesn\'t contain a card collection we recognize.', // ALTA
  'ankiImport.parse.unreadable_collection': 'We couldn\'t read the card collection inside the .apkg.', // ALTA
  'ankiImport.parse.invalid_sqlite': 'The card collection in this .apkg is corrupted or in a format we don\'t recognize.', // ALTA
  'ankiImport.parse.empty_collection': 'The "col" table in this collection is empty.', // ALTA
  'ankiImport.parse.malformed_col_table': 'We couldn\'t read the "col" table in this collection.', // ALTA
  'ankiImport.parse.malformed_notes_cards': 'We couldn\'t read the items and cards in this collection.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.parse.unsupported_format_zstd': 'This .apkg uses the newer Anki format, which this importer doesn\'t support yet. In Anki, when you export, check "Support older Anki versions" to create a compatible package, and try again.', // ALTA
  'ankiImport.parse.unsupported_format_protobuf': 'This .apkg was exported in a newer Anki format, which this importer doesn\'t support yet. In Anki, when you export, check "Support older Anki versions" to create a compatible package, and try again.', // ALTA
  'ankiImport.parse.missing_dependencies': 'The .apkg reading libraries didn\'t load.', // ALTA
  'ankiImport.parse.no_notetypes': 'This collection doesn\'t have any card model (notetype) we recognize.', // ALTA
  'ankiImport.warn.emptyFrontBack': 'The front or back was empty after removing formatting and media. Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.emptyZh': 'Pinyin, character or translation was empty after removing formatting and media. Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.emptyQA': 'The question or answer was empty after removing formatting and media. Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.clozeNoTranslation': 'This Cloze card doesn\'t have a filled-in 2nd translation field in Anki. The app needs a translation for this format, so the item was skipped. You can create it by hand later.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.noClozeMarks': 'No valid Cloze blank found in the text. Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.hintsDropped': { one: '{n} Anki blank hint wasn\'t kept (there\'s no safe match in this app). The answer itself was kept.', other: '{n} Anki blank hints weren\'t kept (there\'s no safe match in this app). The answer itself was kept.' }, // ALTA
  'ankiImport.warn.unrecognized': 'Card format not recognized (it isn\'t a recognizable Basic/Basic reversed/Cloze/Type the answer). Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.media.notFound': 'Media "{file}" is referenced but wasn\'t found in the .apkg package.', // ALTA
  'ankiImport.media.notInPackage': 'Media "{file}" is listed in the manifest but missing from the package.', // ALTA
  'ankiImport.media.unreadable': 'We couldn\'t read the media file "{file}" from the package.', // ALTA
  'ankiImport.media.uploadFailed': 'Failed to upload "{file}".', // ALTA
  'ankiImport.warn.missingModel': 'The card model this item uses doesn\'t exist in the collection. Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.unrecognizedType': 'Anki card type not safely recognized (it isn\'t a clear Basic/Basic reversed/Cloze/Type the answer). Item skipped.', // ALTA -- Etapa 4: aprovado pela dona
  'ankiImport.warn.systemTags': { one: '{n} system tag ({tags}) can\'t be imported: author credit is only created by the app itself.', other: '{n} system tags ({tags}) can\'t be imported: author credit is only created by the app itself.' }, // MÉDIA -- alternativa: "authorship attribution"
  'ankiImport.warn.tagsTooLong': { one: '{n} tag over {max} characters wasn\'t imported: {tags}.', other: '{n} tags over {max} characters weren\'t imported: {tags}.' }, // ALTA
  'ankiImport.warn.tagsOverLimit': { one: 'Limit of {max} tags per card: {n} tag wasn\'t imported: {tags}.', other: 'Limit of {max} tags per card: {n} tags weren\'t imported: {tags}.' }, // ALTA
  'ankiImport.warn.invalidAfterMap': 'Invalid card after mapping: {error}', // ALTA
  'ankiImport.warn.extraTemplates': { one: '{n} extra template of this card type wasn\'t kept (only the 1st was imported).', other: '{n} extra templates of this card type weren\'t kept (only the 1st was imported).' }, // ALTA
  'ankiImport.err.deckCreateNamed': 'We couldn\'t create the Deck "{name}"{detail}. The cards in that folder weren\'t imported.', // ALTA
  'ankiImport.conflict.title': 'A deck with this name already exists. What do you want to do?', // ALTA
  'ankiImport.conflict.more': '+ {n} more', // ALTA
  'ankiImport.conflict.suffix': 'Create with suffix (2)', // ALTA
  'ankiImport.conflict.merge': 'Add to the existing Deck', // ALTA
  'ankiImport.conflict.hint': 'This choice applies to all repeated decks in this import. When adding to the existing Deck, cards that seem to already exist stay unchecked.', // ALTA
  'ankiImport.conflict.chooseFirst': 'Decks with these names already exist. Choose what to do above before importing.', // ALTA
  'publicDeck.err.inFlight': 'This import is already in progress.', // ALTA
  'publicDeck.err.loginToImport': 'Sign in to your account to import.', // ALTA
  'publicDeck.err.premium': 'Importing public Decks is a Premium feature.', // ALTA
  'publicDeck.err.unavailable': 'This Deck is no longer available.', // ALTA
  'publicDeck.err.duplicatesChanged': 'Your collection or the Deck changed since the analysis. Nothing was imported; review the new plan.', // ALTA
  'publicDeck.err.invalidSelection': 'The selection isn\'t valid. Nothing was imported; review the plan.', // ALTA
  'publicDeck.err.tooLarge': 'This Deck is too big to import all at once.', // ALTA
  'publicDeck.err.mediaTooLarge': 'This Deck has too many media files to import all at once.', // ALTA
  'publicDeck.err.mediaCopyFailed': 'We couldn\'t copy the media files. Nothing was imported; try again.', // ALTA
  'publicDeck.err.ambiguous': 'The connection failed during the import, and it may have finished anyway. Check My Decks before trying again.', // ALTA
  'publicDeck.err.mediaMapIncomplete': 'The Deck changed during the import. Try again.', // ALTA
  'publicDeck.err.invalidMediaMap': 'We couldn\'t validate the media files. Nothing was imported.', // ALTA
  'publicDeck.err.ownDeck': 'This Deck is already yours.', // ALTA
  'publicDeck.err.descriptionTooLong': 'The description can have up to 280 characters.', // ALTA
  'publicDeck.err.kindForbidden': 'Only personal Decks (inside My Decks) can be public.', // ALTA
  'publicDeck.err.notFound': 'Deck not found.', // ALTA
  'publicDeck.err.generic': 'We couldn\'t finish this right now. Try again.', // ALTA
  'publicDeck.mode.cloze': 'Fill in the blank', // ALTA
  'publicDeck.unavailable.title': 'Deck unavailable', // ALTA
  'publicDeck.unavailable.body': 'This Deck doesn\'t exist or isn\'t public right now.', // ALTA
  'publicDeck.gate.login': '🔒 Sign in to your account to see the cards. Opening and importing public Decks is a Premium feature.', // ALTA
  'publicDeck.gate.premium': '🔒 Opening and importing public Decks is a Premium feature. You can see the Deck details above.', // ALTA
  'publicDeck.loading': 'Loading Deck...', // ALTA
  'publicDeck.subdecks': 'Public subdecks', // ALTA
  'publicDeck.notesCount': { one: '{n} item', other: '{n} items' }, // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.wrongSite': 'This Deck is in {lang}.', // MÉDIA -- alternativa: "This is a {lang} Deck."
  'publicDeck.openOtherSite': 'Open it on the matching site', // ALTA
  'publicDeck.viewCards': '📇 See cards ({n})', // ALTA
  'publicDeck.importBtn': '⬇️ Import to My Decks', // ALTA
  'publicDeck.importHint': 'Creates an independent copy inside My Decks, credited to the original author. Your study progress starts from zero.', // ALTA
  'publicDeck.by': 'by', // ALTA
  'publicDeck.updatedOn': 'Updated {date}', // ALTA
  'publicDeck.report': '⚑ Report this Deck', // ALTA
  'publicDeck.loadingCards': 'Loading cards...', // ALTA
  'publicDeck.notes.premium': 'Opening public Decks is a Premium feature.', // ALTA
  'publicDeck.notes.login': 'Sign in to your account to see the cards.', // ALTA
  'publicDeck.notes.failed': 'We couldn\'t load the cards.', // ALTA
  'publicDeck.notes.empty': 'This Deck doesn\'t have any public cards yet.', // ALTA
  'publicDeck.notes.view': 'View', // ALTA
  'publicDeck.notes.reportTitle': 'Report this card', // ALTA
  'publicDeck.plan.instances': { one: '{n} card', other: '{n} cards' }, // ALTA
  'publicDeck.plan.title': 'Import “{name}”', // ALTA
  'publicDeck.plan.contains': { one: 'This Deck has {n} item.', other: 'This Deck has {n} items.' }, // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.plan.existing': '{n} already exist in your collection', // ALTA
  'publicDeck.plan.archived': '({n} archived)', // ALTA
  'publicDeck.plan.willAdd': 'will be added.', // ALTA
  'publicDeck.plan.renamed': 'A Deck with this name already exists: it will be created as “{name}”.', // ALTA
  'publicDeck.plan.new': 'New', // ALTA
  'publicDeck.plan.variants': 'Similar to something of yours (unchecked)', // ALTA
  'publicDeck.plan.variantsHint': 'They start like one of your items but have different content. Check only the ones you want as new, independent items; yours aren\'t changed.', // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.plan.related': 'Related content found', // ALTA
  'publicDeck.plan.relatedHint': { one: '{n} item has the same pair in another card type in your collection. It isn\'t imported.', other: '{n} items have the same pair in another card type in your collection. They aren\'t imported.' }, // ALTA
  'publicDeck.plan.existingSummary': '{n} already exist in your collection — they won\'t be imported', // ALTA
  'publicDeck.plan.archivedOne': 'archived', // ALTA
  'publicDeck.plan.alreadyExists': 'already exists', // ALTA
  'publicDeck.plan.sourceDup': '{n} repeated inside the Deck itself: imported only once.', // ALTA
  'publicDeck.plan.incompatible': { one: '{n} item couldn\'t be imported (incompatible format).', other: '{n} items couldn\'t be imported (incompatible format).' }, // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.plan.import': 'Import', // ALTA
  'publicDeck.plan.cancel': 'Cancel', // ALTA
  'publicDeck.plan.analyzing': 'Analyzing your collection...', // ALTA
  'publicDeck.plan.toStudy': { one: '{n} card to study.', other: '{n} cards to study.' }, // ALTA
  'publicDeck.plan.decksCreated': 'Decks created: {list}', // ALTA
  'publicDeck.plan.omitted': '({n} with no new items, left out)', // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.plan.nothingNew': 'Nothing new to import.', // ALTA
  'publicDeck.plan.nothingNewBtn': 'Nothing new to import', // ALTA
  'publicDeck.plan.importN.one': 'Import {n} item', // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.plan.importN.other': 'Import {n} items', // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.copyingMedia': 'Copying media {done}/{total}...', // ALTA
  'publicDeck.done.imported': { one: '✅ {n} item imported', other: '✅ {n} items imported' }, // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.done.into': 'into “{name}”', // ALTA
  'publicDeck.done.existed': '{n} already existed.', // ALTA
  'publicDeck.done.incompatible': '({n} couldn\'t be imported)', // ALTA
  'publicDeck.done.nothing': 'Nothing new to import: this content is already in your collection.', // ALTA
  'publicDeck.publish.publicPrivateProfile': '🌐 This Deck is public, but your profile is private: only your friends and your teacher can see it.', // ALTA
  'publicDeck.publish.public': '🌐 This Deck is public: it shows on your profile and opens from the link.', // ALTA
  'publicDeck.publish.private': '🔒 This Deck is private: only you can see it.', // ALTA
  'publicDeck.publish.ownKeyHtml': 'Each Deck has its own switch: <strong>subdecks don\'t change with it</strong>. The cards\' "private note" field is never public.', // MÉDIA -- "chave" = interruptor público/privado
  'publicDeck.publish.notesWillBePublic': { one: '{n} item will become public.', other: '{n} items will become public.' }, // ALTA -- Etapa 4: aprovado pela dona
  'publicDeck.publish.incompatHtml': '{n} can\'t be shown in the new format and <strong>won\'t be published</strong> (they stay as they are in your Deck).', // ALTA
  'publicDeck.publish.copyLink': 'Copy link', // ALTA
  'publicDeck.publish.makePrivate': 'Make private', // ALTA
  'publicDeck.publish.makePublic': 'Make public', // ALTA
  'publicDeck.publish.editPage': 'Edit Deck page', // ALTA
  'publicDeck.publish.descLabel': 'Description (optional, up to 280 characters)', // ALTA
  'publicDeck.publish.iconAria': 'Icon', // ALTA
  'publicDeck.publish.colorAria': 'Color', // ALTA
  'publicDeck.publish.save': 'Save changes', // ALTA
  'publicDeck.publish.toastPrivateProfile': 'Public Deck. Since your profile is private, only your friends and your teacher can see it.', // ALTA
  'publicDeck.publish.toastPublic': '🌐 Public Deck.', // ALTA
  'publicDeck.publish.confirmPrivate': 'Make this Deck private? It leaves your profile and the link stops working. Copies other people already made stay with them.', // ALTA
  'publicDeck.publish.toastPrivate': '🔒 Private Deck.', // ALTA
  'publicDeck.publish.linkCopied': 'Link copied.', // ALTA
  'publicProfile.footer.askFr': 'Want to study French too?', // ALTA
  'publicProfile.footer.askZh': 'Want to study Mandarin too?', // ALTA
  'publicProfile.footer.cta': 'Create my account →', // ALTA
  'publicDeck.modal.title': 'Public Deck', // ALTA
};
