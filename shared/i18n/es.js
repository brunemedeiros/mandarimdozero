// Catálogo ES (neutro / América Latina) (i18n, Etapa 2 -- piloto). Carregado
// sob demanda. Chave faltando aqui cai em pt-BR. Comentário ao lado =
// confiança (ALTA/MÉDIA/BAIXA, mesmo critério do piloto A1-1). Registro: tú.
// CONGELADO (decisão da autora): só as chaves do piloto do Report. Não
// adicionar chaves novas; o que faltar cai em pt-BR. O seletor de idioma não
// oferece espanhol (só ?ui=es, para teste).
window.I18N_CATALOG = window.I18N_CATALOG || {};
window.I18N_CATALOG['es'] = {
  'common.close': 'Cerrar', // ALTA

  'report.entry.label': 'Reportar un problema', // ALTA
  'report.entry.menuItem': '⚑ Reportar un problema', // ALTA

  'report.modal.title': '⚑ Reportar un problema o sugerencia', // ALTA
  'report.modal.whatHappened': '¿Qué pasó?', // ALTA -- España: "¿Qué ha pasado?"
  'report.modal.howMuch': '¿Cuánto te afectó?', // MÉDIA -- "atrapalhou" ≈ "estorbó/molestó"; "afectó" é o mais neutro
  'report.modal.optional': '(opcional)', // ALTA
  'report.modal.describeLabel': 'Describe lo que viste', // ALTA
  'report.modal.describePlaceholder': '¿Qué pasó exactamente?', // ALTA
  'report.modal.expectedLabel': '¿Qué esperabas que pasara?', // ALTA
  'report.modal.guestEmailLabel': 'Tu correo electrónico', // ALTA
  'report.modal.guestEmailOptional': '(opcional, solo si quieres recibir una respuesta)', // ALTA
  'report.modal.guestEmailPlaceholder': 'tucorreo@ejemplo.com', // ALTA
  'report.modal.attachButton': '📎 Adjuntar captura de pantalla (opcional)', // ALTA
  'report.modal.privacyNote': 'Si la adjuntas, la captura solo la ve el equipo -- no se envía nada automáticamente.', // ALTA
  'report.modal.submit': 'Enviar', // ALTA
  'report.modal.sending': 'Enviando...', // ALTA
  'report.modal.successText': 'Reporte enviado. ¡Gracias por ayudar a mejorar la app!', // ALTA

  'report.category.bug_tecnico': 'Bug / error técnico', // ALTA -- alternativa: "Falla técnica"
  'report.category.erro_conteudo': 'Error de contenido', // ALTA
  'report.category.traducao': 'Traducción incorrecta', // ALTA
  'report.category.audio': 'Audio / pronunciación incorrecta', // ALTA
  'report.category.visual': 'Problema visual', // ALTA
  'report.category.comportamento_inesperado': 'Algo no funciona como debería', // ALTA
  'report.category.sugestao_melhoria': 'Sugerencia de mejora', // ALTA
  'report.category.outro': 'Otro', // ALTA

  'report.severity.impede': 'No me deja continuar', // MÉDIA -- alternativa: "Impide continuar" (mais literal, menos natural)
  'report.severity.dificulta': 'Dificulta la actividad', // ALTA
  'report.severity.pequeno': 'Problema menor', // ALTA
  'report.severity.sugestao': 'Solo una sugerencia', // ALTA

  'report.error.rateLimitLogged': 'Ya enviaste varios reportes recientemente. Espera unos minutos antes de enviar otro.', // ALTA
  'report.error.rateLimitGuest': 'Ya enviaste varios reportes recientemente. Espera unos minutos o crea una cuenta.', // ALTA
  'report.error.attachNotImage': 'El archivo adjunto debe ser una imagen.', // ALTA
  'report.error.attachTooLarge': 'Imagen demasiado grande (máx. 8MB).', // ALTA
  'report.error.attachUploadFailed': 'No se pudo subir la imagen.', // ALTA
  'report.error.chooseCategory': 'Elige una categoría.', // ALTA -- España: "Escoge"/"Elige" (ambos ok)
  'report.error.describe': 'Describe lo que pasó.', // ALTA
  'report.error.duplicate': 'Ya enviaste esto hace un momento -- ¡gracias!', // ALTA
  'report.error.sendFailed': 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.', // ALTA
  'report.toast.success': '✓ Reporte enviado. ¡Gracias por ayudar!', // ALTA
};
