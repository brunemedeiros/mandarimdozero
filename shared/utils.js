// Utilitários genéricos compartilhados por todos os idiomas da plataforma --
// nada aqui depende de conteúdo pedagógico nem de qual idioma está ativo.
// Carregado antes de qualquer languages/<lang>/app.js.

function localStorageSafeGet(key){
  try{ return window.localStorage.getItem(key); }catch(e){ return null; }
}
function localStorageSafeSet(key, val){
  try{ window.localStorage.setItem(key, val); }catch(e){ /* ignore */ }
}
function localStorageSafeRemove(key){
  try{ window.localStorage.removeItem(key); }catch(e){ /* ignore */ }
}
function sessionStorageSafeGet(key){
  try{ return window.sessionStorage.getItem(key); }catch(e){ return null; }
}
function sessionStorageSafeSet(key, val){
  try{ window.sessionStorage.setItem(key, val); }catch(e){ /* ignore */ }
}

// ---------- Tela de carregamento (spinner + frase, estilo Duolingo) ----------
// Reaproveitada por toda tela que busca dado assíncrono (perfil, ranking,
// notificações, painéis de admin) -- antes era só um texto parado
// ("Carregando..."), sem nenhum indicador visual de progresso de verdade.
// `label`, quando informado, fixa uma frase específica pro contexto (ex:
// "Carregando perfil..."); sem ele, sorteia da pool genérica -- dá um
// pouco de variedade sem inventar informação que o contexto não tem.
const LOADING_PHRASES = [
  'Carregando...', 'Só um instante...', 'Quase lá...', 'Buscando os dados...',
  'Preparando tudo...', 'Um momento...'
];
function loadingHTML(label){
  const text = label || LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
  return `<div class="profile-loading"><span class="loading-spinner"></span><p>${text}</p></div>`;
}

// ---------- Mini popover de descrição de badge ----------
// Reaproveitado por toda grade/fileira de badges (mini-linha do Perfil,
// grade completa de Conquistas) -- antes o `title` só repetia o NOME do
// badge (o hover nativo do navegador, que também não existe de verdade no
// celular). Isso mostra nome + descrição de verdade, funciona igual no
// toque (mobile) e no clique (desktop), sem depender de hover.
function showBadgeInfo(anchorEl, name, desc){
  document.querySelectorAll('.badge-info-popover').forEach(p => p.remove());
  const pop = document.createElement('div');
  pop.className = 'badge-info-popover';
  pop.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
  document.body.appendChild(pop);

  const rect = anchorEl.getBoundingClientRect();
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top = `${rect.top}px`;
  requestAnimationFrame(() => pop.classList.add('show'));

  const remove = () => { pop.remove(); document.removeEventListener('click', onOutsideClick, true); };
  const onOutsideClick = (e) => { if (e.target !== anchorEl) remove(); };
  setTimeout(() => document.addEventListener('click', onOutsideClick, true), 0);
  setTimeout(remove, 4000);
}
