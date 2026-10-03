// Catálogo pt-BR -- FONTE DA VERDADE da interface (i18n, Etapa 2 -- piloto).
// Cada valor aqui é BYTE A BYTE igual ao texto original do HTML/JS (ver
// tests/i18n/test_i18n_unit.js, teste de regressão contra git). Nunca editar
// o texto aqui sem editar o HTML junto (o HTML continua com o português
// escrito como valor padrão).
// Recortes: modal "Reportar problema ou sugestão" + pontos de entrada (piloto);
// modais de limite/reinício de cartão, Recurso Premium e seletor de idioma.
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

  // ---- modal "Recurso Premium" dos Desafios do Módulo (só fr) ----
  'premium.challenges.title': '🔒 Recurso Premium',
  'premium.challenges.bodyHtml': 'Os <strong>Desafios do Módulo</strong> reforçam cada tema da trilha com Expressões, Ouça e traduza, Acentuação e Ditados extras.',
  'premium.challenges.howToActivate': 'Eles fazem parte do plano Premium. Para ativar, fale com a administração (profbrune).',

  // ---- modal de limite de cartões próprios (plano grátis) ----
  'flashcardLimit.modal.title': '🔒 Limite do plano grátis',
  'flashcardLimit.modal.bodyHtml': 'Você atingiu o limite de <strong>20 cartões próprios ativos</strong> do plano grátis. Pra criar mais, arquive algum cartão que já não usa, ou peça pra sua professora te vincular -- alunos vinculados a uma professora têm cartões próprios ilimitados.',
  'flashcardLimit.fallbackError': 'Você atingiu o limite de cartões do plano grátis.',
  // tp(): em pt-BR é uma string só (o texto original usa "cartão(ões)");
  // {n} = cartões de estudo que seriam criados, {remaining} = vagas restantes.
  'flashcardLimit.wouldGenerate': 'Este cartão geraria {n} cartão(ões) de estudo, mas restam só {remaining} no plano grátis.',

  // ---- modal de confirmação: editar reinicia o progresso ----
  'flashcardReset.modal.title': '⚠️ Confirmar edição',
  'flashcardReset.modal.body': 'Esta edição irá reiniciar o progresso de revisão deste cartão. Deseja continuar?',
  'flashcardReset.modal.discard': 'Descartar edições',
  'flashcardReset.modal.confirm': 'Sim',

  // ---- Configurações > Idioma da interface (texto NOVO, não existia antes) ----
  'settings.uiLanguage.title': 'Idioma da interface',
  'settings.uiLanguage.sub': 'Muda só os textos do app (menus, botões e avisos). Não muda o idioma que você estuda.',
};
