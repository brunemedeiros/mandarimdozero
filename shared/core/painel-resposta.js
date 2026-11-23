// Painel de resposta ÚNICO do site (decisão da autora, 2026-11-11: "uma tela de resposta, certa ou errada, para a trilha,
// Expressões, Jogos e TODAS as telas"), no desenho da maquete da lição curta (docs/i18n/curriculo/maquete-licao-curta/,
// decisões 350 a 352) e na voz da professora (docs/voz-da-professora.md). Contrato: docs/painel-resposta-unico.md.
// Piloto: Jogos da Conjugação (shared/conj-games.js). As outras telas adotam depois da aprovação da autora.
//
// painelRespostaHTML({ estado, frase, traducao, lang, ouvir, extra, regra, explicacao, continuar, idContinuar })
//   estado: 'certo' | 'quase' (conta como acerto, painel verde) | 'erro' | 'revelada' ("Não sei")
//   frase / traducao: a frase (ou palavra) certa e a tradução no idioma do site; ouvir: true mostra o 🔊 (data-pr-ouvir)
//   fraseHTML: no lugar de `frase`, HTML já pronto e escapado por quem chama (ex.: a expressão destacada dentro da frase)
//   acoes: HTML dos botões de áudio no lugar do 🔊 (ex.: os ícones 🔊 e 🐢 das Expressões, audioIconsHTML)
//   extra: HTML opcional logo abaixo da frase (ex.: o desenho letra a letra do "quase")
//   regra: HTML opcional em negrito no começo da fala (ex.: a regra do jogo, com desenho); explicacao: HTML da fala
//   continuar: texto do botão; idContinuar: id do botão (quem chama liga o clique)
// painelRespostaRico(texto, lang): a fala com o francês entre {chaves} já escapada, com o trecho em azul (.pr-fr).
// O símbolo ✓/✕ do título vem do CSS (escrito no texto, o shared/emoji-icons.js o trocaria por um ícone).
(function(root){
  const t0 = (k, p) => (typeof t === 'function' ? t(k, p) : k);
  const esc = s => (typeof escapeHTML === 'function' ? escapeHTML(String(s == null ? '' : s))
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const FOTO = '../icons/brune-email.jpg';
  const TITULO = { certo: 'answerPanel.right', quase: 'answerPanel.almost', erro: 'answerPanel.wrong', revelada: 'feedback.header.revealed' };

  function painelRespostaHTML(o){
    const estado = TITULO[o.estado] ? o.estado : 'erro';
    const verde = estado === 'certo' || estado === 'quase';
    const fraseIn = o.fraseHTML != null ? o.fraseHTML : (o.frase ? esc(o.frase) : '');
    const frase = fraseIn ? `<div class="pr-frase">
        <div class="pr-frase-t"><span class="pr-frase-fr"${o.lang ? ` lang="${esc(o.lang)}"` : ''}>${fraseIn}</span>${o.traducao ? `<span class="pr-trad">${esc(o.traducao)}</span>` : ''}</div>
        ${o.acoes ? `<span class="pr-acoes">${o.acoes}</span>` : ''}${!o.acoes && o.ouvir ? `<button type="button" class="audio-btn pr-ouvir" data-pr-ouvir aria-label="${esc(t0('games.listen'))}" title="${esc(t0('games.listen'))}">🔊</button>` : ''}
      </div>` : '';
    const fala = (o.regra || o.explicacao) ? `<div class="pr-prof">
        <img class="pr-foto" src="${FOTO}" alt="" width="40" height="40">
        <div class="pr-fala"><span class="pr-nome">${esc(t0('answerPanel.teacher'))}</span>${o.regra ? `<div class="pr-regra">${o.regra}</div>` : ''}${o.explicacao ? `<p class="pr-explicacao">${o.explicacao}</p>` : ''}</div>
      </div>` : '';
    return `<div class="painel-resposta ${verde ? 'is-ok' : 'is-err'}" data-estado="${estado}">
      <div class="pr-titulo"><span class="pr-marca" aria-hidden="true"></span>${esc(t0(TITULO[estado]))}</div>
      ${frase}${o.extra || ''}${fala}
      <button type="button" class="btn btn-block pr-continuar" id="${esc(o.idContinuar || 'pr-continuar')}">${esc(o.continuar || t0('common.continueArrow'))}</button>
    </div>`;
  }
  // Texto da fala com o idioma estudado entre {chaves} (mesma convenção dos Jogos): escapa e pinta o trecho de azul.
  function painelRespostaRico(texto, lang){
    return esc(texto).replace(/\{([^{}]+)\}/g, (m, x) => `<span class="pr-fr"${lang ? ` lang="${esc(lang)}"` : ''}>${x}</span>`);
  }
  root.painelRespostaHTML = painelRespostaHTML;
  root.painelRespostaRico = painelRespostaRico;
})(typeof window !== 'undefined' ? window : globalThis);
