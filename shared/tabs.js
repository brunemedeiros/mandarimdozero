// ---------- Navegação por abas (.tab-btn / .view) ----------
// O "corpo" da troca de aba (ativar botão, trocar view, o bloco de Revisão
// -- que é idêntico nos dois idiomas: mesmos ids review-mode-select-wrap/
// review-session-wrap/review-content/speed-review-content, mesmo
// STATE.reviewSessionUnitFilter) é comum aos dois idiomas. O que muda é
// só (a) quais efeitos colaterais parar ao sair de uma aba -- francês tem
// Match/Ditados que o chinês não tem -- e (b) quais abas extras existem e
// o que renderizar nelas (汉字 no chinês; Conjugação/Ditados/Desafios no
// francês). Cada app.js chama createTabSwitcher() uma vez, passando só
// essas duas partes que variam.
function createTabSwitcher({ onBeforeSwitch, tabHandlers }){
  return function switchTab(tab){
    if (onBeforeSwitch) onBeforeSwitch(tab);
    trackEvent('tab_switch', tab);

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${tab}`).classList.add('active');
    // .right-cards (Ranking/Status/Missões do dia) é um bloco fixo fora das
    // .view, nunca re-renderizado por aba -- por isso alguns dos cards só
    // fazem sentido em certas abas (ex: "Missões do dia" na aba
    // Configurações, que não tem nada a ver com desafios). Marca a aba
    // ativa no próprio #app pra CSS decidir o que esconder, sem duplicar
    // o bloco por aba.
    document.getElementById('app').dataset.activeTab = tab;

    if (tab === 'review'){
      if (STATE.reviewSessionUnitFilter){
        // Veio de "Estudar esta unidade" na trilha — pula a tela de escolha,
        // vai direto pra sessão de flashcard filtrada por unidade.
        document.getElementById('review-mode-select-wrap').style.display = 'none';
        document.getElementById('review-session-wrap').style.display = 'block';
        document.getElementById('review-content').style.display = 'block';
        document.getElementById('speed-review-content').style.display = 'none';
        startReviewSession();
      } else {
        document.getElementById('review-mode-select-wrap').style.display = 'block';
        document.getElementById('review-session-wrap').style.display = 'none';
        renderReviewModeSelect();
      }
    }

    if (tabHandlers && tabHandlers[tab]) tabHandlers[tab]();

    // Marca esta troca de aba como uma tela de navegação real (ver
    // shared/router.js) -- ponto único: todo clique de aba (sidebar, barra
    // inferior, menu "Mais", notificação, teste de nível) já passa por
    // switchTab(), então não precisa repetir isto em cada chamador.
    if (typeof routerNavigate === 'function'){
      routerNavigate(tab === 'review' && STATE.reviewSessionUnitFilter
        ? { type: 'tab', tab: 'review', unitFilter: STATE.reviewSessionUnitFilter }
        : { type: 'tab', tab });
    }
  };
}
