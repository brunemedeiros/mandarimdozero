// Notificação temporária (toast) no canto da tela -- usada em erros de
// salvamento, confirmações de ação (desafio publicado, +XP etc). Depende de
// #toast-layer existir no HTML de cada idioma (a div em si fica em cada
// index.html, só a lógica de disparo é compartilhada) e do CSS .toast
// (definido no <style> de cada idioma -- visual pode variar por marca).
function showToast(msg){
  const layer = document.getElementById('toast-layer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
