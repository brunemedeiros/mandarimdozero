// Anti-moldura (auditoria de segurança, achado 6; docs/historico/36-auditoria-seguranca-2026-11.md).
// Impede que outro site mostre este dentro de uma moldura (iframe) para enganar o clique ("clickjacking").
// O certo seria o cabeçalho `frame-ancestors`/`X-Frame-Options`, mas o GitHub Pages não deixa configurar
// cabeçalhos e esse cabeçalho não funciona por <meta>. Então: se a página abriu dentro de uma moldura de OUTRO
// endereço, ela some (sem nada visível, não há clique para enganar) e tenta abrir a si mesma na janela inteira;
// o Chrome só deixa essa troca acontecer com um clique da pessoa, então em geral ela apenas some.
// Moldura do próprio site continua permitida.
// Carregado no começo do <head> das páginas, antes de qualquer outra coisa.
(function () {
  var emMoldura;
  try { emMoldura = window.top !== window.self; } catch (e) { emMoldura = true; }
  if (!emMoldura) return;
  var mesmoSite = false;
  try { mesmoSite = window.top.location.origin === window.location.origin; } catch (e) { mesmoSite = false; }
  if (mesmoSite) return;
  document.documentElement.style.visibility = 'hidden';
  try { window.top.location.href = window.location.href; } catch (e) { /* moldura com sandbox: a página fica escondida */ }
})();
