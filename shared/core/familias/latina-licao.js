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

// ---------------------------------------------------------------- Teclado de acentos (exercícios de digitar)
// (Veio do fr/app.js na paridade 5d; os nomes e as classes fr-accent-* ficam, porque os motores e o CSS já usam.)
// Ninguém tem acento fácil de digitar num teclado físico/mobile padrão --
// isso dá um jeito de inserir a letra certa sem precisar trocar de layout
// de teclado. Importante: o acento NÃO é exigido pra acertar (a comparação
// já remove diacríticos dos dois lados, ver lessonTypedAnswerResult nos
// dois exercícios abaixo) -- isso é só pra quem quer treinar digitando com o
// acento certo mesmo, não um requisito escondido. Minúsculas só (a
// comparação já ignora maiúscula/minúscula) -- mesmo espírito do
// PINYIN_TONE_GROUPS em zh/app.js, adaptado pro alfabeto francês.
// Família latina, fase 2: as letras do teclado estão em LANG_HOOKS.familiaLatina.gruposDeAcentos
// (fr/lang-hooks.js) e a marcação/inserção, em shared/core/familias/latina.js. As classes
// continuam fr-accent-* (o CSS e as capturas de tela não mudam).
// `expected` (opcional): a resposta que o exercício pede. Se ela tem uma letra que o teclado não tem (æ, ñ, ß...),
// entra uma fileira a mais só com essa letra, sem legenda; sem isso, o teclado é o de sempre.
function frAccentPickerHTML(expected){
  const base = LANG_HOOKS.familiaLatina.gruposDeAcentos;
  const tem = new Set([].concat(...base));
  const extras = [...new Set(Array.from(String(expected || '').toLowerCase()).filter(ch => /\p{L}/u.test(ch) && !/[a-z]/.test(ch) && !tem.has(ch)))];
  return extras.length ? FamiliaLatina.htmlTecladoDeAcentos(base.concat([extras])) : latinaFr().htmlTecladoDeAcentos();
}

// Escreve a tecla no campo: insere no CURSOR (não sempre no final) -- dá pra
// corrigir só a letra que falta o acento no meio da palavra sem apagar o resto.
function insertAccentAtCursor(inputEl, ch){
  const r = FamiliaLatina.inserirNoCursor(inputEl.value, inputEl.selectionStart, inputEl.selectionEnd, ch);
  inputEl.value = r.value;
  inputEl.focus();
  inputEl.setSelectionRange(r.cursor, r.cursor);
}

function wireFrAccentPicker(pickerEl, inputEl){
  if (!pickerEl || !inputEl) return;
  pickerEl.querySelectorAll('.fr-accent-key').forEach(btn => {
    // Não deixa o toque na tecla tirar o foco/cursor do campo (no celular
    // isso fechava e reabria o teclado).
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => insertAccentAtCursor(inputEl, btn.textContent));
  });
}

// ---------------------------------------------------------------- Correção da resposta digitada da trilha
// BEGIN accent-answer-logic (extraído literalmente por fr/scripts/test_answer_validation.js -- não mover/renomear estes marcadores sem atualizar o teste)
// Normaliza pra comparação "quase certo": remove acentos e ignora maiúsculas.
// Erro de terminal (ex: "prennons" por "prenons") continua contando como errado.
// Auditoria 2026-09-16 (grilling): comportamento tolerante a acento
// CONFIRMADO como intencional pro francês (acento não muda a nota nos
// exercícios digitados de vocabulário/cloze/conjugação) -- preservado sem
// alteração. Só o pinyin do chinês (zh/app.js) tinha esse mesmo padrão
// aplicado errado -- ver normalizePinyinAnswer lá, tom não é decoração.
// Família latina, fase 2 (docs/i18n/familia-latina-modulo.md): as regras moram em
// shared/core/familias/latina.js; a configuração do francês, em LANG_HOOKS.familiaLatina (fr/lang-hooks.js).
function normalizeLoose(str){
  return FamiliaLatina.normalizarFrouxo(str);
}

// Uma instância do módulo por página, criada no primeiro uso (o lang-hooks.js e o módulo já carregaram).
let _latinaFr = null;

function latinaFr(){
  return _latinaFr || (_latinaFr = FamiliaLatina.criar(LANG_HOOKS.familiaLatina));
}

// Exercícios de digitar da trilha ("Digite o que ouviu" e a lacuna digitada): 'ok' | 'quase' | 'errou'.
// Acento não conta (como sempre); "oe" por "œ" = 'quase' (decisão da dona, 2026-10-15); o apóstrofo
// curvo do celular (’) é ignorado nos dois exercícios (antes só no "Digite o que ouviu").
function lessonTypedAnswerResult(typed, expected){
  return latinaFr().avaliarRespostaDigitada(typed, expected, FamiliaLatina.PONTUACAO_VOCAB_RE);
}

// END accent-answer-logic
