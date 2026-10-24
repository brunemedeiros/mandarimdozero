// E4 lote paridade 5d-2: diálogo da lição e "Você entendeu?" (paridade 5d, parte 2).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

// Estado do diálogo que está na tela (sequência de áudio, "Você entendeu?") e a preferência de tocar sozinho. Era igual nos dois app.js.
const DLG = { run: 0, check: null };
const DLG_AUTOPLAY_KEY = 'dlg_autoplay';

// Lado do balão: à esquerda quem abre o diálogo, à direita o outro (aceita falante com qualquer nome, ex.: "Garçom").
// Motor geral (veio do zh). O zh usa (LANG_HOOKS.dlgSide); o fr continua pondo à direita só quem se chama "B" até a dona decidir.
function dlgSpeakerSide(dlg, spk){
  const first = dlg.lines[0].spk;
  return spk === first ? 'a' : 'b';
}

function renderDialogueStep(u, contentEl, nextBtn){
  const dlg = u.dialogue;
  const token = ++DLG.run;
  const sp = dlg.speakers || {};
  const who = k => sp[k] || { n: k, e: '' };
  const terms = dlgVocabTerms(u);
  const checks = Array.isArray(dlg.check) ? dlg.check : [];
  DLG.check = { qi: 0, correct: 0 };

  const rowsHTML = dlg.lines.map((l, i) => {
    const side = LANG_HOOKS.dlgSide(dlg, l.spk);
    const w = who(l.spk);
    return `
      <div class="dlg-row ${side}" data-i="${i}" role="button" tabindex="0" aria-label="${escapeHTML(t('dlg.playFromAria', { name: w.n }))}">
        <div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span></div>
        <div class="dlg-bubble">
          ${LANG_HOOKS.dlgLineHTML(l, terms)}
          <div class="dlg-tr">${escapeHTML(l.t)}</div>
          <button type="button" class="dlg-trbtn" aria-label="${escapeHTML(t('dlg.lineTrAria'))}" aria-pressed="false">🌐</button>
        </div>
      </div>`;
  }).join('');

  contentEl.innerHTML = `
    <div class="section-label">${t('dlg.label')}</div>
    <div class="dlg-title">${escapeHTML(dlg.title)}</div>
    ${dlg.scene ? `<div class="dlg-scene">📍 ${escapeHTML(dlg.scene)}</div>` : ''}
    <div class="dlg-tools">
      <button class="btn btn-secondary dlg-play-btn" id="dlg-play-btn">${t('dlg.playAll')}</button>
      <button class="dlg-chip" id="dlg-auto-btn" aria-pressed="${dlgAutoplayOn()}">${dlgAutoplayOn() ? t('dlg.autoOn') : t('dlg.autoOff')}</button>
    </div>
    <div class="dlg-chat" id="ud-dialogue">${rowsHTML}</div>
    <div class="dlg-float"><button class="dlg-chip dlg-chip-float" id="dlg-trans-btn" aria-pressed="false">${t('dlg.showTr')}</button></div>
    ${terms.length ? `<div class="dlg-legend">${t('dlg.legend')}</div>` : ''}
  `;

  const chat = document.getElementById('ud-dialogue');
  const playBtn = document.getElementById('dlg-play-btn');
  const transBtn = document.getElementById('dlg-trans-btn');
  const autoBtn = document.getElementById('dlg-auto-btn');
  const rows = [...chat.querySelectorAll('.dlg-row')];

  function setPlaying(on){
    chat.classList.toggle('playing', on);
    playBtn.textContent = on ? t('dlg.stop') : t('dlg.playAll');
    if (!on) rows.forEach(r => r.classList.remove('speaking'));
  }
  function setTranslations(on){
    chat.classList.toggle('show-trans', on);
    transBtn.setAttribute('aria-pressed', String(on));
    transBtn.textContent = on ? t('dlg.hideTr') : t('dlg.showTr');
    // o botão geral manda em todas as falas; os 🌐 individuais acompanham
    rows.forEach(r => { r.classList.remove('show-tr'); r.querySelector('.dlg-trbtn')?.setAttribute('aria-pressed', 'false'); });
  }
  function stillHere(){ return token === DLG.run && document.body.contains(chat); }

  async function playFrom(start, viaAutoplay){
    const myRun = ++DLG.run;
    const alive = () => myRun === DLG.run && document.body.contains(chat);
    setPlaying(true);
    for (let i = start; i < dlg.lines.length; i++){
      if (!alive()) return;
      rows.forEach(r => r.classList.toggle('speaking', Number(r.dataset.i) === i));
      rows[i].scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      const res = await dlgPlayLine(LANG_HOOKS.dlgLineText(dlg.lines[i]));
      if (!alive()) return;
      if (res === 'blocked'){
        setPlaying(false);
        if (viaAutoplay) showToast(t('dlg.tapToPlayToast'));
        return;
      }
      if (!res){ setPlaying(false); return; }
      if (i < dlg.lines.length - 1) await dlgSleep(380);
    }
    if (!alive()) return;
    setPlaying(false);
    setTranslations(true); // ao fim da conversa completa, as traduções aparecem
  }

  playBtn.addEventListener('click', () => {
    if (chat.classList.contains('playing')){ DLG.run++; stopExerciseAudio(); setPlaying(false); }
    else playFrom(0, false);
  });
  transBtn.addEventListener('click', () => setTranslations(!chat.classList.contains('show-trans')));
  autoBtn.addEventListener('click', () => {
    const on = !dlgAutoplayOn();
    dlgSetAutoplay(on);
    autoBtn.setAttribute('aria-pressed', String(on));
    autoBtn.textContent = on ? t('dlg.autoOn') : t('dlg.autoOff');
  });
  rows.forEach(r => {
    const tb = r.querySelector('.dlg-trbtn');
    if (tb) tb.addEventListener('click', e => {
      e.stopPropagation();   // não toca o áudio: só mostra/esconde a tradução desta fala
      const on = !r.classList.contains('show-tr');
      r.classList.toggle('show-tr', on);
      tb.setAttribute('aria-pressed', String(on));
    });
    const go = () => playFrom(Number(r.dataset.i), false);
    r.addEventListener('click', go);
    r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); } });
  });
  chat.querySelectorAll('.dlg-new').forEach(w => w.addEventListener('click', e => {
    e.stopPropagation();
    if (w.dataset.tr) showToast(LANG_HOOKS.dlgWordToast(w.dataset));
  }));

  // A micro-checagem é um passo à parte (dialogueCheck), depois deste:
  // na mesma tela daria para rolar e copiar a resposta do próprio diálogo.
  nextBtn.textContent = t('common.continueArrow');
  nextBtn.style.display = 'flex';

  const canHear = dlg.lines.some(l => LANG_HOOKS.canSpeak(LANG_HOOKS.dlgLineText(l)));
  if (!canHear) playBtn.disabled = true;
  else if (dlgAutoplayOn()) setTimeout(() => { if (stillHere()) playFrom(0, true); }, 350);
}

// Passo "Você entendeu?" -- só as perguntas, SEM o diálogo na tela (quem quiser
// conferir precisa lembrar). Não dá para pular: o Continuar só aparece no fim.
function renderDialogueCheckStep(u, contentEl, nextBtn){
  const dlg = u.dialogue;
  DLG.run++; stopExerciseAudio();
  const sp = dlg.speakers || {};
  const who = k => sp[k] || { n: k, e: '' };
  const checks = Array.isArray(dlg.check) ? dlg.check : [];
  DLG.check = { qi: 0, correct: 0 };
  contentEl.innerHTML = `
    <div class="section-label">${t('dlg.label')}</div>
    <div class="dlg-title">${escapeHTML(dlg.title)}</div>
    <div class="dlg-scene">${t('dlg.checkScene')}</div>
    <div class="dlg-check" id="dlg-check"></div>
  `;
  nextBtn.style.display = 'none';
  renderDialogueCheck(u, dlg, who, checks, nextBtn, []);
}

// Micro-checagem "Você entendeu?" -- 3 perguntas, uma de cada vez. Não dá
// para pular (o Continuar só aparece no fim); errar não reprova, mostra a
// resposta certa e acende a fala correspondente no diálogo.
function renderDialogueCheck(u, dlg, who, checks, nextBtn, rows){
  const box = document.getElementById('dlg-check');
  const st = DLG.check;
  const L = dlg.lines;
  const bubble = (idx, blank) => {
    const l = L[idx];
    const side = LANG_HOOKS.dlgSide(dlg, l.spk);
    const w = who(l.spk);
    return `<div class="dlg-row ${side} static"><div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span></div>
      <div class="dlg-bubble">${LANG_HOOKS.dlgBubbleHTML(l, blank)}</div></div>`;
  };

  function showQuestion(){
    const q = checks[st.qi];
    let label = '', ctx = '', opts = [], flashIdx = -1;
    if (q.k === 'fill'){
      label = t('dlgCheck.fill');
      ctx = `<div class="dlg-q-ctx">${bubble(q.line - 1, false)}${bubble(q.line, true)}</div>`;
      opts = dlgShuffle([{ o: L[q.line], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);
      flashIdx = q.line;
    } else if (q.k === 'listen'){
      label = t('dlgCheck.listen');
      ctx = `<div class="dlg-q-listen"><button class="audio-btn audio-btn-lg" id="dlg-q-audio" aria-label="${escapeHTML(t('dlgCheck.listenAria'))}">🔊</button><div class="prompt-audio-hint">${t('dlgCheck.tapAgain')}</div></div>`;
      opts = dlgShuffle([{ o: L[q.line + 1], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);
      flashIdx = q.line + 1;
    } else {
      label = t('dlgCheck.comprehension');
      ctx = `<div class="dlg-q-text">${escapeHTML(q.q)}</div>`;
      opts = q.opts.map((t, i) => ({ t, ok: i === q.ok }));
      flashIdx = -1;
    }
    const optHTML = o => ('o' in o) ? LANG_HOOKS.dlgOptionHTML(o.o) : escapeHTML(o.t);
    const dots = checks.map((_, i) => `<span class="dlg-dot${i < st.qi ? ' done' : (i === st.qi ? ' on' : '')}"></span>`).join('');
    box.innerHTML = `
      <div class="dlg-check-head"><span>${t('lesson.step.dialogueCheck')}</span><span class="dlg-dots" role="img" aria-label="${escapeHTML(t('dlgCheck.progressAria', { n: st.qi + 1, total: checks.length }))}">${dots}</span></div>
      <div class="exercise-prompt-label">${label}</div>
      ${ctx}
      <div class="dlg-opts">${opts.map((o, i) => `<button class="dlg-opt" data-i="${i}">${optHTML(o)}</button>`).join('')}</div>
      <div class="dlg-fb-slot"></div>`;
    if (q.k === 'listen'){
      const a = document.getElementById('dlg-q-audio');
      const line = LANG_HOOKS.dlgLineText(L[q.line]);
      a.addEventListener('click', () => LANG_HOOKS.speak(line, a));
      if (LANG_HOOKS.canSpeak(line)) LANG_HOOKS.speak(line, a, true);
    }
    box.querySelectorAll('.dlg-opt').forEach(btn => btn.addEventListener('click', () => {
      const o = opts[Number(btn.dataset.i)];
      box.querySelectorAll('.dlg-opt').forEach((b, i) => {
        b.disabled = true;
        b.classList.add('locked');
        if (opts[i].ok) b.classList.add('correct');
      });
      if (!o.ok) btn.classList.add('incorrect');
      playFeedbackSound(o.ok);
      if (o.ok) st.correct += 1;
      if (flashIdx >= 0 && rows[flashIdx]){
        rows[flashIdx].classList.add('flash');
        setTimeout(() => rows[flashIdx] && rows[flashIdx].classList.remove('flash'), 2400);
      }
      const right = optHTML(opts.find(x => x.ok));
      const last = st.qi === checks.length - 1;
      box.querySelector('.dlg-fb-slot').innerHTML = `
        <div class="dlg-fb ${o.ok ? 'ok' : 'no'}">
          <div class="dlg-fb-title">${o.ok ? t('dlgCheck.right') : t('dlgCheck.almost')}</div>
          ${o.ok ? '' : `<div class="dlg-fb-right">${right}</div>`}
          <button class="btn btn-primary btn-block" id="dlg-q-next">${last ? t('dlgCheck.finish') : t('dlgCheck.next')}</button>
        </div>`;
      document.getElementById('dlg-q-next').addEventListener('click', () => {
        if (last) finish(); else { st.qi += 1; showQuestion(); }
      });
      document.getElementById('dlg-q-next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
  }

  function finish(){
    stopExerciseAudio();
    box.innerHTML = `
      <div class="dlg-check-head"><span>${t('lesson.step.dialogueCheck')}</span></div>
      <div class="dlg-sum">${t('dlgCheck.summary', { n: st.correct, total: checks.length })} ${st.correct === checks.length ? t('dlgCheck.allRight') : t('dlgCheck.tryAgain')}</div>
      <button class="dlg-chip" id="dlg-redo">${t('dlgCheck.redo')}</button>`;
    document.getElementById('dlg-redo').addEventListener('click', () => { st.qi = 0; st.correct = 0; showQuestion(); nextBtn.style.display = 'none'; });
    nextBtn.textContent = t('common.continueArrow');
    nextBtn.style.display = 'flex';
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showQuestion();
}
