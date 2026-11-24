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

// Tela de espera com rodinha. Cada tela diz o que está buscando ("Carregando ranking...", "Carregando o mural...");
// sem texto próprio, "Carregando...". Decisão da dona (2026-11-24): acabou o sorteio entre 6 frases genéricas
// ("Só um instante...", "Quase lá..."...), que não diziam nada e ainda mexiam no sorteio dos exercícios nos testes.
function loadingHTML(label){
  const text = label || t('loading.phrase.loading');
  return `<div class="profile-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span><p>${text}</p></div>`;
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

// Nome do idioma estudado no idioma do SITE ("French" com o site em inglês,
// "Francês" em português), com a 1ª letra maiúscula. Aceita o objeto de
// AVAILABLE_LANGUAGES ou o appKey. AVAILABLE_LANGUAGES[].name é sempre pt-BR:
// não usar direto em texto visível (site em inglês não tem nada em português).
function languageDisplayName(lang, uiLang){
  const appKey = typeof lang === 'string' ? lang : (lang && lang.appKey);
  const ui = uiLang || (typeof getUiLang === 'function' ? getUiLang() : 'pt-BR');
  let name = (typeof LanguageRegistry !== 'undefined' && LanguageRegistry.shortName && appKey) ? LanguageRegistry.shortName(appKey, ui) : '';
  if (!name) name = (lang && typeof lang === 'object' && lang.name) || appKey || '';
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}
