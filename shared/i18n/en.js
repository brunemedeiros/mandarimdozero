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
};
