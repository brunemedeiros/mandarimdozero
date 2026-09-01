// Utilitários genéricos compartilhados por todos os idiomas da plataforma --
// nada aqui depende de conteúdo pedagógico nem de qual idioma está ativo.
// Carregado antes de qualquer languages/<lang>/app.js.

function localStorageSafeGet(key){
  try{ return window.localStorage.getItem(key); }catch(e){ return null; }
}
function localStorageSafeSet(key, val){
  try{ window.localStorage.setItem(key, val); }catch(e){ /* ignore */ }
}
function sessionStorageSafeGet(key){
  try{ return window.sessionStorage.getItem(key); }catch(e){ return null; }
}
function sessionStorageSafeSet(key, val){
  try{ window.sessionStorage.setItem(key, val); }catch(e){ /* ignore */ }
}
