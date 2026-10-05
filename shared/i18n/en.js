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
  'fr.checkpoint.howToSay': 'How do you say "{t}" in French?', // ALTA
  'fr.checkpoint.moduleDone': 'Module complete! 🏆', // ALTA
  'fr.checkpoint.finishSection': 'Finish section ✓', // ALTA
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
  'zh.hint.fullsentence': 'Reread the sentence in Portuguese and think about how each part of it is normally said in Chinese, before comparing the options.', // MÉDIA
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
  'fr.challenges.moduleSub': '{title} · now that you have studied this topic, practice in new ways.', // ALTA
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
  'auth.notLoadedYet': '⏳ Still confirming your saved progress -- wait a moment before continuing.', // ALTA
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
  'profile.err.usernameShort': 'Username must be at least 3 characters (letters, numbers, dot, dash or _).', // ALTA
  'profile.err.usernameTaken': 'That username is already taken.', // ALTA
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
  'ankiImport.decks.title': '📚 Decks found in Anki:', // ALTA
  'ankiImport.decks.note': 'This app does not have Decks yet -- all confirmed cards go straight into "My Cards", without this organization for now. Once Decks exist, this hierarchy (already recognized and saved) will be able to recreate the same structure automatically.', // MÉDIA
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
  'ankiImport.result.ok': { one: '✓ <strong>{imported}</strong> of {n} selected card was imported successfully to "My Cards".', other: '✓ <strong>{imported}</strong> of {n} selected cards were imported successfully to "My Cards".' }, // ALTA
  'ankiImport.result.partial': '⚠️ The import stopped halfway -- <strong>{imported}</strong> of {requested} cards were already saved successfully before the failure. Those already imported will NOT be duplicated if you try again (that attempt will detect the ones that already exist).', // ALTA
  'ankiImport.result.mediaWarn': { one: '⚠️ {n} media file could not be included (the card text was imported normally): {list}{more}', other: '⚠️ {n} media files could not be included (the card text was imported normally): {list}{more}' }, // ALTA
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
  'fieldEditor.audio.ttsVoicePlaceholder': 'e.g. provider default', // ALTA
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
  'fieldEditor.audio.discardedUpload': 'Another audio source was used while this file was uploading -- the result was discarded.', // ALTA
  'fieldEditor.audio.stale': '⚠️ Outdated audio -- the text or settings changed since the last generation. Click "Generate again" to update.', // ALTA
  'fieldEditor.audio.generateAgain': '🔄 Generate again', // ALTA
  'fieldEditor.audio.err.genUnavailable': 'Audio generation is not available on this screen.', // ALTA
  'fieldEditor.audio.alreadyUpToDate': 'The audio is already up to date for these settings -- no new generation was requested.', // ALTA
  'fieldEditor.audio.generating': 'Generating audio...', // ALTA
  'fieldEditor.audio.err.genFailed': "We couldn't generate the audio right now.", // ALTA
  'fieldEditor.audio.discardedGen': 'Another audio source was used while this one was being generated -- the result was discarded.', // ALTA
  'fieldEditor.audio.configChanged': 'The settings changed while the audio was being generated -- click Generate again.', // ALTA
  'fieldEditor.field.removeTitle': 'Remove field', // ALTA
  'fieldEditor.field.content': 'Content', // ALTA
  'fieldEditor.field.language': 'Language', // ALTA
  'fieldEditor.field.hasImage': '🖼️ has an attached image', // ALTA
  'fieldEditor.field.hasPinyin': '🔤 has a linked pinyin field', // ALTA
  'fieldEditor.field.mediaNotes': '{notes} (editing is not implemented yet at this stage -- preserved as they are).', // ALTA
  'fieldEditor.field.defaultLabel': 'Field {n}', // ALTA
  'fieldEditor.list.empty': 'No fields yet -- use "Add field" below.', // ALTA
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
  'fr.dictation.scoreTextHtml': 'You wrote <strong>{matches} of {total}</strong> words correctly. You scored {score} points ({score}%).', // ALTA
};
