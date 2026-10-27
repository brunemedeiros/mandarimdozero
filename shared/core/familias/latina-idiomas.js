// Configuração de cada idioma da família latina para shared/core/familias/latina.js.
// FASE 2 (docs/i18n/familia-latina-modulo.md): a configuração do FRANCÊS saiu daqui e mora em fr/lang-hooks.js
// (LANG_HOOKS.familiaLatina), que é o que a página carrega; os textos das explicações do fr estão nos catálogos
// de shared/i18n. Este arquivo NÃO é carregado por nenhuma página: guarda só o português até o /pt existir
// (aí a parte do pt vai para pt/lang-hooks.js).
//
// pt = português do Brasil como IDIOMA ESTUDADO, para quem fala inglês (o /pt só tem site em inglês:
//      os textos de explicação são em inglês). Escrito a partir de exemplos reais do português, não copiado
//      do francês. Rascunho para a revisão da dona (ver o relatório).
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ português do Brasil (idioma estudado)
  // Números: "um/uma" e "dois/duas" mudam com o gênero; "catorze" e "quatorze" são as duas aceitas.
  // Devolve a lista de formas; o módulo escolhe a que aparece no texto do ditado.
  var PT_UNITS = ['zero', ['um', 'uma'], ['dois', 'duas'], 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', ['catorze', 'quatorze'], 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var PT_TENS = { 2: 'vinte', 3: 'trinta', 4: 'quarenta', 5: 'cinquenta', 6: 'sessenta', 7: 'setenta', 8: 'oitenta', 9: 'noventa' };
  function ptNumero(n) {
    if (!Number.isInteger(n) || n < 0 || n > 100) return null;
    var lista = function (x) { return Array.isArray(x) ? x.slice() : [x]; };
    if (n < 20) return lista(PT_UNITS[n]);
    if (n === 100) return ['cem'];
    var t = Math.floor(n / 10), u = n % 10;
    if (u === 0) return [PT_TENS[t]];
    return lista(PT_UNITS[u]).map(function (w) { return PT_TENS[t] + ' e ' + w; });
  }

  // Contrações de preposição (de, em, por) com artigo, pronome e demonstrativo. A crase (à, às, àquele)
  // fica FORA de propósito: "à" x "a" é diferença de acento (o ditado já trata como erro leve de acento,
  // com a explicação do grupo a/à/há), e a forma sem acento colidiria com a preposição "a".
  var PT_CONTRACOES = {};
  [['de', ['o', 'a', 'os', 'as', 'um', 'uma', 'ele', 'ela', 'eles', 'elas', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo', 'aqui', 'ali']],
   ['em', ['o', 'a', 'os', 'as', 'um', 'uma', 'ele', 'ela', 'eles', 'elas', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo']],
   ['por', ['o', 'a', 'os', 'as']]
  ].forEach(function (par) {
    var prep = par[0];
    par[1].forEach(function (w) {
      // de + o = do, de + um = dum, de + isso = disso, de + aqui = daqui; em + o = no, em + isto = nisto;
      // por + o = pelo. O "e" de "de"/"em" cai e o "por" vira "pel".
      PT_CONTRACOES[(prep === 'de' ? 'd' : prep === 'em' ? 'n' : 'pel') + w] = [prep, w];
    });
  });
  var pt = {
    id: 'pt',
    ligaduras: [],
    ligadurasNaAcentuacao: false,
    hifen: true,                        // guarda-chuva, segunda-feira, ênclise (chame-me)
    apostrofo: true,                    // raro, mas existe: copo d'água, Sant'Ana, pau-d'alho
    elisao: false,                      // não há "j' ai": não junta apóstrofo + espaço
    // Artigos que caem do termo do vocabulário para destacar o substantivo nas falas do diálogo ("o irmão" -> "irmão").
    artigos: ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas'],
    // Exercícios de digitar: falta de acento = Quase (decisão da dona, 2026-10-15), não certo nem erro total,
    // porque avô/avó, pais/país, esta/está são palavras diferentes.
    acentoNaDigitacao: 'quase',
    gruposDeAcentos: [
      ['á', 'à', 'â', 'ã'],
      ['ç'],
      ['é', 'ê'],
      ['í'],
      ['ó', 'ô', 'õ'],
      ['ú'],
    ],
    // Nomes para quem fala inglês (o /pt só tem site em inglês). Grave no "a" = crase.
    nomesDasMarcas: { agudo: 'acute accent', 'grave:a': 'crase (à)', grave: 'grave accent', circunflexo: 'circumflex', til: 'tilde', cedilha: 'cedilla', trema: 'diaeresis' },
    pontuacaoDitadoRe: /[.,!?;:"()«»…—–“”]/g,
    pontuacaoFalada: [
      [/ponto\s+de\s+interroga[çc][ãa]o/giu, '?', 'ponto de interrogação'],
      [/ponto\s+de\s+exclama[çc][ãa]o/giu, '!', 'ponto de exclamação'],
      [/ponto\s+e\s+v[íi]rgula/giu, ';', 'ponto e vírgula'],
      [/dois\s+pontos/giu, ':', 'dois pontos'],
      [/(?<!\p{L})v[íi]rgula(?!\p{L})/giu, ',', 'vírgula'],
      [/ponto\s+final/giu, '.', 'ponto final'],
      [/(?<!\p{L})ponto(?!\p{L})/giu, '.', 'ponto']
    ],
    numeroPorExtenso: ptNumero,
    digitosDoTextoFicam: true,          // "Está fazendo 30 graus": "30" digitado vale como "30"

    contracoes: PT_CONTRACOES,
    // Acentos que a Reforma Ortográfica (em vigor no Brasil desde 2009, obrigatória desde 2016) tirou.
    // Chave = forma antiga que a aluna pode digitar; valor = forma de hoje.
    acentosAbolidos: {
      'pára': 'para', 'pêlo': 'pelo', 'pólo': 'polo', 'pêra': 'pera',
      'vôo': 'voo', 'enjôo': 'enjoo', 'abençôo': 'abençoo',
      'lêem': 'leem', 'vêem': 'veem', 'crêem': 'creem', 'dêem': 'deem',
      'idéia': 'ideia', 'assembléia': 'assembleia', 'européia': 'europeia', 'geléia': 'geleia',
      'jóia': 'joia', 'bóia': 'boia', 'heróico': 'heroico', 'paranóico': 'paranoico', 'jibóia': 'jiboia',
      'feiúra': 'feiura', 'baiúca': 'baiuca',
      'lingüiça': 'linguiça', 'freqüente': 'frequente', 'tranqüilo': 'tranquilo', 'cinqüenta': 'cinquenta',
      'agüentar': 'aguentar', 'conseqüência': 'consequência', 'bilíngüe': 'bilíngue', 'pingüim': 'pinguim'
    },
    // Pares em que SÓ o acento muda o sentido (para a decisão "acento conta ou não" nos exercícios de digitar).
    paresDeAcento: [
      ['avó', 'avô'], ['pais', 'país'], ['e', 'é'], ['esta', 'está'], ['por', 'pôr'], ['pode', 'pôde'],
      ['tem', 'têm'], ['vem', 'vêm'], ['da', 'dá'], ['nos', 'nós'], ['secretaria', 'secretária'],
      ['sabia', 'sábia', 'sabiá'], ['publico', 'público'], ['a', 'à']
    ],
    homofonos: [
      { words: ['a', 'à', 'há'], note: '“a” is “the” (feminine) or “to”; “à” is a + a joined (vou à praia, “I’m going to the beach”); “há” is the verb haver, “there is/are” or “ago” (há dois anos, “two years ago”).' },
      { words: ['mas', 'mais'], note: '“mas” means “but”; “mais” means “more”. In Brazil they often sound the same.' },
      { words: ['e', 'é'], note: '“e” means “and”; “é” means “is” (ele é, “he is”).' },
      { words: ['esta', 'está'], note: '“esta” means “this” (esta casa); “está” means “is” (ela está aqui). The accent also moves the stress: ESta x esTÁ.' },
      { words: ['por', 'pôr'], note: '“por” means “by/for/through”; “pôr” means “to put”.' },
      { words: ['pode', 'pôde'], note: '“pode” is present (ele pode, “he can”); “pôde” is past (ele pôde, “he could, he was able to”).' },
      { words: ['tem', 'têm'], note: '“tem” is “he/she has” (ele tem); “têm” is “they have” (eles têm). Same sound.' },
      { words: ['vem', 'vêm'], note: '“vem” is “he/she comes” (ela vem); “vêm” is “they come” (elas vêm). Same sound.' },
      { words: ['mal', 'mau'], note: '“mal” means “badly” (the opposite of bem); “mau” means “bad” (the opposite of bom). In Brazil they sound the same.' },
      { words: ['cem', 'sem'], note: '“cem” means “one hundred”; “sem” means “without”.' },
      { words: ['nos', 'nós'], note: '“nós” means “we”; “nos” means “us” (ele nos viu) or em + os (nos livros).' },
      { words: ['da', 'dá'], note: '“da” is de + a (a casa da Ana); “dá” means “gives” (ele dá).' },
      { words: ['avó', 'avô'], note: '“avó” is “grandmother”; “avô” is “grandfather”.' },
      { words: ['pais', 'país'], note: '“pais” means “parents”; “país” means “country”.' },
      { words: ['cesta', 'sexta'], note: '“sexta” is “Friday” (sexta-feira) or “sixth”; “cesta” means “basket”. Same sound in most of Brazil.' },
      { words: ['concerto', 'conserto'], note: '“concerto” is a “concert”; “conserto” is a “repair”.' },
      { words: ['acento', 'assento'], note: '“acento” is an “accent mark”; “assento” is a “seat”.' }
    ],
    // Concordância do português: plural (+s, +es, -ão -> -ões/-ães/-ãos) e gênero/pessoa trocando o -o
    // final pelo -a (obrigado/obrigada, falo/fala, bonitos/bonitas), mais -or -> -ora (professor/professora).
    // Devolve { alvo, digitado } com as terminações, ou null.
    concordancia: function (r, u) {
      if (!/^\p{L}+$/u.test(r) || !/^\p{L}+$/u.test(u)) return null;
      var fim = function (w, n) { return '-' + w.slice(w.length - n); };
      var shorter = r.length <= u.length ? r : u, longer = r.length <= u.length ? u : r;
      if (shorter.length >= 3 && longer.startsWith(shorter)) {
        var suf = longer.slice(shorter.length);
        if (suf === 's' || suf === 'es' || (suf === 'a' && /or$/.test(shorter)))
          return { alvo: r === longer ? '-' + suf : '—', digitado: u === longer ? '-' + suf : '—' };
      }
      // -ão -> -ões / -ães / -ãos
      var ao = /ão$/, pl = /(ões|ães|ãos)$/;
      if ((ao.test(r) && pl.test(u) && r.slice(0, -2) === u.slice(0, -3)) || (ao.test(u) && pl.test(r) && u.slice(0, -2) === r.slice(0, -3)))
        return { alvo: fim(r, ao.test(r) ? 2 : 3), digitado: fim(u, ao.test(u) ? 2 : 3) };
      // -o x -a (e -os x -as) no fim, mesmo radical de 2+ letras
      var m1 = r.match(/^(\p{L}{2,})(o|a)(s?)$/u), m2 = u.match(/^(\p{L}{2,})(o|a)(s?)$/u);
      if (m1 && m2 && m1[1] === m2[1] && m1[3] === m2[3] && m1[2] !== m2[2])
        return { alvo: '-' + m1[2] + m1[3], digitado: '-' + m2[2] + m2[3] };
      return null;
    },
    textos: {
      homofono: function (shown, typed, note) { return '“' + shown + '” (you wrote “' + typed + '”): words that are easy to mix up. ' + note; },
      concordancia: function (shown, typed, d) { return '“' + shown + '” (you wrote “' + typed + '”): only the ending is different (' + d.alvo + ' x ' + d.digitado + '). If the word agrees with another one, check gender, number or the verb form; otherwise it may just be a typo.'; },
      contracao: function (shown, typed, partes) { return '“' + shown + '” is one word: ' + partes[0] + ' + ' + partes[1] + ' = ' + shown + ' (you wrote “' + typed + '”).'; },
      reforma: function (shown, typed) { return '“' + shown + '” (you wrote “' + typed + '”): this accent was dropped in the 2009 spelling reform.'; },
      reformaCurta: function () { return 'This accent was dropped in the 2009 spelling reform.'; },
      outro: function (shown, typed) { return '“' + shown + '”: not the expected word (you wrote “' + typed + '”).'; },
      leve: {
        hyphen: function (core, typed) { return '“' + core + '” has a hyphen (you wrote “' + typed + '”).'; },
        apostrophe: function (core, typed) { return '“' + core + '” has an apostrophe (you wrote “' + typed + '”).'; },
        accent: function (core, typed) { return '“' + core + '”: check the accents (you wrote “' + typed + '”).'; },
        spelling: function (core, typed) { return '“' + core + '”: small spelling difference (you wrote “' + typed + '”).'; },
        // Dois erros leves na mesma palavra (ex.: "guarda chuva" sem hífen E "ate" sem acento juntos): cita os dois.
        multiple: function (core, typed, reasons) {
          var nomes = { hyphen: 'the hyphen', apostrophe: 'the apostrophe', accent: 'the accents', ligature: 'the ligature' };
          var p = reasons.map(function (r) { return nomes[r] || r; });
          var lista = p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0];
          return '“' + core + '”: check ' + lista + ' (you wrote “' + typed + '”).';
        },
        contraction: function (core, typed, sentido, C) {
          var p = C[core.toLowerCase()];
          if (sentido === 'separou' && p) return '“' + core + '” is one word: ' + p[0] + ' + ' + p[1] + ' = ' + core.toLowerCase() + ' (you wrote “' + typed + '”).';
          return 'Here the text keeps “' + core + '” as a separate word (you wrote “' + typed + '”).';
        }
      }
    }
  };

  var api = { pt: pt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FamiliaLatinaIdiomas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
