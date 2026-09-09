// ---------- Pills de estatística do topbar (🔥 streak / ⭐ XP) ----------
// Idêntico nos dois idiomas: os dois têm STATE.streak/STATE.xp e os mesmos
// ids #streak-count/#xp-count no topbar. Chamado depois de qualquer ação
// que mude streak/XP (responder exercício, revisão, wizard, etc.).

// Sobe do valor JÁ NA TELA até o novo (não de 0, como animateCount de
// fr/app.js e zh/app.js -- aquele é pra "revelar" um valor final numa tela
// que abriu agora, este é pra um número que já estava visível mudar aos
// olhos do aluno) + um "pop" rápido no número, disparado a cada resposta
// certa -- é o elemento mais visto do app, valia a pena não ser só um
// textContent mudando sem aviso.
function animateStatPill(el, newVal){
  if (!el) return;
  const oldVal = parseInt(el.textContent, 10) || 0;
  if (oldVal === newVal){
    el.textContent = newVal;
    return;
  }
  if (prefersReducedMotion()){
    el.textContent = newVal;
    return;
  }
  el.classList.remove('pop');
  void el.offsetWidth; // força reflow pra reiniciar o "pop" mesmo se ele já rodou há pouco
  el.classList.add('pop');
  const duration = 500;
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(oldVal + (newVal - oldVal) * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = newVal;
  }
  requestAnimationFrame(tick);
}

function renderTopbarStats(){
  animateStatPill(document.getElementById('streak-count'), STATE.streak);
  animateStatPill(document.getElementById('xp-count'), STATE.xp);
  // Card "Status" da sidebar desktop (Fase 3) só existe a partir de 900px,
  // mas o elemento sempre está no DOM (escondido por CSS abaixo disso) --
  // atualiza junto, sem precisar de um segundo hook em outro lugar.
  animateStatPill(document.getElementById('side-xp-count'), STATE.xp);
  animateStatPill(document.getElementById('side-streak-count'), STATE.streak);
}
