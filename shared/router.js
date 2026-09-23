// ---------- Navegação: rotas virtuals via History API (Voltar/Avançar) ----------
// Problema original: nenhuma troca de tela dentro do app (Home/Estudo/
// Unidade/Lição/Resultado/Revisão/Perfil...) nunca entrava no histórico do
// navegador -- tudo era só classList/variáveis internas (ver auditoria).
// Voltar/Avançar então pulava o app inteiro de uma vez, em vez de desfazer
// uma tela.
//
// Rotas usam # (hash), nunca caminho de servidor -- funciona no GitHub
// Pages sem nenhuma peça de infraestrutura nova (404.html, rewrite etc.):
// o servidor sempre recebe só "fr/" ou "zh/", porque tudo depois do #
// nunca sai do navegador. F5/entrada direta/link salvo funcionam de graça.
//
// Fluxo (evita loop entre navegação e popstate):
//   clique real  -> switchTab()/openUnitDetail()/... -> routerNavigate(route) -> pushState
//   Voltar/Avançar -> popstate -> renderRoute(route)  [NUNCA chama routerNavigate de novo]
//
// Cada função de tela (switchTab, openUnitDetail, exitToPath,
// openReviewSession, backToReviewModeSelect, renderLessonCompleteScreen,
// renderDailyChallengesScreen) ganhou UMA linha no fim chamando
// routerNavigate(...) -- nenhuma lógica de progresso/XP/conclusão foi
// tocada, só a marcação de "isto é uma tela nova". Questão a questão dentro
// de uma lição, modais, dicas etc. nunca chamam isto -- de propósito, pra
// não virarem entrada de histórico (ver ARCHITECTURE.md/CLAUDE.md, fases 1 e 3
// da tarefa de navegação).
const ROUTER = {
  current: null,
  // true só durante renderRoute() (popstate ou carregamento inicial) --
  // suprime routerNavigate() pra as mesmas funções de tela não empilharem
  // uma entrada NOVA só porque estão sendo usadas pra RESTAURAR uma rota.
  restoring: false,
};

// Normaliza /fr/index.html (ou /zh/index.html) -> /fr/ na primeira carga --
// cobre favoritos, autocomplete do navegador e atalhos salvos ANTES desta
// tarefa trocar os redirecionamentos internos (portão de idioma, seletor de
// idioma) pra já saírem sem o /index.html. Sem isto, uma aba que chegou
// aqui por um desses jeitos antigos continuaria arrastando o /index.html
// em toda rota (#/unit/3 etc.) que o router monta a partir do pathname
// atual -- o router nunca inventa caminho novo, só o hash. replaceState
// (não um redirect de verdade) -- não gera reload nem pedido novo ao
// servidor, só limpa a barra de endereço.
(function normalizeIndexHtmlFromURL(){
  if (/\/index\.html$/.test(window.location.pathname)){
    const cleanPath = window.location.pathname.replace(/index\.html$/, '');
    history.replaceState(history.state, '', cleanPath + window.location.search + window.location.hash);
  }
})();

function routeToHash(route){
  if (!route) return '';
  switch (route.type){
    case 'tab':
      if (route.tab === 'path') return '';
      if (route.tab === 'review' && route.unitFilter != null) return `#/review/unit/${route.unitFilter}`;
      return `#/${route.tab}`;
    case 'reviewSession':
      return `#/review/${route.mode}`;
    case 'unit':
      return `#/unit/${route.unitId}`;
    case 'unitResult':
      return `#/unit/${route.unitId}/result`;
    case 'unitComplete':
      return `#/unit/${route.unitId}/complete`;
    case 'publicProfile':
      return `#/user/${route.username}`;
    default:
      return '';
  }
}

// UNITS.id é number no chinês (1, 2, 3...) mas string com prefixo de nível
// no francês ('A1-1', 'A1-2'...) -- nunca força pra número: só converte
// quando o texto for puramente numérico, senão UNITS.find(x => x.id ===
// unitId) nunca bateria pro francês (1 !== '1', comparação estrita) e a
// restauração quebraria com "Cannot set properties of undefined" (unitId
// vindo NaN de parseInt('A1-1', 10)).
function parseUnitIdFromHash(str){
  return /^\d+$/.test(str) ? parseInt(str, 10) : str;
}

function hashToRoute(hash){
  const clean = (hash || '').replace(/^#/, '');
  const parts = clean.split('/').filter(Boolean);
  if (!parts.length) return { type: 'tab', tab: 'path' };
  if (parts[0] === 'review'){
    if (parts[1] === 'unit' && parts[2]) return { type: 'tab', tab: 'review', unitFilter: parseUnitIdFromHash(parts[2]) };
    if (['flashcard', 'speed', 'hard', 'match'].includes(parts[1])) return { type: 'reviewSession', mode: parts[1] };
    return { type: 'tab', tab: 'review' };
  }
  if (parts[0] === 'unit' && parts[1]){
    const unitId = parseUnitIdFromHash(parts[1]);
    if (parts[2] === 'result') return { type: 'unitResult', unitId };
    if (parts[2] === 'complete') return { type: 'unitComplete', unitId };
    return { type: 'unit', unitId };
  }
  // Fase 1 do perfil público (ver CLAUDE.md) -- #/user/<username>, único
  // formato hash-based possível pro "/user/username" pedido originalmente
  // (GitHub Pages não tem rewrite de servidor, ver comentário no topo do
  // arquivo). Username já vem só com o alfabeto aceito por slugifyUsername
  // (shared/profile.js) -- sem sanitização extra aqui, mesmo nível de
  // confiança que parseUnitIdFromHash já tem pro id de unidade.
  if (parts[0] === 'user' && parts[1]) return { type: 'publicProfile', username: parts[1] };
  return { type: 'tab', tab: parts[0] };
}

function routesEqual(a, b){
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// Chamado pelas funções de tela reais (nunca pelo restauro de rota -- ver
// ROUTER.restoring). Faz nada se a rota calculada é igual à atual (evita
// entrada duplicada quando a mesma tela é "trocada" pra ela mesma).
function routerNavigate(route){
  if (ROUTER.restoring) return;
  if (routesEqual(route, ROUTER.current)) return;
  const hash = routeToHash(route);
  const url = window.location.pathname + window.location.search + hash;
  history.pushState(route, '', url);
  ROUTER.current = route;
}

// Único ponto que de fato chama as funções de tela existentes pra
// reconstruir a UI a partir de uma rota -- nunca reexecuta lógica de
// conclusão/XP (ver comentário de finishCurrentLesson/renderLessonCompleteScreen).
function renderRoute(route){
  ROUTER.restoring = true;
  try {
    switch (route.type){
      case 'tab': {
        STATE.reviewSessionUnitFilter = (route.tab === 'review' && route.unitFilter != null) ? route.unitFilter : null;
        // Restaurar "path" enquanto ainda em modo foco (dentro de uma
        // unidade/lição) precisa do desfazer de verdade -- switchTab()
        // sozinho só troca a aba ativa, nunca soltou o modo foco (ver
        // setLessonFocusMode em openUnitDetail/exitToPath). Sem isto, Voltar
        // limpava a URL mas deixava a tela presa dentro da lição.
        if (route.tab === 'path' && document.body.classList.contains('lesson-focus') && typeof exitToPath === 'function'){
          exitToPath();
        } else if (typeof switchTab === 'function'){
          switchTab(route.tab);
        }
        break;
      }
      case 'reviewSession': {
        if (typeof switchTab === 'function') switchTab('review');
        if (typeof openReviewSession === 'function') openReviewSession(route.mode);
        break;
      }
      case 'unit': {
        if (typeof openUnitDetail === 'function') openUnitDetail(route.unitId);
        break;
      }
      case 'unitResult': {
        // Só re-renderiza a tela de "lição concluída" exata (com o chip de
        // desafio certo) se o cache ainda for desta mesma unidade.
        // STEP_STATE.lastUnitResultCache é de propósito SEPARADO de
        // STEP_STATE.onLessonBoundaryScreen -- este último openUnitDetail()
        // zera toda vez que a unidade é reaberta (inclusive quando é o
        // PRÓPRIO router reabrindo pra restaurar um "Voltar" até a Lição),
        // então não sobreviveria a um Voltar seguido de Avançar. O cache
        // usado aqui nunca é limpo por openUnitDetail -- só sobrescrito na
        // próxima conclusão real (ver renderLessonCompleteScreen). Se ainda
        // assim não bater (unidade diferente da esperada -- ex: várias idas
        // e vindas de histórico entre unidades diferentes), cai pra reabrir
        // a unidade em vez de mostrar uma tela vazia -- limitação conhecida,
        // documentada na entrega (Fase 10), não um crash.
        const cache = (typeof STEP_STATE !== 'undefined') ? STEP_STATE.lastUnitResultCache : null;
        if (cache && cache.unitId === route.unitId && typeof renderLessonCompleteScreen === 'function'){
          const u = UNITS.find(x => x.id === route.unitId);
          STATE.currentUnitId = route.unitId;
          if (typeof setLessonFocusMode === 'function') setLessonFocusMode(true);
          document.getElementById('path-list-wrap').style.display = 'none';
          document.getElementById('unit-detail-wrap').style.display = 'block';
          renderLessonCompleteScreen(u, cache.lesson, cache);
        } else if (typeof openUnitDetail === 'function'){
          openUnitDetail(route.unitId);
        }
        break;
      }
      case 'unitComplete': {
        // Mesmo princípio de 'unitResult' (Fase 2): só reconstrói a tela
        // própria de "Unidade concluída!" (Fase 4) se o cache ainda for
        // desta mesma unidade -- nunca reexecuta markUnitCompleted (XP,
        // desbloqueio etc. já aconteceram de verdade, uma vez só). Sem
        // cache batendo, cai pra Desafios de hoje (era o único destino
        // possível antes da Fase 4 existir), mantendo o placeholder antigo
        // como fallback em vez de uma tela vazia.
        const cache = (typeof STEP_STATE !== 'undefined') ? STEP_STATE.lastUnitCompleteCache : null;
        STATE.currentUnitId = route.unitId;
        if (typeof setLessonFocusMode === 'function') setLessonFocusMode(true);
        document.getElementById('path-list-wrap').style.display = 'none';
        document.getElementById('unit-detail-wrap').style.display = 'block';
        if (cache && cache.unitId === route.unitId && typeof renderUnitCompleteScreen === 'function'){
          const u = UNITS.find(x => x.id === route.unitId);
          renderUnitCompleteScreen(u, cache.xpEarned);
        } else if (typeof renderDailyChallengesScreen === 'function'){
          renderDailyChallengesScreen();
          STEP_STATE.onChallengesScreen = true;
        }
        break;
      }
      case 'publicProfile': {
        // Só a rota MESMO -- shared/public-profile.js abre por cima do que
        // já estiver na tela (modal), nunca troca de aba/vista de baixo.
        // Sem isso, um F5 em cima de #/user/x reabriria a Trilha por baixo
        // do modal em vez de restaurar exatamente onde a pessoa estava.
        if (typeof openPublicProfilePage === 'function') openPublicProfilePage(route.username);
        break;
      }
      default:
        if (typeof switchTab === 'function') switchTab('path');
    }
  } finally {
    ROUTER.restoring = false;
  }
  ROUTER.current = route;
}

window.addEventListener('popstate', (e) => {
  if (typeof STATE === 'undefined' || !STATE) return; // app ainda não carregou (ver applyInitialRoute)
  const route = e.state || hashToRoute(window.location.hash);
  renderRoute(route);
});

// Chamado uma vez, depois que loadStateAndRender() já terminou (mesmo ponto
// de shared/auth.js onde applyPendingNotificationTab/applyPendingLevelTestOffer
// já rodam) -- restaura a tela certa se a página foi carregada direto numa
// rota interna (F5, link salvo/compartilhado, atalho de PWA).
function applyInitialRoute(){
  if (!window.location.hash) return;
  renderRoute(hashToRoute(window.location.hash));
}
