// Família latina (fr hoje; pt depois): peças da LIÇÃO que dependem de como as línguas latinas se escrevem, com a
// configuração do idioma em LANG_HOOKS.familiaLatina (<site>/lang-hooks.js). Carregado só pelos sites da família latina,
// antes do app.js (o zh tem as dele no zh/app.js: hanzi, pinyin). Paridade 5d (docs/historico/30-paridade-quase-iguais.md).

// Artigo no começo do termo do vocabulário ("la sœur", "o irmão"), da lista `artigos` da configuração do idioma.
// fr: le, la, les, l', un, une, des (= a regra que estava escrita no fr/app.js).
function latinaArtigoRe(){
  const artigos = (LANG_HOOKS.familiaLatina && LANG_HOOKS.familiaLatina.artigos) || [];
  if (!artigos.length) return /^\b$/; // nenhum artigo: não tira nada
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^(' + artigos.map(esc).join('|') + ') ?', 'i');
}

// ---------------------------------------------------------------- Diálogo: palavras do vocabulário destacadas

// Termos do vocabulário da unidade que valem destaque nas falas. "français /
// française" vira dois termos; "(de)" e outros parênteses saem do termo.
function dlgVocabTerms(u){
  const terms = [];
  const artigo = latinaArtigoRe();
  (u.vocab || []).forEach(v => {
    String(v.f || '').split(' / ').forEach(part => {
      const t = part.replace(/\s*\([^)]*\)/g, '').trim();
      if (!t) return;
      terms.push({ t, tr: v.t });
      // Substantivos aparecem nas falas com outro artigo ("la sœur" -> "une
      // sœur"): também marca o substantivo sem artigo (aceita plural em -s).
      const bare = t.replace(artigo, '');
      if (bare !== t && bare.length >= 3) terms.push({ t: bare, tr: v.t, plural: true });
    });
  });
  terms.sort((a, b) => b.t.length - a.t.length);
  return terms;
}

// Devolve o HTML da fala com as palavras da unidade destacadas (data-tr com
// o significado, mostrado num toast ao tocar). Tudo que não casa é escapado.
function dlgHighlight(text, terms){
  if (!terms.length) return escapeHTML(text);
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp("(?<![\\p{L}'’-])(" + terms.map(x => esc(x.t) + (x.plural ? 's?' : '')).join('|') + ")(?![\\p{L}-])", 'giu');
  const map = new Map(terms.map(x => [x.t.toLowerCase(), x.tr]));
  let out = '', last = 0, m;
  while ((m = re.exec(text))){
    out += escapeHTML(text.slice(last, m.index));
    const low = m[1].toLowerCase();
    const tr = map.get(low) || map.get(low.replace(/s$/, '')) || '';
    out += `<span class="dlg-new" data-tr="${escapeHTML(tr)}" data-w="${escapeHTML(m[1])}">${escapeHTML(m[1])}</span>`;
    last = m.index + m[1].length;
  }
  return out + escapeHTML(text.slice(last));
}
