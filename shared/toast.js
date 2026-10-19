// Notificação temporária (toast) no canto da tela -- usada em erros de
// salvamento, confirmações de ação (desafio publicado, +XP etc). Depende de
// #toast-layer existir no HTML de cada idioma (a div em si fica em cada
// index.html, só a lógica de disparo é compartilhada) e do CSS .toast
// (definido no <style> de cada idioma -- visual pode variar por marca).
//
// A posição vertical era um top fixo (18px) definido só em CSS -- mas o que
// tem no topo da tela muda de altura o tempo todo (topbar normal vs.
// breadcrumb do modo foco de lição, com ou sem os botões de Dicas/Manual, +
// um contador "Palavra X de Y"/"Exercício X de Y" cuja altura também varia
// por conteúdo), e nenhum número fixo cobria todos os casos sem ou sobrepor
// título/conteúdo real em um app, ou ficar exagerado no outro (auditoria de
// UX/UI, 2026-09, P3). Em vez de chutar um número, mede o que está de fato
// no topo da tela nesse momento e posiciona o toast logo abaixo.
function toastTopOffset(){
  const FALLBACK = 18;
  const app = document.getElementById('app');
  // No modo foco de lição, o mais baixo entre a barra de progresso e o
  // contador da etapa atual ("Palavra X de Y"/"Exercício X de Y", quando
  // existe) é o que precisa ser evitado -- nenhum dos dois sozinho cobre
  // os dois apps em todo tipo de etapa.
  const candidates = app && app.classList.contains('lesson-focus')
    ? ['.lesson-focus-bar', '.exercise-counter', '.vocab-card-counter']
    : ['.topbar', '.tabs'];
  let maxBottom = null;
  candidates.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // ignora se já rolou pra fora da tela por cima (evita empurrar o toast
    // pra baixo à toa quando o header não está mais visível)
    if (rect.bottom < 0) return;
    if (maxBottom === null || rect.bottom > maxBottom) maxBottom = rect.bottom;
  });
  if (maxBottom === null) return FALLBACK;
  return Math.max(FALLBACK, Math.round(maxBottom + 12));
}

// Tempo na tela pelo tamanho do texto (antes eram 2 s fixos, curto demais para ler; etapa 2 do plano "Voz da
// Prof. Brune", 2026-10-19): 4 s no mínimo, uns 60 ms por letra, até 10 s. Passar o mouse segura o aviso.
// #toast-layer tem role="status" (aria-live) no HTML: leitor de tela anuncia cada aviso.
function toastDurationMs(msg){
  return Math.min(10000, Math.max(4000, String(msg || '').length * 60));
}

function showToast(msg){
  const layer = document.getElementById('toast-layer');
  if (!layer.hasAttribute('role')){ layer.setAttribute('role', 'status'); layer.setAttribute('aria-live', 'polite'); }
  layer.style.top = toastTopOffset() + 'px';
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  layer.appendChild(el);
  let timer = null, removal = null;
  const leave = () => { el.classList.add('saindo'); removal = setTimeout(() => el.remove(), 300); };
  const start = (ms) => { clearTimeout(timer); timer = setTimeout(leave, ms); };
  el.addEventListener('mouseenter', () => { clearTimeout(timer); clearTimeout(removal); el.classList.remove('saindo'); });
  el.addEventListener('mouseleave', () => start(1500));
  start(toastDurationMs(msg));
}
