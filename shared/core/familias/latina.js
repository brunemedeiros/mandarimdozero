// Família latina (fr hoje; pt depois): regras de acento, comparação tolerante a acento, correção de ditado
// e teclado de acentos, em funções PURAS (sem DOM, sem STATE, sem t()). O que muda de um idioma para outro
// vem num objeto de configuração (ver shared/core/familias/latina-idiomas.js).
//
// FASE 2 (docs/i18n/familia-latina-modulo.md): carregado pelo fr/index.html antes do app.js; as funções de
// acento do fr/app.js viraram repasses para cá, com a configuração do francês em fr/lang-hooks.js
// (LANG_HOOKS.familiaLatina). tests/familia-latina/test_paridade_fr.js compara com o fr/app.js ANTIGO
// (commit de referência) e só aceita as diferenças autorizadas pela dona.
//
// Uso no Node:   const FL = require('shared/core/familias/latina.js');
//                const fr = FL.criar(require('shared/core/familias/latina-idiomas.js').fr);
// Uso na página: window.FamiliaLatina (um único nome global, para não colidir com as funções do app.js).
(function (root) {
  'use strict';

  // Marcas que o NFD separa da letra: agudo, grave, circunflexo, til, trema, cedilha...
  var MARCAS_RE = /[̀-ͯ]/g;
  var NOME_DA_MARCA = {
    '́': 'agudo', '̀': 'grave', '̂': 'circunflexo', '̃': 'til',
    '̈': 'trema', '̧': 'cedilha', '̌': 'caron', '̆': 'breve', '̊': 'anel'
  };

  // ---------------------------------------------------------------- comparação básica

  // Tira só os diacríticos (ç -> c, ã -> a, é -> e). NÃO mexe em ligaduras (œ fica œ: o NFD não a separa).
  function semAcento(s) {
    return String(s).normalize('NFD').replace(MARCAS_RE, '');
  }

  // = normalizeLoose do fr/app.js: sem acento, minúsculas, sem espaço nas pontas.
  // Sem String(): como o normalizeLoose original, só aceita texto (null/undefined lançam erro do mesmo jeito).
  function normalizarFrouxo(str) {
    return str.normalize('NFD').replace(MARCAS_RE, '').toLowerCase().trim();
  }

  // = conjFold do fr/app.js (busca de verbos): igual ao frouxo, mas aceita null/undefined.
  function dobrarBusca(s) {
    return String(s || '').normalize('NFD').replace(MARCAS_RE, '').toLowerCase().trim();
  }

  // = acceptedForms (shared/core): "un / une" -> ["un", "une"].
  function formasAceitas(expected) {
    return (expected || '').split('/').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // Nos exercícios de digitar, quem ouve "allemand / allemande" pode digitar as DUAS formas (o texto inteiro,
  // com ou sem espaço em volta da barra) ou só uma: a lista aceita ganha o texto inteiro além de cada forma.
  function formasDigitaveis(expected) {
    var forms = formasAceitas(expected);
    if (forms.length < 2) return forms;
    var inteiro = String(expected).trim();
    return forms.concat(forms.join(' / ')).concat(inteiro && inteiro !== forms.join(' / ') ? [inteiro] : []);
  }
  function juntarBarra(s) {
    return String(s).replace(/\s*\/\s*/g, ' / ');
  }
  // O que a pessoa digitou, como a comparação deve tentar: a barra com espaço padronizado e, quando o cartão tem
  // duas formas, também a vírgula lida como barra ("allemand, allemande"). A ordem trocada NÃO vale.
  function variantesDigitadas(typed, expected) {
    var v = [String(typed), juntarBarra(typed)];
    if (formasAceitas(expected).length > 1 && String(typed).indexOf(',') !== -1) v.push(juntarBarra(String(typed).replace(/,/g, ' / ')));
    return v.filter(function (x, i) { return v.indexOf(x) === i; });
  }

  // Pontuação ignorada nos exercícios de digitar. O fr usa DUAS listas hoje (achado: o "Digite o que
  // ouviu" de vocabulário ignora o apóstrofo curvo ’, a lacuna digitada não). Mantidas iguais para a paridade.
  var PONTUACAO_VOCAB_RE = /[.,!?;:'"’]/g;
  var PONTUACAO_LACUNA_RE = /[.,!?;:'"]/g;

  // Exercício de digitar da trilha (vocabulário de ouvido, lacuna digitada): certo/errado, acento NÃO conta.
  // = a seta `strip` + `acceptedForms(...).some(...)` do fr/app.js.
  function respostaDigitadaCerta(typed, expected, pontuacaoRe) {
    var re = pontuacaoRe || PONTUACAO_VOCAB_RE;
    var strip = function (s) { return normalizarFrouxo(s).replace(re, '').trim(); };
    var ts = variantesDigitadas(typed, expected).map(strip);
    return formasDigitaveis(expected).some(function (form) { return ts.indexOf(strip(form)) !== -1; });
  }

  // Versão em 3 níveis dos exercícios de digitar: 'ok' | 'quase' | 'errou'.
  //  - acento 'tolerante' (fr, decisão de 2026-09-16): acento não conta; 'ok' exatamente quando a
  //    respostaDigitadaCerta de sempre diria certo (mesma comparação, sem mudar nada).
  //  - acento 'quase' (pt, decisão da dona de 2026-10-15: avó/avô, pais/país são palavras diferentes):
  //    'ok' = igual (só maiúscula/pontuação diferem); 'quase' = só acento/cedilha/til; 'errou'.
  //  - ligaduras (opcional, fr: [['œ','oe'],['æ','ae']]): "soeur" por "sœur" = 'quase' (decisão de 2026-10-15).
  function avaliarUmaDigitada(typed, expected, opcoes) {
    var o = opcoes || {};
    var re = o.pontuacaoRe || PONTUACAO_VOCAB_RE;
    var estrito = function (s) { return String(s).normalize('NFC').toLowerCase().replace(re, '').trim(); };
    var frouxo = function (s) { return normalizarFrouxo(s).replace(re, '').trim(); };
    var forms = formasDigitaveis(expected);
    if (o.acento === 'tolerante') {
      var tf = frouxo(typed);
      if (forms.some(function (f) { return frouxo(f) === tf; })) return 'ok';
    } else {
      var t = estrito(typed);
      if (!t) return 'errou';
      if (forms.some(function (f) { return estrito(f) === t; })) return 'ok';
      if (forms.some(function (f) { return frouxo(f) === frouxo(typed); })) return 'quase';
    }
    if (o.ligaduras && o.ligaduras.length) {
      var lig = function (s) { var x = frouxo(s); o.ligaduras.forEach(function (p) { x = x.split(p[0]).join(p[1]); }); return x; };
      var tl = lig(typed);
      if (tl && forms.some(function (f) { return lig(f) === tl; })) return 'quase';
    }
    return 'errou';
  }

  // 'ok' > 'quase' > 'errou' entre as leituras possíveis do que foi digitado (barra, vírgula).
  function avaliarRespostaDigitada(typed, expected, opcoes) {
    var rank = { ok: 2, quase: 1, errou: 0 }, melhor = 'errou';
    variantesDigitadas(typed, expected).forEach(function (v) {
      var r = avaliarUmaDigitada(v, expected, opcoes);
      if (rank[r] > rank[melhor]) melhor = r;
    });
    return melhor;
  }

  // Exercício de gramática com resposta digitada (números por extenso etc.): hífen, espaço e apóstrofo
  // são o mesmo separador. 'ok' = exato; 'almost' = só acento; 'wrong'. = canonSep/looseSep do fr/app.js.
  function avaliarComSeparadores(given, forms, cfg) {
    var sep = (cfg && cfg.apostrofo === false) ? /[\s\-‐‑–]+/g : /[\s\-‐‑–']+/g;
    var canonSep = function (s) { return s.normalize('NFC').toLowerCase().trim().replace(sep, ' '); };
    var looseSep = function (s) { return normalizarFrouxo(s).replace(sep, ' '); };
    if (forms.some(function (f) { return canonSep(given) === canonSep(f); })) return 'ok';
    if (forms.some(function (f) { return looseSep(given) === looseSep(f); })) return 'almost';
    return 'wrong';
  }

  // ---------------------------------------------------------------- desafio "Acentuação" (acento EXIGIDO)

  function normalizarParaAcentuacao(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  // Alvo com duas formas ("un / une"): vale uma forma só ou o texto inteiro (barra com ou sem espaço, vírgula),
  // sempre com o acento exigido. Alvo de uma forma só: igual a antes.
  function acentuacaoCerta(studentAnswer, targetText) {
    var alvos = formasDigitaveis(targetText);
    if (alvos.length < 2) return normalizarParaAcentuacao(studentAnswer) === normalizarParaAcentuacao(targetText);
    return variantesDigitadas(studentAnswer, targetText).some(function (v) {
      return alvos.some(function (a) { return normalizarParaAcentuacao(v) === normalizarParaAcentuacao(a); });
    });
  }
  function semAcentoParaAcentuacao(s, ligaduras) {
    var out = normalizarParaAcentuacao(s).normalize('NFD').replace(MARCAS_RE, '');
    (ligaduras || []).forEach(function (par) { out = out.split(par[0]).join(par[1]); });
    return out;
  }
  // 'ok' | 'partial' (só acento/cedilha/til/trema) | 'fail'. `ligaduras` (opcional) faz "oe" por "œ"
  // contar como 'partial'; o fr de hoje NÃO passa ligaduras (achado: "soeur" por "sœur" dá 'fail').
  function resultadoAcentuacao(studentAnswer, targetText, ligaduras) {
    if (acentuacaoCerta(studentAnswer, targetText)) return 'ok';
    var alvos = formasDigitaveis(targetText);
    if (alvos.length < 2) alvos = [targetText];
    var vars = alvos.length > 1 ? variantesDigitadas(studentAnswer, targetText) : [studentAnswer];
    for (var i = 0; i < vars.length; i++) {
      var typed = semAcentoParaAcentuacao(vars[i], ligaduras);
      for (var j = 0; j < alvos.length; j++) {
        if (typed && typed === semAcentoParaAcentuacao(alvos[j], ligaduras)) return 'partial';
      }
    }
    return 'fail';
  }

  // Que acento faltou, sobrou ou foi trocado, letra por letra. Só responde quando as LETRAS são as mesmas
  // (senão devolve null: é erro de grafia, não de acento). [] = nenhuma diferença.
  // Cada item: { posicao, letra, digitada, tipo: 'faltou'|'sobrou'|'trocado', marca, marcaDigitada }.
  function tiposDeErroDeAcento(alvo, digitado) {
    var a = Array.from(String(alvo || '').normalize('NFC').toLowerCase().trim());
    var d = Array.from(String(digitado || '').normalize('NFC').toLowerCase().trim());
    if (a.length !== d.length) return null;
    var out = [];
    for (var i = 0; i < a.length; i++) {
      if (a[i] === d[i]) continue;
      var da = a[i].normalize('NFD'), dd = d[i].normalize('NFD');
      if (da.replace(MARCAS_RE, '') !== dd.replace(MARCAS_RE, '')) return null;
      var ma = (da.match(MARCAS_RE) || []).map(function (m) { return NOME_DA_MARCA[m] || 'outra'; }).join('+');
      var md = (dd.match(MARCAS_RE) || []).map(function (m) { return NOME_DA_MARCA[m] || 'outra'; }).join('+');
      out.push({
        posicao: i, letra: a[i], digitada: d[i],
        tipo: !md ? 'faltou' : !ma ? 'sobrou' : 'trocado',
        marca: ma || null, marcaDigitada: md || null
      });
    }
    return out;
  }

  // Nome que a aluna conhece para a marca naquele idioma (pt: grave no "a" = crase).
  function nomeDaMarca(marca, letra, cfg) {
    var nomes = (cfg && cfg.nomesDasMarcas) || {};
    var base = String(letra || '').normalize('NFD').replace(MARCAS_RE, '');
    return nomes[marca + ':' + base] || nomes[marca] || marca;
  }

  // ---------------------------------------------------------------- alinhamento letra a letra (conjugação)

  // = conjAlign do fr/app.js (distância de edição + operações, para marcar as letras erradas).
  function alinharLetras(a, b) {
    var A = Array.from(a || ''), B = Array.from(b || '');
    var la = A.map(function (c) { return c.toLowerCase(); }), lb = B.map(function (c) { return c.toLowerCase(); });
    var n = A.length, m = B.length, d = [];
    for (var x0 = 0; x0 <= n; x0++) d.push(new Array(m + 1).fill(0));
    for (var x = 0; x <= n; x++) d[x][0] = x;
    for (var y = 0; y <= m; y++) d[0][y] = y;
    for (x = 1; x <= n; x++) for (y = 1; y <= m; y++)
      d[x][y] = Math.min(d[x - 1][y - 1] + (la[x - 1] === lb[y - 1] ? 0 : 1), d[x - 1][y] + 1, d[x][y - 1] + 1);
    var ops = [];
    x = n; y = m;
    while (x > 0 || y > 0) {
      if (x > 0 && y > 0 && d[x][y] === d[x - 1][y - 1] + (la[x - 1] === lb[y - 1] ? 0 : 1)) {
        ops.push({ t: la[x - 1] === lb[y - 1] ? 'same' : 'sub', a: A[x - 1] }); x--; y--;
      } else if (x > 0 && d[x][y] === d[x - 1][y] + 1) {
        ops.push({ t: 'extra', a: A[x - 1] }); x--;
      } else {
        ops.push({ t: 'missing' }); y--;
      }
    }
    return { ops: ops.reverse(), cost: d[n][m] };
  }

  // ---------------------------------------------------------------- teclado de acentos (sem DOM)

  // Mesma marcação do frAccentPickerHTML (as classes vêm de fora: o fr usa fr-accent-*).
  function htmlTecladoDeAcentos(grupos, classes) {
    var c = classes || { picker: 'fr-accent-picker', group: 'fr-accent-group', key: 'fr-accent-key' };
    return '<div class="' + c.picker + '">' + grupos.map(function (group) {
      return '\n    <div class="' + c.group + '">' + group.map(function (ch) {
        return '<button type="button" class="' + c.key + '">' + ch + '</button>';
      }).join('') + '</div>\n  ';
    }).join('') + '</div>';
  }

  // O que o clique numa tecla faz no campo: insere no cursor (ou troca a seleção). Puro: devolve o texto
  // novo e onde o cursor fica. start/end null = fim do texto (como o `?? value.length` do fr).
  function inserirNoCursor(value, start, end, ch) {
    var v = String(value || '');
    var s = start == null ? v.length : start;
    var e = end == null ? v.length : end;
    return { value: v.slice(0, s) + ch + v.slice(e), cursor: s + ch.length };
  }

  // ---------------------------------------------------------------- ditado (depende do idioma: criar(cfg))

  function criar(cfg) {
    var LIG = cfg.ligaduras || [];
    var PONT_DITADO = cfg.pontuacaoDitadoRe || /[.,!?;:"()«»…—–]/g;
    var SEPARADORES_FROUXOS = new RegExp('[' + (cfg.apostrofo ? "'" : '') + (cfg.hifen ? '\\-' : '') + ']', 'g');
    var CONTRACOES = cfg.contracoes || {};          // { da: ['de', 'a'], ... }
    var temContracoes = Object.keys(CONTRACOES).length > 0;
    var EXPANSAO = {};                              // 'de a' -> 'da'
    Object.keys(CONTRACOES).forEach(function (c) { EXPANSAO[CONTRACOES[c].join(' ')] = c; });

    function tiraLigaduras(s) { LIG.forEach(function (p) { s = s.split(p[0]).join(p[1]); }); return s; }

    // ESTRITA (= normalizeDictationWord): acento, hífen e apóstrofo contam.
    function normalizarPalavraDitado(w) {
      return w
        .toLowerCase()
        .normalize('NFC')
        .replace(/[‘’ʼ´`′]/g, "'")
        .replace(/[‐‑‒]/g, '-')
        .replace(PONT_DITADO, '');
    }
    // FROUXA (= dictLooseNorm): sem acento, sem ligadura, sem hífen/apóstrofo (só os que o idioma tem).
    function palavraFrouxaDitado(w) {
      var s = normalizarPalavraDitado(w).normalize('NFD').replace(MARCAS_RE, '');
      s = tiraLigaduras(s);
      return cfg.hifen || cfg.apostrofo ? s.replace(SEPARADORES_FROUXOS, '') : s;
    }
    // Por que duas palavras que alinham pela forma frouxa diferem na estrita (= dictLightReason).
    // Um motivo só: 'hyphen' | 'apostrophe' | 'ligature' | 'accent'. Dois ou mais na mesma palavra
    // ("peut etre" por "peut-être": sem hífen E sem acento): 'multiple', com a lista em motivosCombinados
    // (antes caía em 'spelling'; decisão da dona, 2026-10-15). Nenhuma combinação explica: 'spelling'.
    var TIRA = {
      hyphen: function (s) { return s.replace(/-/g, ''); },
      apostrophe: function (s) { return s.replace(/'/g, ''); },
      ligature: function (s) { return tiraLigaduras(s); },
      accent: function (s) { return s.normalize('NFD').replace(MARCAS_RE, ''); }
    };
    var MOTIVOS = ['hyphen', 'apostrophe', 'ligature', 'accent'].filter(function (m) {
      return m === 'hyphen' ? cfg.hifen : m === 'apostrophe' ? cfg.apostrofo : m === 'ligature' ? LIG.length > 0 : true;
    });
    function motivoErroLeve(cs, us) {
      for (var i = 0; i < MOTIVOS.length; i++) if (TIRA[MOTIVOS[i]](cs) === TIRA[MOTIVOS[i]](us)) return MOTIVOS[i];
      return motivosCombinados(cs, us) ? 'multiple' : 'spelling';
    }
    // A menor combinação de 2+ motivos que explica a diferença (na ordem de MOTIVOS), ou null.
    function motivosCombinados(cs, us) {
      var n = MOTIVOS.length;
      for (var tam = 2; tam <= n; tam++) {
        for (var mask = 0; mask < (1 << n); mask++) {
          var lista = MOTIVOS.filter(function (_, k) { return mask & (1 << k); });
          if (lista.length !== tam) continue;
          var aplica = function (s) { lista.forEach(function (m) { s = TIRA[m](s); }); return s; };
          if (aplica(cs) === aplica(us)) return lista;
        }
      }
      return null;
    }

    // Número por extenso: o idioma devolve uma forma, uma lista (pt: "um"/"uma") ou null.
    function numeroPorExtenso(n, refLoose) {
      var r = cfg.numeroPorExtenso ? cfg.numeroPorExtenso(n) : null;
      if (!r) return null;
      if (!Array.isArray(r)) return r;
      var alvo = ' ' + refLoose + ' ';
      for (var i = 0; i < r.length; i++) {
        var cand = r[i].split(/\s+/).map(palavraFrouxaDitado).join(' ');
        if (alvo.indexOf(' ' + cand + ' ') >= 0) return r[i];
      }
      return r[0];
    }

    // = prepareDictationUserText: limpa o que o teclado do celular bagunça, troca a pontuação ditada
    // por extenso pelo sinal e número em dígito pela palavra.
    function prepararTextoDitado(text, refText) {
      var t = String(text || '')
        .replace(/[​-‍⁠﻿]/g, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .replace(/[‘’ʼ´`′]/g, "'")
        .replace(/[‐‑‒]/g, '-');
      if (cfg.elisao) t = t.replace(/'\s+(?=\p{L})/gu, "'");          // "j' ai" -> "j'ai"
      t = t.replace(/(\p{L})([.!?;,])(?=\p{L})/gu, '$1$2 ');            // "Sophie.J'ai" -> "Sophie. J'ai"
      var refLower = String(refText || '').toLowerCase();
      var spokenPunct = [];
      (cfg.pontuacaoFalada || []).forEach(function (item) {
        var re = item[0], symbol = item[1], said = item[2];
        if (new RegExp(said.replace(/[-\s']+/g, '[-\\s\']+'), 'i').test(refLower)) return;
        t = t.replace(re, function () { spokenPunct.push({ said: said, symbol: symbol }); return ' ' + symbol + ' '; });
      });
      var digitNotes = [];
      var refLoose = null;
      t = t.replace(/(^|[\s(«"])(\d{1,3})(?=$|[\s.,!?;:)»"])/g, function (m, pre, digits) {
        // Opção (pt liga; o fr de hoje não tem): se o PRÓPRIO texto escreve o número em dígitos, o dígito
        // da aluna fica como está. Sem isso, "30" digitado contra um texto com "30" vira "trinta" e conta
        // como erro (achado: vale para o fr também, hoje latente porque nenhum ditado do fr tem dígito).
        if (cfg.digitosDoTextoFicam && new RegExp('(^|[\\s(«"])' + digits + '(?=$|[\\s.,!?;:)»"])').test(String(refText || ''))) return m;
        if (refLoose === null) refLoose = tokenizarDitado(String(refText || '')).looseWords.join(' ');
        var words = numeroPorExtenso(parseInt(digits, 10), refLoose);
        if (!words) return m;
        digitNotes.push({ digits: digits, words: words });
        return pre + words;
      });
      return { text: t, spokenPunct: spokenPunct, digitNotes: digitNotes };
    }

    // = tokenizeDictationText: palavras de verdade x pontuação solta (anexada à palavra anterior).
    function tokenizarDitado(text) {
      var rawWords = text.trim().split(/\s+/).filter(function (w) { return w.length; });
      var words = [], strictWords = [], looseWords = [], punctAfter = [];
      rawWords.forEach(function (w) {
        var loose = palavraFrouxaDitado(w);
        if (loose === '') {
          if (words.length > 0) {
            punctAfter[words.length - 1] = (punctAfter[words.length - 1] ? punctAfter[words.length - 1] + ' ' : '') + w;
          }
          return;
        }
        words.push(w);
        strictWords.push(normalizarPalavraDitado(w));
        looseWords.push(loose);
        punctAfter.push('');
      });
      return { words: words, strictWords: strictWords, looseWords: looseWords, normWords: looseWords, punctAfter: punctAfter };
    }

    // = mergeSplitCompoundWords: "vingt cinq" / "guarda chuva" viram uma palavra só (erro leve de hífen).
    function juntarCompostos(userTok, refTok) {
      var targets = new Set();
      refTok.words.forEach(function (w, i) { if (refTok.strictWords[i].includes('-')) targets.add(refTok.looseWords[i]); });
      if (!targets.size) return userTok;
      var out = { words: [], strictWords: [], looseWords: [], punctAfter: [] };
      var i = 0;
      while (i < userTok.words.length) {
        var merged = false;
        for (var k = 4; k >= 2 && !merged; k--) {
          if (i + k > userTok.words.length) continue;
          if (!targets.has(userTok.looseWords.slice(i, i + k).join(''))) continue;
          var ok = true;
          for (var t = i; t < i + k - 1; t++) if (userTok.punctAfter[t]) ok = false;
          if (!ok) continue;
          out.words.push(userTok.words.slice(i, i + k).join(''));
          out.strictWords.push(userTok.strictWords.slice(i, i + k).join(''));
          out.looseWords.push(userTok.looseWords.slice(i, i + k).join(''));
          out.punctAfter.push(userTok.punctAfter[i + k - 1]);
          i += k; merged = true;
        }
        if (merged) continue;
        out.words.push(userTok.words[i]); out.strictWords.push(userTok.strictWords[i]);
        out.looseWords.push(userTok.looseWords[i]); out.punctAfter.push(userTok.punctAfter[i]);
        i++;
      }
      out.normWords = out.looseWords;
      return out;
    }

    // Contrações (só para o idioma que declara `contracoes`; o fr de hoje não declara).
    //  - a aluna separou ("de a" onde o texto tem "da"): junta numa palavra, erro leve 'contraction'.
    //  - a aluna juntou ("da" onde o texto tem "de a", ex.: "antes de a aula começar"): divide em duas,
    //    cada uma erro leve 'contraction'.
    // Só age quando o texto NÃO tem o mesmo par/palavra naquela forma (não inventa erro).
    function juntarContracoes(userTok, refTok) {
      if (!temContracoes) return userTok;
      var refLoose = refTok.looseWords;
      var refSet = new Set(refLoose);
      var refPairs = new Set();
      for (var r = 0; r + 1 < refLoose.length; r++) refPairs.add(refLoose[r] + ' ' + refLoose[r + 1]);
      var looseC = {};       // forma frouxa da contração -> forma frouxa da expansão
      Object.keys(CONTRACOES).forEach(function (c) {
        looseC[palavraFrouxaDitado(c)] = CONTRACOES[c].map(palavraFrouxaDitado).join(' ');
      });
      var looseE = {};
      Object.keys(looseC).forEach(function (c) { looseE[looseC[c]] = c; });
      var out = { words: [], strictWords: [], looseWords: [], punctAfter: [], contracao: [] };
      var push = function (w, s, l, p, f) { out.words.push(w); out.strictWords.push(s); out.looseWords.push(l); out.punctAfter.push(p); out.contracao.push(f); };
      var i = 0;
      while (i < userTok.words.length) {
        var lw = userTok.looseWords[i];
        if (i + 1 < userTok.words.length && !userTok.punctAfter[i]) {
          var par = lw + ' ' + userTok.looseWords[i + 1];
          var c = looseE[par];
          if (c && refSet.has(c) && !refPairs.has(par)) {
            push(userTok.words[i] + ' ' + userTok.words[i + 1], userTok.strictWords[i] + ' ' + userTok.strictWords[i + 1], c, userTok.punctAfter[i + 1], 'separou');
            i += 2; continue;
          }
        }
        var exp = looseC[lw];
        if (exp && refPairs.has(exp) && !refSet.has(lw)) {
          var partes = exp.split(' ');
          push(userTok.words[i], userTok.strictWords[i], partes[0], '', 'juntou');
          push(userTok.words[i], userTok.strictWords[i], partes[1], userTok.punctAfter[i], 'juntou');
          i++; continue;
        }
        push(userTok.words[i], userTok.strictWords[i], lw, userTok.punctAfter[i], null);
        i++;
      }
      out.normWords = out.looseWords;
      return out;
    }

    var MARKS_RE = /[.,!?;:…]/g;
    function marcasDe(s) { return ((s || '').match(MARKS_RE) || []).join(''); }

    // = diffDictationWords: alinha por LCS (como um diff de texto) usando a forma frouxa.
    function diffDitado(correctText, userText) {
      var correctTok = tokenizarDitado(correctText);
      var userTok = juntarContracoes(juntarCompostos(tokenizarDitado(userText), correctTok), correctTok);
      var cn = correctTok.looseWords, un = userTok.looseWords;
      var n = cn.length, m = un.length;
      var dp = [];
      for (var a = 0; a <= n; a++) dp.push(new Array(m + 1).fill(0));
      for (var i0 = n - 1; i0 >= 0; i0--) {
        for (var j0 = m - 1; j0 >= 0; j0--) {
          dp[i0][j0] = cn[i0] === un[j0] ? dp[i0 + 1][j0 + 1] + 1 : Math.max(dp[i0 + 1][j0], dp[i0][j0 + 1]);
        }
      }
      var missingMarksFor = function (i, j) {
        var pool = (marcasDe(userTok.words[j]) + marcasDe(userTok.punctAfter[j])).split('');
        var missing = '';
        for (var ch of (marcasDe(correctTok.words[i]) + marcasDe(correctTok.punctAfter[i]))) {
          var at = pool.indexOf(ch);
          if (at >= 0) pool.splice(at, 1); else missing += ch;
        }
        return missing;
      };
      var matchItem = function (i, j) {
        var flag = userTok.contracao ? userTok.contracao[j] : null;
        var light = !!flag || correctTok.strictWords[i] !== userTok.strictWords[j];
        var item = {
          type: 'match', word: correctTok.words[i], punctAfter: correctTok.punctAfter[i],
          light: light, userWord: userTok.words[j],
          reason: flag ? 'contraction' : light ? motivoErroLeve(correctTok.strictWords[i], userTok.strictWords[j]) : null,
          missingMarks: missingMarksFor(i, j)
        };
        if (flag) item.contraction = flag;
        if (item.reason === 'multiple') item.reasons = motivosCombinados(correctTok.strictWords[i], userTok.strictWords[j]);
        return item;
      };
      var i = 0, j = 0;
      var result = [];
      while (i < n && j < m) {
        if (cn[i] === un[j]) { result.push(matchItem(i, j)); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { result.push({ type: 'miss', word: correctTok.words[i], punctAfter: correctTok.punctAfter[i] }); i++; }
        else { result.push({ type: 'extra', word: userTok.words[j] }); j++; }
      }
      while (i < n) { result.push({ type: 'miss', word: correctTok.words[i], punctAfter: correctTok.punctAfter[i] }); i++; }
      while (j < m) { result.push({ type: 'extra', word: userTok.words[j] }); j++; }
      return result;
    }

    // = mergeDictationDiff: "miss" + "extra" vizinhos viram uma troca ("sub").
    function juntarDiff(diff) {
      var merged = [];
      var i = 0;
      while (i < diff.length) {
        var cur = diff[i], next = diff[i + 1];
        if (next && ((cur.type === 'miss' && next.type === 'extra') || (cur.type === 'extra' && next.type === 'miss'))) {
          merged.push({
            type: 'sub',
            wrong: cur.type === 'extra' ? cur.word : next.word,
            correct: cur.type === 'miss' ? cur.word : next.word,
            punctAfter: cur.type === 'miss' ? cur.punctAfter : next.punctAfter
          });
          i += 2;
          continue;
        }
        merged.push(cur);
        i++;
      }
      return merged;
    }

    // = evaluateDictation: nota de 0 a 100 (exata = 1, leve = 0,5, palavra a mais = -0,5).
    function avaliarDitado(refText, userText) {
      var prep = prepararTextoDitado(userText, refText);
      var diff = diffDitado(refText, prep.text);
      var merged = juntarDiff(diff);
      var total = tokenizarDitado(refText).words.length;
      var exact = diff.filter(function (x) { return x.type === 'match' && !x.light; }).length;
      var light = diff.filter(function (x) { return x.type === 'match' && x.light; }).length;
      var extras = merged.filter(function (x) { return x.type === 'extra'; }).length;
      var missingMarks = diff.filter(function (x) { return x.type === 'match' && x.missingMarks; }).length;
      var points = exact + 0.5 * light - 0.5 * extras - 0.5 * prep.spokenPunct.length;
      var score = total > 0 ? Math.max(0, Math.min(100, Math.round((points / total) * 100))) : 0;
      return { merged: merged, total: total, exact: exact, light: light, extras: extras, missingMarks: missingMarks, score: score,
               spokenPunct: prep.spokenPunct, digitNotes: prep.digitNotes };
    }

    function palavraNua(w) {
      return normalizarPalavraDitado(String(w || '')).replace(/[«»"()\[\]]/g, '').trim();
    }

    // = classifyDictationError: { kind, noteText } para uma troca. kind: 'homophone' | 'agreement' |
    // 'contraction' | 'reform' (pt: acento que a Reforma de 2009 tirou) | 'other'. O texto vem de cfg.textos.
    function classificarErroDitado(refWord, userWord) {
      var r = palavraNua(refWord), u = palavraNua(userWord);
      var shown = String(refWord || '').replace(/[.,!?;:…«»"()]+/g, '');
      var typed = String(userWord || '').replace(/[.,!?;:…«»"()]+/g, '');
      var T = cfg.textos;
      if (r && u && r !== u) {
        var g = (cfg.homofonos || []).find(function (gr) { return gr.words.includes(r) && gr.words.includes(u); });
        if (g) return { kind: 'homophone', noteText: T.homofono(shown, typed, g.note), note: g.note };
        if (temContracoes && CONTRACOES[r] && CONTRACOES[r].join(' ') === u)
          return { kind: 'contraction', noteText: T.contracao(shown, typed, CONTRACOES[r]) };
        if (cfg.acentosAbolidos && cfg.acentosAbolidos[u] === r)
          return { kind: 'reform', noteText: T.reforma(shown, typed) };
        var propria = /^\p{Lu}/u.test(String(refWord || '').replace(/^[^\p{L}]+/u, ''));
        var conc = !propria && cfg.concordancia ? cfg.concordancia(r, u) : null;
        if (conc) return { kind: 'agreement', noteText: T.concordancia(shown, typed, conc), detail: conc };
      }
      return { kind: 'other', noteText: T.outro(shown, typed) };
    }

    // = dictationLightNoteText: explicação do erro leve (hífen, apóstrofo, ligadura, acento, contração).
    function textoErroLeve(x) {
      var core = x.word.replace(/[.,!?;:…]+$/, '');
      var typed = x.userWord.replace(/[.,!?;:…]+$/, '');
      var T = cfg.textos;
      var extra = '';
      if (x.reason === 'accent' || (x.reason === 'multiple' && (x.reasons || []).indexOf('accent') >= 0)) {
        var h = classificarErroDitado(x.word, x.userWord);
        if (h.kind === 'homophone') extra = ' ' + h.note;
        else if (h.kind === 'reform') extra = ' ' + T.reformaCurta();
      }
      if (x.reason === 'contraction') return T.leve.contraction(core, typed, x.contraction, CONTRACOES);
      if (x.reason === 'multiple' && x.reasons && T.leve.multiple) return T.leve.multiple(core, typed, x.reasons) + extra;
      var f = T.leve[x.reason] || T.leve.spelling;
      return f(core, typed) + extra;
    }

    return {
      cfg: cfg,
      normalizarPalavraDitado: normalizarPalavraDitado,
      palavraFrouxaDitado: palavraFrouxaDitado,
      motivoErroLeve: motivoErroLeve,
      prepararTextoDitado: prepararTextoDitado,
      tokenizarDitado: tokenizarDitado,
      juntarCompostos: juntarCompostos,
      juntarContracoes: juntarContracoes,
      diffDitado: diffDitado,
      juntarDiff: juntarDiff,
      avaliarDitado: avaliarDitado,
      classificarErroDitado: classificarErroDitado,
      textoErroLeve: textoErroLeve,
      // atalhos com a configuração do idioma
      // Exercícios de digitar: cfg.acentoNaDigitacao ('tolerante' no fr, 'quase' no pt) e, se
      // cfg.ligadurasNaDigitacao, "oe" por "œ" = 'quase'.
      avaliarRespostaDigitada: function (typed, expected, pontuacaoRe) {
        return avaliarRespostaDigitada(typed, expected, {
          pontuacaoRe: pontuacaoRe, acento: cfg.acentoNaDigitacao || 'tolerante', ligaduras: cfg.ligadurasNaDigitacao ? LIG : null
        });
      },
      avaliarComSeparadores: function (given, forms) { return avaliarComSeparadores(given, forms, cfg); },
      resultadoAcentuacao: function (s, t) { return resultadoAcentuacao(s, t, cfg.ligadurasNaAcentuacao ? LIG : null); },
      htmlTecladoDeAcentos: function (classes) { return htmlTecladoDeAcentos(cfg.gruposDeAcentos, classes); },
      nomeDaMarca: function (marca, letra) { return nomeDaMarca(marca, letra, cfg); }
    };
  }

  var api = {
    semAcento: semAcento,
    normalizarFrouxo: normalizarFrouxo,
    dobrarBusca: dobrarBusca,
    formasAceitas: formasAceitas,
    PONTUACAO_VOCAB_RE: PONTUACAO_VOCAB_RE,
    PONTUACAO_LACUNA_RE: PONTUACAO_LACUNA_RE,
    respostaDigitadaCerta: respostaDigitadaCerta,
    avaliarRespostaDigitada: avaliarRespostaDigitada,
    avaliarComSeparadores: avaliarComSeparadores,
    normalizarParaAcentuacao: normalizarParaAcentuacao,
    acentuacaoCerta: acentuacaoCerta,
    semAcentoParaAcentuacao: semAcentoParaAcentuacao,
    resultadoAcentuacao: resultadoAcentuacao,
    tiposDeErroDeAcento: tiposDeErroDeAcento,
    nomeDaMarca: nomeDaMarca,
    alinharLetras: alinharLetras,
    htmlTecladoDeAcentos: htmlTecladoDeAcentos,
    inserirNoCursor: inserirNoCursor,
    criar: criar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FamiliaLatina = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
