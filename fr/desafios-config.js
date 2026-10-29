// Desafios do FRANCÊS: regras do idioma para o motor comum (shared/desafios.js, desafios-telas.js, desafios-admin.js).
// Etapa 5c da paridade (docs/historico/29-paridade-desafios.md). Carregado depois dos 3 arquivos do motor e antes do
// app.js. Tudo aqui é lido só na hora do uso (as funções citadas, como latinaFr, estão no app.js).
// Os desafios em si estão na tabela challenges do Supabase (lotes em fr/scripts/challenges_import/); a tradução do
// conteúdo para o inglês, em fr/challenges.en.js (window.CHALLENGES_I18N, pela camada do curso).
// Molde para o site de português: um pt/desafios-config.js com a família latina do português, os textos que citam o
// português e o teclado dele; sem copiar o motor.
registerChallenges({
  lang: 'fr',
  // Acentuação: família latina com a configuração do francês (fr/lang-hooks.js, LANG_HOOKS.familiaLatina): acento
  // exigido, "oe" por "œ" = quase (decisão da dona, 2026-10-15).
  familia: () => latinaFr(),
  // Teclado de letras do francês (é è ê ë à â ç ...) na Acentuação.
  accentPickerHTML: (expected) => frAccentPickerHTML(expected),
  wireAccentPicker: (content, input) => wireFrAccentPicker(content.querySelector('.fr-accent-picker'), input),
  // Textos de interface que citam o francês (o resto dos textos dos Desafios é comum, em CHALLENGE_I18N).
  texts: {
    'pt-BR': {
      'ch.knowMore': 'En savoir plus',
      'ch.goFurther': 'Pour aller plus loin',
      'ch.sub': 'Pratique francês de verdade: expressões, compreensão auditiva e ortografia.',
    },
    'en': {
      'ch.knowMore': "En savoir plus",
      'ch.goFurther': "Pour aller plus loin",
      'ch.sub': "Practice real French: expressions, listening comprehension and spelling.",
    },
  },
});
