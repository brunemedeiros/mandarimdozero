// E4 lote 1a: áudio e fala (som de acerto/erro, aquecimento do TTS, botões de áudio).
// Extraído de fr/app.js e zh/app.js, onde o texto era IDÊNTICO nos dois (levantamento: docs/i18n/e4-levantamento-funcoes.md).
// Sem renomear: continuam funções globais (os <script> clássicos compartilham o escopo, então STATE, UNITS etc. do app.js
// são achados na hora da chamada). Editar AQUI vale para os dois idiomas; se um idioma precisar de comportamento próprio,
// declare a função no app.js dele com o mesmo nome e um comentário explicando (a declaração do app.js, carregada depois, vence).
// Carregado antes do app.js em fr/index.html e zh/index.html.

// Nem toda voz do mesmo idioma soa igual: o SO costuma expor tanto vozes
// "neurais"/online (Google, Microsoft Natural/Online) quanto vozes locais
// robóticas mais antigas, e a ordem que o navegador retorna é arbitrária.
// Pontua pelo nome pra preferir a melhor voz disponível, não só a primeira.
function voiceQualityScore(v){
  const name = (v.name || '').toLowerCase();
  if (/natural|neural/.test(name)) return 3;
  if (/online/.test(name)) return 2;
  if (/google/.test(name)) return 1;
  return 0;
}

// "Aquece" o synthesis engine com uma fala silenciosa disparada pela primeira
// interação real do usuário na página. Em alguns navegadores Chromium, a
// primeira chamada de speak() após o carregamento simplesmente não soa se não
// tiver sido precedida de uma interação — isso resolve preventivamente.
function warmUpTTSOnce(){
  if (TTS.warmedUp || !TTS.supported) return;
  TTS.warmedUp = true;
  try{
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    window.speechSynthesis.speak(warm);
  }catch(e){ /* silencioso: warm-up é best-effort */ }
  document.removeEventListener('click', warmUpTTSOnce);
  document.removeEventListener('touchstart', warmUpTTSOnce);
}

// Contagem vitalícia de reproduções de áudio (clique manual ou atalho "r")
// -- só pro badge "Ouvido Treinado" (artefato §8). Tocar áudio nunca passa
// perto de nenhum addXP() sozinho, então dispara a checagem de badge aqui
// mesmo em vez de confiar no próximo XP ganho (que pode demorar).
function registerAudioPlay(){
  STATE.totalAudioPlays = (STATE.totalAudioPlays || 0) + 1;
  ensureDailyBucket();
  STATE.daily.audioPlaysToday += 1;
  checkAndCelebrateBadges();
}

function isFeedbackSoundEnabled(){
  return localStorageSafeGet(FEEDBACK_SOUND_KEY) !== '0';
}

function getFeedbackAudioCtx(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!feedbackAudioCtx) feedbackAudioCtx = new Ctx();
  if (feedbackAudioCtx.state === 'suspended') feedbackAudioCtx.resume();
  return feedbackAudioCtx;
}

// isCorrect === true: "ding" ascendente curto (2 notas). false: um tom só,
// mais grave e mais curto -- neutro, não punitivo (a explicação do erro já
// fica a cargo do painel de texto, o som só confirma o resultado).
function playFeedbackSound(isCorrect){
  if (!isFeedbackSoundEnabled()) return;
  const ctx = getFeedbackAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (isCorrect){
    playFeedbackTone(ctx, 587.33, now, 0.09, 0.16);
    playFeedbackTone(ctx, 880.00, now + 0.08, 0.16, 0.16);
  } else {
    playFeedbackTone(ctx, 233.08, now, 0.18, 0.13);
  }
}

function wireCustomAudioButtons(container){
  container.querySelectorAll('.custom-audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      new Audio(btn.dataset.audioUrl).play().catch(() => showToast(t('toast.audioPlayFailedDot')));
    });
  });
}

function updateFeedbackSoundSwitch(){
  const btn = document.getElementById('feedback-sound-switch');
  if (btn) btn.checked = isFeedbackSoundEnabled();
}
