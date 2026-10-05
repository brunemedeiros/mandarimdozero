// Fase 9 (i18n): comparador do desafio "Ouça e traduza" por IDIOMA DA TRADUÇÃO
// (o idioma do site). Correção aproximada, sem IA em tempo de execução: compara
// sobreposição de palavras de conteúdo contra as traduções de referência e, a
// parte, tenta pegar a troca pronome-sujeito + verbo (concordância). O código
// de pt-BR foi movido SEM mudança de comportamento (fr/app.js) e o de inglês é
// novo e conservador (só formas de be/have/do, para não gerar falso erro).
(function(){
  'use strict';

  function normalizeBase(s){
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.,!?;:'"()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------- pt-BR (comportamento original) ----------
  var STOP_PT = new Set([
    'o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas',
    'que','e','é','ele','ela','eles','elas','eu','tu','voce','você','nos','nós','voces','vocês',
    'para','por','com','se','ao','aos','a','as','à','às','sao','são','esta','está','isso','isto'
  ]);
  var PT_SUBJECT_PRONOUN_PERSON = {
    'eu': '1s', 'tu': '2s', 'voce': '3s', 'ele': '3s', 'ela': '3s',
    'nos': '1p', 'a gente': '1s', 'voces': '3p', 'eles': '3p', 'elas': '3p'
  };
  var PT_IRREGULAR_VERB_FORMS = {
    sou:'1s', es:'2s', e:'3s', somos:'1p', sao:'3p',
    era:['1s','3s'], eras:'2s', eramos:'1p', eram:'3p',
    fui:'1s', foi:'3s', fomos:'1p', foram:'3p',
    estou:'1s', estas:'2s', esta:'3s', estamos:'1p', estao:'3p',
    estava:['1s','3s'], estavas:'2s', estavamos:'1p', estavam:'3p',
    estive:'1s', esteve:'3s', estivemos:'1p', estiveram:'3p',
    tenho:'1s', tens:'2s', tem:['3s','3p'], temos:'1p',
    tinha:['1s','3s'], tinhas:'2s', tinhamos:'1p', tinham:'3p',
    tive:'1s', teve:'3s', tivemos:'1p', tiveram:'3p',
    vou:'1s', vais:'2s', vai:'3s', vamos:'1p', vao:'3p',
    faco:'1s', fazes:'2s', faz:'3s', fazemos:'1p', fazem:'3p',
    fiz:'1s', fez:'3s', fizemos:'1p', fizeram:'3p',
    posso:'1s', podes:'2s', pode:'3s', podemos:'1p', podem:'3p',
    pude:'1s', pudemos:'1p', puderam:'3p',
    quero:'1s', queres:'2s', quer:'3s', queremos:'1p', querem:'3p',
    quis:['1s','3s'], quisemos:'1p', quiseram:'3p',
    digo:'1s', dizes:'2s', diz:'3s', dizemos:'1p', dizem:'3p',
    disse:['1s','3s'], dissemos:'1p', disseram:'3p',
    vejo:'1s', ves:'2s', ve:'3s', vemos:'1p', veem:'3p',
    vi:'1s', viu:'3s', vimos:'1p', viram:'3p',
    dou:'1s', damos:'1p',
    dei:'1s', deu:'3s', demos:'1p', deram:'3p',
    venho:'1s', vens:'2s', vem:'3s', vim:'1s', veio:'3s', viemos:'1p', vieram:'3p',
    sei:'1s', sabes:'2s', sabe:'3s', sabemos:'1p', sabem:'3p',
    soube:['1s','3s'], soubemos:'1p', souberam:'3p',
    ponho:'1s', poes:'2s', poe:'3s', pomos:'1p', poem:'3p',
    pus:'1s', pos:'3s', pusemos:'1p', puseram:'3p'
  };
  function ptVerbPersonTags(word){
    if (PT_IRREGULAR_VERB_FORMS[word]){
      var v = PT_IRREGULAR_VERB_FORMS[word];
      return Array.isArray(v) ? v : [v];
    }
    // Só terminações que são sinal razoavelmente seguro de VERBO conjugado
    // (sem -o/-a/-e genéricos: geravam falsos positivos com substantivos).
    var rules = [
      [/amos$|emos$|imos$/, '1p'],
      [/astes$|estes$|istes$/, '2p'],
      [/aram$|eram$|iram$/, '3p'],
      [/am$|em$/, '3p'],
      [/ou$|eu$|iu$/, '3s'],
      [/aste$|este$|iste$/, '2s'],
      [/ei$/, '1s'],
      [/as$|es$/, '2s']
    ];
    for (var i = 0; i < rules.length; i++){
      if (rules[i][0].test(word)) return [rules[i][1]];
    }
    return [];
  }
  function ptPersonMismatch(text){
    var words = normalizeBase(text).split(' ').filter(Boolean);
    for (var i = 0; i < words.length; i++){
      var pronoun = words[i];
      var j = i + 1;
      if (pronoun === 'a' && words[i + 1] === 'gente'){ pronoun = 'a gente'; j = i + 2; }
      var expected = PT_SUBJECT_PRONOUN_PERSON[pronoun];
      if (!expected) continue;
      for (var la = 0; la < 3 && j + la < words.length; la++){
        var candidate = words[j + la];
        if (PT_SUBJECT_PRONOUN_PERSON[candidate]) break;
        var tags = ptVerbPersonTags(candidate);
        if (tags.length){
          if (tags.indexOf(expected) < 0) return { pronoun: pronoun, verb: candidate, expected: expected, got: tags };
          break;
        }
      }
    }
    return null;
  }

  // ---------- en ----------
  var STOP_EN = new Set([
    'a','an','the','of','to','in','on','at','for','with','and','or','but','is','are','am','was','were','be','been',
    'it','its','this','that','these','those','i','you','he','she','we','they','my','your','his','her','our','their',
    'me','him','us','them','do','does','did','has','have','had','will','would'
  ]);
  // Contrações viram palavras antes de comparar ("don't" = "do not", "I'm" = "I am").
  function expandEnContractions(s){
    return String(s || '').toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\bcannot\b/g, 'can not').replace(/\bcan't\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/\blet's\b/g, 'let us')
      .replace(/n't\b/g, ' not').replace(/'re\b/g, ' are').replace(/'m\b/g, ' am')
      .replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/'d\b/g, ' would')
      .replace(/\b(he|she|it|that|there|what|who|here|where)'s\b/g, '$1 is');
  }
  function normalizeEn(s){ return normalizeBase(expandEnContractions(s)); }

  // Só formas de be/have/do: o erro mais comum e o menos ambíguo. "were" com
  // sujeito singular fica de fora (subjuntivo: "if I were"); "was" com
  // we/you/they também (uso coloquial regional).
  var EN_SUBJECT_FORMS = {
    'i':    { bad: ['is','are','has','does'] },
    'he':   { bad: ['am','are','have','do'] },
    'she':  { bad: ['am','are','have','do'] },
    'it':   { bad: ['am','are','have','do'] },
    'you':  { bad: ['am','is','has','does'] },
    'we':   { bad: ['am','is','has','does'] },
    'they': { bad: ['am','is','has','does'] }
  };
  function enPersonMismatch(text){
    // Perguntas têm inversão ("Does it have...?", "What does she do?"): não checa.
    if (/\?/.test(String(text || ''))) return null;
    var words = normalizeEn(text).split(' ').filter(Boolean);
    for (var i = 0; i < words.length; i++){
      var spec = EN_SUBJECT_FORMS[words[i]];
      if (!spec) continue;
      // O verbo precisa vir logo depois ("I never is" não é coberto, de propósito).
      var cand = words[i + 1];
      if (cand && EN_SUBJECT_FORMS[cand]) continue;
      if (i > 0 && ['do','does','did','will','would','can','could','should','may','might','must'].indexOf(words[i - 1]) >= 0) continue; // inversão sem "?"
      if (cand && spec.bad.indexOf(cand) >= 0) return { pronoun: words[i], verb: cand, expected: null, got: [] };
    }
    return null;
  }

  var LANGS = {
    'pt-BR': { stop: STOP_PT, normalize: normalizeBase, mismatch: ptPersonMismatch },
    'en':    { stop: STOP_EN, normalize: normalizeEn,   mismatch: enPersonMismatch }
  };

  function forLang(lang){
    var cfg = LANGS[lang] || LANGS['pt-BR'];
    function tokens(s){ return cfg.normalize(s).split(' ').filter(function(w){ return w && !cfg.stop.has(w); }); }
    function similarity(a, b){
      var ta = tokens(a), tb = tokens(b);
      if (!ta.length || !tb.length) return 0;
      var setB = new Set(tb);
      var overlap = ta.filter(function(w){ return setB.has(w); }).length;
      return overlap / Math.max(ta.length, tb.length);
    }
    function isAcceptable(student, refs){
      if (!student || !String(student).trim()) return false;
      return (refs || []).some(function(r){ return similarity(student, r) >= 0.55; });
    }
    return { lang: LANGS[lang] ? lang : 'pt-BR', normalize: cfg.normalize, tokens: tokens, similarity: similarity, isAcceptable: isAcceptable, personMismatch: cfg.mismatch };
  }

  window.TranslationCompare = { forLang: forLang, normalizeBase: normalizeBase };
})();
