// Catálogo pt-BR -- FONTE DA VERDADE da interface (i18n, Etapa 2 -- piloto).
// Cada valor aqui é BYTE A BYTE igual ao texto original do HTML/JS (ver
// tests/i18n/test_i18n_unit.js, teste de regressão contra git). Nunca editar
// o texto aqui sem editar o HTML junto (o HTML continua com o português
// escrito como valor padrão).
// Recorte piloto: modal "Reportar problema ou sugestão" + pontos de entrada.
window.I18N_CATALOG = window.I18N_CATALOG || {};
window.I18N_CATALOG['pt-BR'] = {
  // ---- comuns ----
  'common.close': 'Fechar',

  // ---- pontos de entrada (topbar ⚑, bandeira da lição, menu da conta) ----
  'report.entry.label': 'Reportar problema',
  'report.entry.menuItem': '⚑ Reportar problema',

  // ---- modal ----
  'report.modal.title': '⚑ Reportar problema ou sugestão',
  'report.modal.whatHappened': 'O que aconteceu?',
  'report.modal.howMuch': 'Quanto isso atrapalhou?',
  'report.modal.optional': '(opcional)',
  'report.modal.describeLabel': 'Descreva o que você viu',
  'report.modal.describePlaceholder': 'O que aconteceu, exatamente?',
  'report.modal.expectedLabel': 'O que você esperava que acontecesse?',
  'report.modal.guestEmailLabel': 'Seu e-mail',
  'report.modal.guestEmailOptional': '(opcional, só se quiser receber uma resposta)',
  'report.modal.guestEmailPlaceholder': 'seuemail@exemplo.com',
  'report.modal.attachButton': '📎 Anexar captura de tela (opcional)',
  'report.modal.privacyNote': 'A captura, se anexada, fica visível só para a equipe -- nada é enviado automaticamente.',
  'report.modal.submit': 'Enviar',
  'report.modal.sending': 'Enviando...',
  'report.modal.successText': 'Report enviado. Obrigada por ajudar a melhorar o app!',

  // ---- categorias (ids estáveis em shared/reports.js) ----
  'report.category.bug_tecnico': 'Bug / erro técnico',
  'report.category.erro_conteudo': 'Erro de conteúdo',
  'report.category.traducao': 'Tradução incorreta',
  'report.category.audio': 'Áudio / pronúncia incorreta',
  'report.category.visual': 'Problema visual',
  'report.category.comportamento_inesperado': 'Algo não funciona como deveria',
  'report.category.sugestao_melhoria': 'Sugestão de melhoria',
  'report.category.outro': 'Outro',

  // ---- gravidade percebida ----
  'report.severity.impede': 'Impede continuar',
  'report.severity.dificulta': 'Dificulta a atividade',
  'report.severity.pequeno': 'Problema pequeno',
  'report.severity.sugestao': 'Apenas sugestão',

  // ---- mensagens ----
  'report.error.rateLimitLogged': 'Você já enviou vários reports recentemente. Aguarde alguns minutos antes de enviar outro.',
  'report.error.rateLimitGuest': 'Você já enviou vários reports recentemente. Aguarde alguns minutos ou crie uma conta.',
  'report.error.attachNotImage': 'O anexo precisa ser uma imagem.',
  'report.error.attachTooLarge': 'Imagem muito grande (máx. 8MB).',
  'report.error.attachUploadFailed': 'Não foi possível enviar a imagem.',
  'report.error.chooseCategory': 'Escolha uma categoria.',
  'report.error.describe': 'Descreva o que aconteceu.',
  'report.error.duplicate': 'Você já enviou isso agora há pouco -- obrigada!',
  'report.error.sendFailed': 'Não foi possível enviar. Verifique sua conexão e tente de novo.',
  'report.toast.success': '✓ Report enviado. Obrigada por ajudar!',
};
