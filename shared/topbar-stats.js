// ---------- Pills de estatística do topbar (🔥 streak / ⭐ XP) ----------
// Idêntico nos dois idiomas: os dois têm STATE.streak/STATE.xp e os mesmos
// ids #streak-count/#xp-count no topbar. Chamado depois de qualquer ação
// que mude streak/XP (responder exercício, revisão, wizard, etc.).
function renderTopbarStats(){
  document.getElementById('streak-count').textContent = STATE.streak;
  document.getElementById('xp-count').textContent = STATE.xp;
}
