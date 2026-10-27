// Paridade 5d, parte 7 (docs/historico/30-paridade-quase-iguais.md): voz do idioma estudado (mp3 pré-gerado ou Web Speech API
// do navegador), comum a todos os sites. Era o mesmo código no fr (speakFrench...) e no zh (speakChinese...), trocando só o
// idioma; os nomes antigos continuam no app.js de cada site, como repasses de uma linha. O que muda por idioma vem de
// LANG_HOOKS: ttsLang ('fr-FR', 'zh-CN'), ttsRate (0,9 no fr, 0,85 no zh), ttsText (texto que vai para a voz: o fr lê a forma
// neutra de gênero "brésilien·ne" como as duas formas), voiceMissingKey e audioRetryFailedKey (avisos de cada site).
//
// Cautelas de navegador (Chromium/Opera): getVoices() pode demorar, onvoiceschanged pode não disparar, a primeira fala pode
// "engasgar" sem aquecimento e o speechSynthesis pode "adormecer" depois de muitos segundos sem uso.
const TTS = {
  supported: 'speechSynthesis' in window,
  voice: null,
  voicesLoaded: false,
  warmedUp: false,
  pollAttempts: 0,
  speakToken: 0,   // M2: muda a cada stopExerciseAudio(); a nova tentativa só roda se ainda for a mesma fala
  retryTimers: []  // M2: timers da nova tentativa (cancelStudyVoiceRetry)
};

// Escolhe a voz: primeiro a do idioma exato (ex.: fr-FR), depois qualquer uma do idioma (fr-*); em cada grupo, a de melhor
// qualidade.
function loadStudyVoice(){
  if (!TTS.supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return false;
  const lang = LANG_HOOKS.ttsLang, prefix = lang.split('-')[0].toLowerCase();
  const exact = voices.filter(v => v.lang === lang).sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  const anyLang = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix)).sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  TTS.voice = exact[0] || anyLang[0] || null;
  TTS.voicesLoaded = true;
  return !!TTS.voice;
}

// Chamado no começo do app.js de cada site (mesmo ponto de antes): carrega a voz, escuta onvoiceschanged, faz o polling e
// aquece o motor no primeiro toque.
function initStudyVoice(){
  if (TTS.supported){
    loadStudyVoice();
    window.speechSynthesis.onvoiceschanged = loadStudyVoice;
    pollForVoices();
  }
  document.addEventListener('click', warmUpTTSOnce, { once:true });
  document.addEventListener('touchstart', warmUpTTSOnce, { once:true });
}

// Verdadeiro se dá para tocar esse texto: por mp3 pré-gerado ou pela voz do navegador. Usado nos autoplay.
function canSpeakStudy(text){
  return (typeof AUDIO_MANIFEST !== 'undefined' && !!AUDIO_MANIFEST[text]) || !!TTS.voice;
}

// Reprodução PURA (mp3 pré-gerado ou Web Speech API), sem registerAudioPlay (Fase 7d): o Preview do editor
// (playAudioPreview) chama só isto; speakStudy() registra e delega para cá.
function speakStudyAudioOnly(text, btnEl, isAutoplay){
  const pregenFile = typeof AUDIO_MANIFEST !== 'undefined' && AUDIO_MANIFEST[text];
  if (pregenFile){
    playPregeneratedAudio(pregenFile, btnEl, isAutoplay, LANG_HOOKS.pregenRate());
    return;
  }

  if (!TTS.supported){
    showToast(t('toast.audioUnsupported'));
    return;
  }

  // Tenta recarregar a voz na hora (clique logo depois de abrir a página).
  if (!TTS.voice){
    loadStudyVoice();
  }
  if (!TTS.voice){
    showToast(t(LANG_HOOKS.voiceMissingKey));
    return;
  }

  // Chromium às vezes deixa o motor "pausado": resume() antes de falar.
  stopExerciseAudio();
  window.speechSynthesis.resume();

  const buildUtterance = () => {
    const u = new SpeechSynthesisUtterance(LANG_HOOKS.ttsText(text));
    u.lang = LANG_HOOKS.ttsLang;
    u.voice = TTS.voice;
    u.rate = LANG_HOOKS.ttsRate;
    u.pitch = 1;
    u.volume = 1;
    return u;
  };

  const utter = buildUtterance();
  if (btnEl){ btnEl.classList.add('speaking'); LAST_AUDIO_BTN = btnEl; }

  let didStart = false;
  utter.onstart = () => { didStart = true; };
  utter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
  utter.onerror = () => {
    if (btnEl) btnEl.classList.remove('speaking');
    showToast(t('toast.audioPlayFailed'));
  };

  window.speechSynthesis.speak(utter);

  // Se em 800ms o onstart não disparou, o motor engasgou: tenta de novo com um utterance novo antes de desistir.
  // M2 da revisão do código compartilhado (2026-10-26): os dois timers ficam em TTS.retryTimers e são cancelados por
  // cancelStudyVoiceRetry(), que stopExerciseAudio() chama (tocar outro áudio, trocar de cartão, de aba ou sair da
  // lição/Revisão). Sem isso, a nova tentativa cortava o áudio do cartão seguinte e falava a palavra anterior. Também
  // não tenta de novo se o botão que pediu a fala já saiu da tela (btnEl.isConnected).
  let token = TTS.speakToken;
  const later = (fn) => { const h = setTimeout(() => { TTS.retryTimers = TTS.retryTimers.filter(x => x !== h); if (token === TTS.speakToken) fn(); }, 800); TTS.retryTimers.push(h); };
  later(() => {
    if (didStart) return;
    if (btnEl && !btnEl.isConnected) return;
    stopExerciseAudio(); // cancela a fala engasgada (e troca o token)
    window.speechSynthesis.resume();
    token = TTS.speakToken; // a 2ª tentativa vale até o próximo stopExerciseAudio()
    const retryUtter = buildUtterance();
    let retryStarted = false;
    retryUtter.onstart = () => { retryStarted = true; };
    retryUtter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
    retryUtter.onerror = () => { if (btnEl) btnEl.classList.remove('speaking'); };
    window.speechSynthesis.speak(retryUtter);
    later(() => {
      if (!retryStarted){
        if (btnEl) btnEl.classList.remove('speaking');
        showToast(t(LANG_HOOKS.audioRetryFailedKey));
      }
    });
  });
}

// Cancela a nova tentativa pendente da voz do navegador (M2). Chamado por stopExerciseAudio(); seguro sem nada pendente.
function cancelStudyVoiceRetry(){
  TTS.speakToken = (TTS.speakToken || 0) + 1;
  (TTS.retryTimers || []).forEach(h => clearTimeout(h));
  TTS.retryTimers = [];
}

function speakStudy(text, btnEl, isAutoplay){
  registerAudioPlay();
  speakStudyAudioOnly(text, btnEl, isAutoplay);
}

// O speechSynthesis pode "adormecer" depois de muitos segundos sem uso: um resume() periódico evita que o próximo clique
// saia mudo. Chamado no app.js de cada site, no mesmo ponto de antes.
function keepStudyVoiceAwake(){
  if (TTS.supported){
    setInterval(() => {
      if (!window.speechSynthesis.speaking){
        window.speechSynthesis.resume();
      }
    }, 10000);
  }
}
