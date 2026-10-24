// Mídia do cartão (imagem e áudio) no HTML: um ponto só para validar e escapar a URL.
// A URL vem de `field.image.url` / `field.audio.url` (cartões próprios, da professora e copiados de Deck público), sem
// validação no banco. Antes ela entrava crua em `src="..."`/`data-audio-url="..."`: uma aspa na URL abria um atributo
// novo (`onerror=...`) e o script rodava na sessão de quem abria o cartão (achado C1 de
// docs/revisao-codigo-compartilhado-erros.md). Vale para todos os sites (fr, zh, pt e os próximos).
//
// Aceita: https:, http:, blob:, data:image/..., data:audio/... e caminho relativo do próprio site
// (`audio/x.mp3`, `../shared/x.png`, `/fr/x.png`). Recusa o resto (javascript:, vbscript:, data:text/html, `//outro-host`,
// caracteres de controle, aspas duplas, < > e crase). Devolve a URL já escapada para atributo entre aspas, ou '' quando recusa.
// Carregado logo depois de shared/utils.js, antes de shared/core/audio-fala.js e dos renderers.

const SAFE_MEDIA_URL_SCHEMES = ['https', 'http', 'blob'];

function safeMediaUrlRaw(url){
  if (typeof url !== 'string') return '';
  const u = url.trim();
  if (!u) return '';
  // Caractere de controle (inclui tab/quebra de linha, que o navegador ignora dentro do esquema: "java\tscript:").
  if (/[\u0000-\u001F\u007F]/.test(u)) return '';
  // Aspas, < > e crase nunca aparecem crus numa URL de verdade (o upload grava a URL codificada): é tentativa de sair do atributo.
  if (/["<>`]/.test(u)) return '';
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u);
  if (scheme){
    const s = scheme[1].toLowerCase();
    if (SAFE_MEDIA_URL_SCHEMES.includes(s)) return u;
    if (s === 'data' && /^data:(image|audio)\/[a-zA-Z0-9.+-]+[;,]/i.test(u)) return u;
    return '';
  }
  // Sem esquema: só caminho do próprio site. `//host` e `\\host` apontam para outro servidor.
  if (/^[\\/]{2}/.test(u) || /^\/\\/.test(u)) return '';
  return u;
}

function safeMediaUrl(url){
  const u = safeMediaUrlRaw(url);
  return u ? u.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) : '';
}

// `<img>` de mídia do cartão nas telas da Revisão/Preview (mesma marcação de antes); '' sem URL ou com URL recusada.
function flashcardImageHTML(url){
  const src = safeMediaUrl(url);
  return src ? `<img src="${src}" class="flashcard-image" alt="">` : '';
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { safeMediaUrl, safeMediaUrlRaw, flashcardImageHTML };
}
