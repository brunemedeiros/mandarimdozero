// ---------- Pills de estatística do topbar (🔥 streak / ⭐ XP) ----------
// Idêntico nos dois idiomas: os dois têm STATE.streak/STATE.xp e os mesmos
// ids #streak-count/#xp-count no topbar. Chamado depois de qualquer ação
// que mude streak/XP (responder exercício, revisão, wizard, etc.).
function renderTopbarStats(){
  document.getElementById('streak-count').textContent = STATE.streak;
  document.getElementById('xp-count').textContent = STATE.xp;
  // Card "Status" da sidebar desktop (Fase 3) só existe a partir de 900px,
  // mas o elemento sempre está no DOM (escondido por CSS abaixo disso) --
  // atualiza junto, sem precisar de um segundo hook em outro lugar.
  document.getElementById('side-xp-count').textContent = STATE.xp;
  document.getElementById('side-streak-count').textContent = STATE.streak;
}
