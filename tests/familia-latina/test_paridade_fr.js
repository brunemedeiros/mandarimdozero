// PARIDADE: o fr/app.js de AGORA (que repassa para shared/core/familias/latina.js com a configuração de
// fr/lang-hooks.js) dá o MESMO resultado que o fr/app.js ANTIGO (commit de referência, ver extrair-fr.js),
// num conjunto grande de entradas: todo o texto do curso de francês (vocabulário, frases, diálogos,
// desafios, conjugação, ditados) e variações dele que imitam o que a aluna digita (sem acento, sem hífen,
// "oe" por "œ", apóstrofo curvo, palavra trocada, número em dígito, pontuação ditada por extenso...).
//
// Única exceção: as mudanças que a dona AUTORIZOU na fase 2 (2026-10-15). Cada diferença é conferida por
// uma regra própria (autorizada()) e contada à parte; qualquer outra diferença falha o teste.
//   (a) "oe" por "œ" (e "ae" por "æ"): 'quase' no "Digite o que ouviu", na lacuna digitada e na Acentuação.
//   (c) apóstrofo curvo do celular (’) aceito também na lacuna digitada (igual ao "Digite o que ouviu").
//   (d) ditado: número em dígito que o PRÓPRIO texto escreve em dígito fica como está.
//   (e) ditado: dois erros leves na mesma palavra (ex.: sem hífen E sem acento) citam os dois.
// (b) (explicações do ditado no catálogo de tradução) não muda o texto em português: aqui, com o t() em
//     pt-BR, os textos têm de sair byte a byte iguais.
// Rodar: node tests/familia-latina/test_paridade_fr.js
const { carregarAntigo, carregarNovo, corpusFr, REF } = require('./extrair-fr.js');
const A = carregarAntigo();
const N = carregarNovo();
const { textos, ditados, verbos } = corpusFr();

const grupos = {};
const falhas = [];
const J = JSON.stringify;
function compara(grupo, rotulo, a, b, autorizada) {
  const g = grupos[grupo] || (grupos[grupo] = { ok: 0, autorizadas: 0, falhou: 0, exemplos: [] });
  const ja = J(a), jb = J(b);
  if (ja === jb) { g.ok++; return; }
  if (autorizada && autorizada()) { g.autorizadas++; if (g.exemplos.length < 3) g.exemplos.push(rotulo + ': ' + ja + ' -> ' + jb); return; }
  g.falhou++;
  if (falhas.length < 15) falhas.push(`[${grupo}] ${rotulo}\n    antigo (${REF}): ${ja}\n    novo:           ${jb}`);
}
// Algumas funções lançam erro com entrada estranha: a paridade inclui lançar (ou não) do mesmo jeito.
function tenta(f) { try { return { v: f() }; } catch (e) { return { erro: true }; } }

const semLigadura = (s) => s == null ? s : String(s).replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE');
const temDigito = (s) => /\d/.test(String(s || ''));

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
    semAc.replace(/-/g, ''), semAc.replace(/œ/g, 'oe').replace(/'/g, ''),   // dois erros na mesma palavra
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
    compara('normalizeLoose', x, A.normalizeLoose(x), N.normalizeLoose(x));
    compara('conjFold', x, A.conjFold(x), N.conjFold(x));
    compara('acceptedForms', x, A.acceptedForms(x), N.acceptedForms(x));
  }
}
compara('conjFold', 'null', A.conjFold(null), N.conjFold(null));
compara('normalizeLoose', 'null lança erro igual', tenta(() => A.normalizeLoose(null)), tenta(() => N.normalizeLoose(null)));
compara('acceptedForms', 'vazio', A.acceptedForms(''), N.acceptedForms(''));

// vocabulário de ouvido e lacuna digitada: acento tolerado; (a) ligadura = quase; (c) ’ na lacuna
const amostra = textos.filter(t => t.length < 60);
for (const alvo of amostra) {
  for (const typed of variacoes(alvo).concat([''])) {
    const vOld = A.vocab(typed, alvo), vNew = N.vocab(typed, alvo);
    compara('vocab-type', alvo + ' | ' + typed, vOld, vNew,
      () => vOld === 'errou' && vNew === 'quase' && A.vocab(semLigadura(typed), semLigadura(alvo)) === 'ok');
    const lOld = A.lacuna(typed, alvo), lNew = N.lacuna(typed, alvo);
    compara('lacuna-type', alvo + ' | ' + typed, lOld, lNew,
      () => lOld === 'errou' && ((lNew === 'ok' && vOld === 'ok') || (lNew === 'quase' && A.vocab(semLigadura(typed), semLigadura(alvo)) === 'ok')));
  }
}

// exercício de gramática digitado (hífen = espaço = apóstrofo)
for (const alvo of amostra.slice(0, 2500)) {
  for (const given of variacoes(alvo)) compara('gram-separadores', alvo + ' | ' + given, A.gram(given, [alvo]), N.gram(given, [alvo]));
}

// ---------------------------------------------------------------- 2. desafio Acentuação (acento exigido)
for (const alvo of amostra) {
  for (const typed of variacoes(alvo).concat(['', '   ', null])) {
    compara('acentuacao-certa', alvo + ' | ' + typed, A.isAccentAnswerCorrect(typed, alvo), N.isAccentAnswerCorrect(typed, alvo));
    const o = A.accentAnswerOutcome(typed, alvo), n = N.accentAnswerOutcome(typed, alvo);
    compara('acentuacao-resultado', alvo + ' | ' + typed, o, n,
      () => o === 'fail' && n === 'partial' && A.accentAnswerOutcome(semLigadura(typed), semLigadura(alvo)) !== 'fail');
  }
}

// ---------------------------------------------------------------- 3. conjugação: alinhamento letra a letra
const formas = [];
for (const v of Object.values(verbos)) for (const lista of Object.values(v.f || {})) (lista || []).forEach(f => f && formas.push(...String(f).split('/').map(x => x.trim())));
for (const alvo of formas) {
  for (const typed of [alvo, alvo.normalize('NFD').replace(/[̀-ͯ]/g, ''), alvo.slice(1), alvo + 's', alvo.replace(/e/, 'é'), alvo.toUpperCase()]) {
    compara('conjAlign', alvo + ' | ' + typed, A.conjAlign(typed, alvo), N.conjAlign(typed, alvo));
  }
}

// ---------------------------------------------------------------- 4. ditado
// (e): o novo pode trocar reason 'spelling' por 'multiple' (+ reasons) num item leve; o resto tem de ser igual.
const comoAntigo = (r) => r && r.v ? { v: Object.assign({}, r.v, { merged: r.v.merged.map(x => {
  if (x.reason !== 'multiple') return x;
  const y = Object.assign({}, x, { reason: 'spelling' }); delete y.reasons; return y;
}) }) } : r;
const multiplosValidos = (r) => r && r.v && r.v.merged.every(x => x.reason !== 'multiple' || (Array.isArray(x.reasons) && x.reasons.length >= 2));
const frasesDitado = ditados.concat(textos.filter(t => t.length >= 15 && t.length < 300 && /\s/.test(t)).slice(0, 1500))
  .concat(['Il fait 30 degrés.', "J'ai 25 ans et 3 chats.", 'Le 14 juillet, il y a 2 fêtes.']);   // (d): texto com dígito
for (const ref of frasesDitado) {
  for (const typed of variacoes(ref)) {
    const a = tenta(() => A.evaluateDictation(ref, typed)), b = tenta(() => N.evaluateDictation(ref, typed));
    compara('evaluateDictation', ref + ' | ' + typed, a, b, () =>
      (multiplosValidos(b) && J(comoAntigo(b)) === J(a)) ||                                              // (e)
      (temDigito(ref) && temDigito(typed) && a.v && b.v && b.v.score >= a.v.score));                     // (d)
    if (a.v) {
      for (const x of a.v.merged) {
        if (x.type === 'match' && x.light) compara('dictationLightNoteText', x.word + ' | ' + x.userWord, A.dictationLightNoteText(x), N.dictationLightNoteText(x));
        if (x.type === 'sub') compara('classifyDictationError', x.correct + ' | ' + x.wrong, A.classifyDictationError(x.correct, x.wrong), N.classifyDictationError(x.correct, x.wrong));
      }
    }
    const pa = A.prepareDictationUserText(typed, ref), pb = N.prepareDictationUserText(typed, ref);
    compara('prepareDictationUserText', ref + ' | ' + typed, pa, pb, () => temDigito(ref) && temDigito(typed) && pb.digitNotes.length < pa.digitNotes.length);
  }
  for (const w of ref.split(/\s+/)) {
    compara('normalizeDictationWord', w, A.normalizeDictationWord(w), N.normalizeDictationWord(w));
    compara('dictLooseNorm', w, A.dictLooseNorm(w), N.dictLooseNorm(w));
  }
}
// pares de palavras soltas (todas as combinações de homófonos e de terminação)
const soltas = ['a', 'à', 'et', 'est', 'son', 'sont', 'ou', 'où', 'on', 'ont', 'la', 'là', 'ce', 'se', 'ces', 'ses', "c'est", "s'est", 'mes', 'mais', 'peu', 'peux', 'peut', 'leur', 'leurs', 'quel', 'quelle', 'quels', 'quelles',
  'petit', 'petite', 'petits', 'petites', 'ami', 'amie', 'amis', 'heureux', 'Paris', 'Parise', 'sœur', 'soeur', 'peut-être', 'peutetre', "aujourd'hui", 'aujourdhui', 'grand-mère', 'grand mère', 'élève', 'eleve', 'Été', 'été,', '«été»', 'chat.', 'chats!'];
for (const r of soltas) for (const u of soltas) {
  compara('classifyDictationError', r + ' | ' + u, A.classifyDictationError(r, u), N.classifyDictationError(r, u));
  const cs = A.normalizeDictationWord(r), us = A.normalizeDictationWord(u);
  const ra = A.dictLightReason(cs, us), rb = N.dictLightReason(cs, us);
  compara('dictLightReason', r + ' | ' + u, ra, rb, () => ra === 'spelling' && rb === 'multiple');   // (e)
}
for (let n = -2; n <= 105; n++) compara('frenchNumberWords', String(n), A.frenchNumberWords(n), N.frenchNumberWords(n));
compara('frenchNumberWords', '1.5', A.frenchNumberWords(1.5), N.frenchNumberWords(1.5));

// ---------------------------------------------------------------- 5. teclado de acentos
compara('teclado-grupos', 'grupos', A.accentGroups, N.accentGroups);
compara('teclado-html', 'html', A.accentPickerHTML(), N.accentPickerHTML());
// wireFrAccentPicker com DOM falso: cada tecla em cada posição do cursor dá o mesmo texto e o mesmo cursor
function campoFalso(valor, ini, fim) {
  return { value: valor, selectionStart: ini, selectionEnd: fim, focus() {}, setSelectionRange(a, b) { this.cursor = [a, b]; } };
}
function clica(wire, valor, ini, fim, ch) {
  const handlers = [];
  let impedido = 0;
  const botao = { textContent: ch, addEventListener(tipo, h) { handlers.push([tipo, h]); } };
  const input = campoFalso(valor, ini, fim);
  wire({ querySelectorAll: () => [botao] }, input);
  handlers.forEach(([tipo, h]) => { if (tipo === 'mousedown') h({ preventDefault() { impedido++; } }); else h(); });
  return [input.value, input.cursor, impedido];
}
for (const valor of ['', 'ecole', 'tres bien', 'garcon', 'ou est']) {
  const posicoes = [[null, null], [0, 0], [valor.length, valor.length], [1, Math.min(3, valor.length)], [Math.floor(valor.length / 2), Math.floor(valor.length / 2)]];
  for (const [ini, fim] of posicoes) for (const ch of A.accentGroups.flat()) {
    compara('teclado-clique', `${valor}|${ini}|${fim}|${ch}`, clica(A.wireAccentPicker, valor, ini, fim, ch), clica(N.wireAccentPicker, valor, ini, fim, ch));
  }
}

// ---------------------------------------------------------------- resumo
let total = 0, ruins = 0, aut = 0;
for (const [g, n] of Object.entries(grupos)) {
  total += n.ok + n.autorizadas + n.falhou; ruins += n.falhou; aut += n.autorizadas;
  console.log(`${n.falhou ? '✗' : '✓'} ${g}: ${n.ok + n.autorizadas}/${n.ok + n.autorizadas + n.falhou}${n.autorizadas ? ` (${n.autorizadas} diferenças autorizadas, ex.: ${n.exemplos.join(' ; ')})` : ''}`);
}
falhas.forEach(f => console.log('FALHOU ' + f));
console.log(`paridade fr antigo (${REF}) x fr novo: ${total - ruins}/${total} comparações (${total - ruins - aut} iguais + ${aut} diferenças autorizadas; ${Object.keys(grupos).length} grupos; corpus: ${textos.length} textos, ${ditados.length} ditados, ${formas.length} formas verbais)`);
process.exit(ruins ? 1 : 0);
