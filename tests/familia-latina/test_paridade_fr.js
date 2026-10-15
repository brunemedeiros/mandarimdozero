// PARIDADE: shared/core/familias/latina.js configurado para o fr dá EXATAMENTE o mesmo resultado que as
// funções de hoje do fr/app.js (extraídas do texto, ver extrair-fr.js), num conjunto grande de entradas:
// todo o texto do curso de francês (vocabulário, frases, diálogos, desafios, conjugação, ditados) e
// variações dele que imitam o que a aluna digita (sem acento, sem hífen, "oe" por "œ", apóstrofo curvo,
// palavra trocada, número em dígito, pontuação ditada por extenso...).
// Rodar: node tests/familia-latina/test_paridade_fr.js
const path = require('path');
const { carregarFr, corpusFr, ROOT } = require('./extrair-fr.js');
const FL = require(path.join(ROOT, 'shared/core/familias/latina.js'));
const IDIOMAS = require(path.join(ROOT, 'shared/core/familias/latina-idiomas.js'));
const FR = carregarFr();
const M = FL.criar(IDIOMAS.fr);
const { textos, ditados, verbos } = corpusFr();

const grupos = {};
const falhas = [];
function igual(grupo, rotulo, a, b) {
  const g = grupos[grupo] || (grupos[grupo] = { ok: 0, falhou: 0 });
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja === jb) g.ok++;
  else { g.falhou++; if (falhas.length < 15) falhas.push(`[${grupo}] ${rotulo}\n    fr/app.js: ${ja}\n    módulo:    ${jb}`); }
}
// Algumas funções do fr lançam erro com entrada estranha: a paridade inclui lançar (ou não) do mesmo jeito.
function tenta(f) { try { return { v: f() }; } catch (e) { return { erro: true }; } }

// PRNG fixo (mesmas variações a cada rodada).
let semente = 1234567;
const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
const escolhe = (arr) => arr[Math.floor(rnd() * arr.length)];

const HOMOFONOS = { a: 'à', 'à': 'a', et: 'est', est: 'et', son: 'sont', ou: 'où', 'où': 'ou', on: 'ont', la: 'là', ce: 'se', ces: 'ses', mes: 'mais', peu: 'peut', leur: 'leurs', quel: 'quelle' };
const NUMEROS = { 'vingt-cinq': '25', 'trois': '3', 'deux': '2', 'dix': '10', 'soixante-dix': '70', 'quatre-vingts': '80', 'un': '1', 'quarante': '40', 'cent': '100', 'douze': '12' };
function variacoes(s) {
  const semAc = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pal = s.split(/\s+/);
  const v = [
    s, semAc, s.toUpperCase(), s.toLowerCase(), s.normalize('NFD'), '  ' + s + '  ',
    s.replace(/-/g, ''), s.replace(/-/g, ' '), s.replace(/œ/g, 'oe').replace(/æ/g, 'ae'),
    s.replace(/'/g, '’'), s.replace(/'/g, "' "), s.replace(/'/g, ''), s.replace(/[.,!?;:]/g, ''),
    s.replace(/,/g, ' virgule').replace(/\.$/, ' point').replace(/\?/g, " point d'interrogation"),
    s.replace(/\. /g, '.'), s.replace(/[aeiou]/, ''), s + ' ' + escolhe(pal), s.replace(/ /g, '​ '),
    s.replace(/é/g, 'è'), s.replace(/è/g, 'é'), s.replace(/ç/g, 'c'), s.replace(/ê/g, 'e'),
    s.replace(/«|»/g, '"'), s.replace(/-/g, '‑'),
  ];
  // palavra trocada por homófono, terminação de concordância, número em dígito, palavra faltando, troca de vizinhas
  v.push(pal.map(w => HOMOFONOS[w.toLowerCase()] || w).join(' '));
  v.push(pal.map((w, i) => (i % 3 === 1 && /^\p{Ll}{3,}$/u.test(w)) ? w + escolhe(['e', 's', 'es', 'x']) : w).join(' '));
  v.push(Object.keys(NUMEROS).reduce((t, k) => t.split(k).join(NUMEROS[k]), s));
  if (pal.length > 2) { const k = Math.floor(rnd() * pal.length); v.push(pal.filter((_, i) => i !== k).join(' ')); }
  if (pal.length > 2) { const k = Math.floor(rnd() * (pal.length - 1)); const p = pal.slice(); [p[k], p[k + 1]] = [p[k + 1], p[k]]; v.push(p.join(' ')); }
  return v;
}

// ---------------------------------------------------------------- 1. normalização e comparação tolerante
for (const s of textos) {
  for (const x of [s, s.normalize('NFD'), s.toUpperCase()]) {
    igual('normalizeLoose', x, FR.normalizeLoose(x), FL.normalizarFrouxo(x));
    igual('conjFold', x, FR.conjFold(x), FL.dobrarBusca(x));
    igual('acceptedForms', x, FR.acceptedForms(x), FL.formasAceitas(x));
  }
}
igual('conjFold', 'null', FR.conjFold(null), FL.dobrarBusca(null));
igual('acceptedForms', 'vazio', FR.acceptedForms(''), FL.formasAceitas(''));

// vocabulário de ouvido e lacuna digitada: certo/errado com acento tolerado
const amostra = textos.filter(t => t.length < 60);
for (const alvo of amostra) {
  for (const typed of variacoes(alvo)) {
    const fv = FR.acceptedForms(alvo).some(f => FR.vocabStrip(f) === FR.vocabStrip(typed));
    igual('vocab-type', alvo + ' | ' + typed, fv, FL.respostaDigitadaCerta(typed, alvo, FL.PONTUACAO_VOCAB_RE));
    const fl = FR.acceptedForms(alvo).some(f => FR.lacunaStrip(f) === FR.lacunaStrip(typed));
    igual('lacuna-type', alvo + ' | ' + typed, fl, FL.respostaDigitadaCerta(typed, alvo, FL.PONTUACAO_LACUNA_RE));
  }
}

// exercício de gramática digitado (hífen = espaço = apóstrofo)
for (const alvo of amostra.slice(0, 2500)) {
  for (const given of variacoes(alvo)) {
    const forms = [alvo];
    const { canonSep, looseSep } = FR.gramSep;
    const esperado = forms.some(f => canonSep(given) === canonSep(f)) ? 'ok' : forms.some(f => looseSep(given) === looseSep(f)) ? 'almost' : 'wrong';
    igual('gram-separadores', alvo + ' | ' + given, esperado, M.avaliarComSeparadores(given, forms));
  }
}

// ---------------------------------------------------------------- 2. desafio Acentuação (acento exigido)
for (const alvo of amostra) {
  for (const typed of variacoes(alvo).concat(['', '   ', null])) {
    igual('acentuacao-certa', alvo + ' | ' + typed, FR.isAccentAnswerCorrect(typed, alvo), FL.acentuacaoCerta(typed, alvo));
    igual('acentuacao-resultado', alvo + ' | ' + typed, FR.accentAnswerOutcome(typed, alvo), M.resultadoAcentuacao(typed, alvo));
    igual('acentuacao-resultado-generico', alvo + ' | ' + typed, FR.accentAnswerOutcome(typed, alvo), FL.resultadoAcentuacao(typed, alvo));
  }
}

// ---------------------------------------------------------------- 3. conjugação: alinhamento letra a letra
const formas = [];
for (const v of Object.values(verbos)) for (const lista of Object.values(v.f || {})) (lista || []).forEach(f => f && formas.push(...String(f).split('/').map(x => x.trim())));
for (const alvo of formas) {
  for (const typed of [alvo, alvo.normalize('NFD').replace(/[̀-ͯ]/g, ''), alvo.slice(1), alvo + 's', alvo.replace(/e/, 'é'), alvo.toUpperCase()]) {
    igual('conjAlign', alvo + ' | ' + typed, FR.conjAlign(typed, alvo), FL.alinharLetras(typed, alvo));
  }
}

// ---------------------------------------------------------------- 4. ditado
const frasesDitado = ditados.concat(textos.filter(t => t.length >= 15 && t.length < 300 && /\s/.test(t)).slice(0, 1500));
for (const ref of frasesDitado) {
  for (const typed of variacoes(ref)) {
    const a = tenta(() => FR.evaluateDictation(ref, typed)), b = tenta(() => M.avaliarDitado(ref, typed));
    igual('evaluateDictation', ref + ' | ' + typed, a, b);
    if (a.v) {
      for (const x of a.v.merged) {
        if (x.type === 'match' && x.light) igual('dictationLightNoteText', x.word + ' | ' + x.userWord, FR.dictationLightNoteText(x), M.textoErroLeve(x));
        if (x.type === 'sub') igual('classifyDictationError', x.correct + ' | ' + x.wrong, FR.classifyDictationError(x.correct, x.wrong), (({ kind, noteText }) => ({ kind, noteText }))(M.classificarErroDitado(x.correct, x.wrong)));
      }
    }
    igual('prepareDictationUserText', ref + ' | ' + typed, FR.prepareDictationUserText(typed, ref), M.prepararTextoDitado(typed, ref));
  }
  for (const w of ref.split(/\s+/)) {
    igual('normalizeDictationWord', w, FR.normalizeDictationWord(w), M.normalizarPalavraDitado(w));
    igual('dictLooseNorm', w, FR.dictLooseNorm(w), M.palavraFrouxaDitado(w));
  }
}
// pares de palavras soltas (todas as combinações de homófonos e de terminação)
const soltas = ['a', 'à', 'et', 'est', 'son', 'sont', 'ou', 'où', 'on', 'ont', 'la', 'là', 'ce', 'se', 'ces', 'ses', "c'est", "s'est", 'mes', 'mais', 'peu', 'peux', 'peut', 'leur', 'leurs', 'quel', 'quelle', 'quels', 'quelles',
  'petit', 'petite', 'petits', 'petites', 'ami', 'amie', 'amis', 'heureux', 'Paris', 'Parise', 'sœur', 'soeur', 'peut-être', 'peutetre', "aujourd'hui", 'aujourdhui', 'grand-mère', 'grand mère', 'élève', 'eleve', 'Été', 'été,', '«été»', 'chat.', 'chats!'];
for (const r of soltas) for (const u of soltas) {
  igual('classifyDictationError', r + ' | ' + u, FR.classifyDictationError(r, u), (({ kind, noteText }) => ({ kind, noteText }))(M.classificarErroDitado(r, u)));
  const cs = FR.normalizeDictationWord(r), us = FR.normalizeDictationWord(u);
  igual('dictLightReason', r + ' | ' + u, FR.dictLightReason(cs, us), M.motivoErroLeve(cs, us));
}
for (let n = -2; n <= 105; n++) igual('frenchNumberWords', String(n), FR.frenchNumberWords(n), IDIOMAS.fr.numeroPorExtenso(n));
igual('frenchNumberWords', '1.5', FR.frenchNumberWords(1.5), IDIOMAS.fr.numeroPorExtenso(1.5));

// ---------------------------------------------------------------- 5. teclado de acentos
igual('FR_ACCENT_GROUPS', 'grupos', FR.FR_ACCENT_GROUPS, IDIOMAS.fr.gruposDeAcentos);
igual('frAccentPickerHTML', 'html', FR.frAccentPickerHTML(), M.htmlTecladoDeAcentos());
// wireFrAccentPicker com DOM falso: cada tecla em cada posição do cursor dá o mesmo texto e o mesmo cursor
function campoFalso(valor, ini, fim) {
  return { value: valor, selectionStart: ini, selectionEnd: fim, focus() {}, setSelectionRange(a, b) { this.cursor = [a, b]; } };
}
const teclas = IDIOMAS.fr.gruposDeAcentos.flat();
for (const valor of ['', 'ecole', 'tres bien', 'garcon', 'ou est']) {
  const posicoes = [[null, null], [0, 0], [valor.length, valor.length], [1, Math.min(3, valor.length)], [Math.floor(valor.length / 2), Math.floor(valor.length / 2)]];
  for (const [ini, fim] of posicoes) for (const ch of teclas) {
    const handlers = [];
    const botao = { textContent: ch, addEventListener(tipo, h) { if (tipo === 'click') handlers.push(h); } };
    const input = campoFalso(valor, ini, fim);
    FR.wireFrAccentPicker({ querySelectorAll: () => [botao] }, input);
    handlers.forEach(h => h());
    const r = FL.inserirNoCursor(valor, ini, fim, ch);
    igual('wireFrAccentPicker', `${valor}|${ini}|${fim}|${ch}`, [input.value, input.cursor], [r.value, [r.cursor, r.cursor]]);
  }
}

// ---------------------------------------------------------------- resumo
let total = 0, ruins = 0;
for (const [g, n] of Object.entries(grupos)) { total += n.ok + n.falhou; ruins += n.falhou; console.log(`${n.falhou ? '✗' : '✓'} ${g}: ${n.ok}/${n.ok + n.falhou}`); }
falhas.forEach(f => console.log('FALHOU ' + f));
console.log(`paridade fr x módulo: ${total - ruins}/${total} comparações iguais (${Object.keys(grupos).length} grupos; corpus: ${textos.length} textos, ${ditados.length} ditados, ${formas.length} formas verbais)`);
process.exit(ruins ? 1 : 0);
