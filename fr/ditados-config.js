// Ditados do FRANCÊS: dados + regras do idioma para o motor comum (shared/ditados.js).
// Etapa 5b da paridade (docs/historico/28-paridade-ditados.md). Carregado depois de dictations.js e shared/ditados.js,
// antes do app.js. Tudo aqui é lido só na hora do uso (as funções citadas, como latinaFr e speakFrench, estão no app.js).
// Molde para o site de português: um pt/ditados-config.js com os ditados do português (pt/dictations.js), a família
// latina do português (FamiliaLatina.criar(LANG_HOOKS.familiaLatina) do pt), a voz e o teclado dele; sem copiar o motor.
registerDictations({
  lang: 'fr',
  dictations: () => DICTATIONS,
  // Tarefa no idioma do site (fr/challenges.en.js preenche DICTATIONS_I18N.en).
  taskTranslations: () => window.DICTATIONS_I18N,
  // Correção: família latina com a configuração do francês (fr/lang-hooks.js, LANG_HOOKS.familiaLatina): pontuação
  // falada, números por extenso, homófonos, concordância, ligaduras (œ), elisão e as explicações.
  familia: () => latinaFr(),
  // Fase 9: com o site em inglês, usa a versão com as instruções em inglês
  // (gerada pela Action "Áudio TTS" > ditados-en) -- só depois que os mp3 existirem
  // (DICTATION_AUDIO_EN_READY em dictations.js). Até lá, toca o de sempre.
  audioPath(d){
    const en = typeof getUiLang === 'function' && getUiLang() === 'en' && DICTATION_AUDIO_EN_READY;
    return `audio/dictation-${d.id}-guided${en ? '.en' : ''}.mp3`;
  },
  // mp3 por frase gerado pelo workflow "ditados-frases" (fr/scripts/dictation_sentences.py).
  sentenceAudioPath: (d, n) => `audio/dictation-${d.id}-s${n}.mp3`,
  // Abreviações que não fecham frase: MESMA lista de fr/scripts/dictation_sentences.py (o N do mp3 da frase depende dela).
  sentenceAbbreviations: ['M.', 'Mme.', 'Mmes.', 'Mlle.', 'Mlles.', 'Dr.', 'Pr.', 'St.', 'Ste.', 'etc.', 'p.', 'n°.'],
  // Frase sem mp3 (ou com 404): voz do navegador / manifest.
  canSpeak: (text) => canSpeakFrench(text),
  speak: (text, btn) => speakFrench(text, btn),
  // Teclado de letras do francês (é è ê ë à â ç ...).
  accentPickerHTML: () => frAccentPickerHTML(),
  wireAccentPicker: (content, input) => wireFrAccentPicker(content.querySelector('.fr-accent-picker'), input),
  // No fr os Ditados vivem dentro da aba Desafios: trava Premium, selo, barra de progresso, janela e o "voltar" são os
  // dos Desafios (fr/app.js).
  paywallEnabled: () => CHALLENGE_PAYWALL_ENABLED,
  premiumUnlocked: () => challengesPremiumUnlocked(),
  tierBadgeHTML: (tier) => tierBadgeHTML(tier),
  progressHTML: (done, total) => challengeProgressHTML(done, total),
  openPremium: () => openPremiumChallengesModal(),
  backToChallenges(filter){
    pendingChallengesModuleFilter = filter;
    switchTab('challenges');
  },
  clearChallengesFilter(){ pendingChallengesModuleFilter = null; },
  // Os textos fixos da seção já são traduzidos pelo applyChallengeI18n dos Desafios (que procura em DICTATION_I18N).
  staticI18n: false,
});
