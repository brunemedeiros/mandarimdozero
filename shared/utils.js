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
