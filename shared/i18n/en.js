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
  'flashcardLimit.fallbackError': 'You\'ve reached the free plan\'s card limit.', // MÉDIA -- política Free
  'flashcardLimit.wouldGenerate': { one: 'This card would create {n} study card, but you only have {remaining} left on the free plan.', other: 'This card would create {n} study cards, but you only have {remaining} left on the free plan.' }, // MÉDIA -- política Free; plural real em EN (o PT usa "cartão(ões)")

  'flashcardReset.modal.title': '⚠️ Confirm edit', // ALTA
  'flashcardReset.modal.body': 'This edit will reset the review progress for this card. Do you want to continue?', // MÉDIA -- aviso de reinício de progresso
  'flashcardReset.modal.discard': 'Discard changes', // ALTA
  'flashcardReset.modal.confirm': 'Yes', // ALTA

  'settings.uiLanguage.title': 'Interface language', // ALTA
  'settings.uiLanguage.sub': 'Changes only the app\'s text (menus, buttons, and messages). It doesn\'t change the language you\'re studying.', // ALTA

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
  'settings.export.descFr': 'The exported deck includes the French word/phrase (with audio you can set up in Anki) and the Portuguese translation, using the same question/answer pair as in the app.', // MÉDIA
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
  'review.today.label': 'Reviews due', // ALTA
  'review.strength.title': 'Your words', // ALTA
  'review.strength.weak': 'Weak', // ALTA
  'review.strength.medium': 'Medium', // ALTA
  'review.strength.strong': 'Strong', // ALTA
  'review.strength.hint': 'Weak = not solid yet; Strong = known well for a while; Medium = somewhere in between. This is ALL your vocabulary, not today\'s reviews (above) -- so you can have medium words here even with no reviews due right now.', // MÉDIA -- texto longo; "firmou" sem equivalente direto
  'review.mode.reviewLabel': 'Review', // ALTA
  'review.empty.noneYetTitle': 'No reviews yet', // ALTA
  'review.empty.upToDateTitle': 'You\'re all caught up!', // ALTA
  'review.empty.noneYetDesc': 'Complete a lesson in Study to start having words to review.', // MÉDIA -- "Estudo" = aba Study
  'review.empty.upToDateDesc': 'Practice is still available right below, whenever you like.', // ALTA
  'review.mode.flashcard.name': 'Flashcard', // ALTA
  'review.mode.flashcard.desc': 'Full review', // ALTA
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
  'review.session.unitEmptyTitle': 'No cards in this unit yet', // ALTA
  'review.session.allDoneTitle': 'All caught up!', // ALTA
  'review.session.pendingOverall': 'You still have {n} card(s) due overall.', // ALTA
  'review.session.comeBackLater': 'Come back later for your next review, or start a new unit on the course path.', // ALTA
  'review.session.reviewAllAvailable': 'Review everything available', // ALTA
  'review.previewLabel': '👁️ Preview', // ALTA
  'review.cloze.placeholder': 'Type the missing word', // ALTA
  'review.typeAnswer.placeholder': 'Type the answer', // ALTA
  'review.tapToReveal': 'tap to see the answer', // ALTA
  'review.reviewMore': '🔁 Review more (doesn\'t count as an answer)', // ALTA
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
  'myFlashcards.edit.imageNotice': '⚠️ This card\'s image was kept in the data, but it doesn\'t show up in Review yet for cards from the new editor.', // MÉDIA
  'myFlashcards.toast.editedReset': '✓ Card edited. Its review progress was reset.', // ALTA
  'myFlashcards.toast.edited': '✓ Card edited.', // ALTA
  'myFlashcards.native.title': 'Edit card (native editor)', // MÉDIA
  'myFlashcards.native.hint': 'This card uses the new field model -- editing here, the content is saved to fields/card_generation_mode, never to the old columns.', // MÉDIA
  'myFlashcards.native.cardType': 'Card Type', // MÉDIA
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
};
