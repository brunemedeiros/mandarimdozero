// Conjugação do FRANCÊS: dados + regras do idioma para o motor comum (shared/conjugacao.js).
// Etapa 5a da paridade (docs/historico/27-paridade-conjugacao.md). Carregado depois de conjugation-data.js,
// conj-games.js e shared/conjugacao.js, antes do app.js. O que está aqui é próprio do francês; o resto é do motor.
// Molde para o site de português: um pt/conj-config.js com os dados do português e as regras dele (pronomes,
// tempos, pessoas), sem copiar nada do motor.
(function(){
  // Ordem pedida pela autora (2026-10-13): por modo. Futur proche saiu da
  // prática: é só "aller" no présent + infinitivo, que não muda.
  const TENSES = [
    { key: 'presente',       label: 'Présent' },
    { key: 'passeCompose',   label: 'Passé composé' },
    { key: 'imparfait',      label: 'Imparfait' },
    { key: 'plusQueParfait', label: 'Plus-que-parfait' },
    { key: 'futurSimple',    label: 'Futur simple' },
    { key: 'condPresente',   label: 'Conditionnel présent' },
    { key: 'subjPresente',   label: 'Subjonctif présent' },
    { key: 'imperatif',      label: 'Impératif' }      // só tu / nous / vous
  ];
  const PERSONS = ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'];
  // impératif não tem 1ª/3ª pessoa do singular nem 3ª do plural — só tu/nous/vous
  const IMPERATIF_ACTIVE = [false, true, false, true, true, false];
  // Tempos compostos com être: o banco guarda só o masculino (suis allé,
  // sommes allés). A concordância também vale: allée, allées. A correção
  // mostra "allé(e)" / "allé(e)s"; il/elle/on e vous aceitam as quatro.
  const ETRE_AUX = /^(suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient)$/;

  registerConjugation({
    lang: 'fr',
    // Dados (fr/conjugation-data.js; rótulos dos grupos e traduções preenchidos pela camada do curso).
    verbs: CONJUGATION_VERBS,
    groups: CONJUGATION_GROUPS,
    translations: VERB_TRANSLATIONS,
    tenseExamples: typeof CONJ_TENSE_EXAMPLES !== 'undefined' ? CONJ_TENSE_EXAMPLES : null,
    exampleTranslationLang: 'pt-BR',
    tenses: TENSES,
    persons: PERSONS,

    // "je" vira "j'" antes de forma que começa com vogal ou h mudo (j'ai, j'habite) —
    // depende do tempo/verbo, não é fixo, então é calculado a partir da forma esperada.
    personLabel(personIdx, expectedForm, tenseKey){
      const vowel = /^[aeiouâàäéèêëîïôöûüh]/i.test(expectedForm || '');
      // Subjonctif é ensinado com "que" (que je parle), senão fica igual ao présent.
      if (tenseKey === 'subjPresente'){
        return [vowel ? "que j'" : 'que je', 'que tu', "qu'il / qu'elle / qu'on", 'que nous', 'que vous', "qu'ils / qu'elles"][personIdx];
      }
      if (personIdx !== 0) return PERSONS[personIdx];
      return vowel ? "j'" : 'je';
    },
    activeMask: (tenseKey) => tenseKey === 'imperatif' ? IMPERATIF_ACTIVE : [true,true,true,true,true,true],
    pronounlessTenses: ['imperatif'],

    // "futur proche" não vem do banco de dados — é montado em runtime (aller no présent + infinitivo do verbo).
    forms(verb, tense){
      if (tense === 'futurProche'){
        const allerPresente = CONJUGATION_VERBS['aller'].f.presente;
        return allerPresente.map(form => form ? `${form} ${verb}` : null);
      }
      return CONJUGATION_VERBS[verb].f[tense];
    },
    // Passé composé / plus-que-parfait com être: aceita o feminino e o plural do particípio.
    expectedInfo(verb, tenseKey, idx, plain){
      const expected = plain.display;
      if (tenseKey !== 'passeCompose' && tenseKey !== 'plusQueParfait') return plain;
      const words = expected.split(' ');
      if (words.length < 2 || !words.slice(0, -1).some(w => ETRE_AUX.test(w))) return plain;
      const sg = ((CONJUGATION_VERBS[verb].f[tenseKey] || [])[2] || '').split(' ').pop();
      if (!sg) return plain;
      const head = words.slice(0, -1).join(' ');
      const forms = { m: sg, f: sg + 'e', mp: sg.endsWith('s') ? sg : sg + 's', fp: sg + 'es' };
      const keys = (idx === 2 || idx === 4) ? ['m', 'f', 'mp', 'fp'] : (idx < 2 ? ['m', 'f'] : ['mp', 'fp']);
      const shown = idx === 4 ? `${sg}(e)(s)` : idx < 3 ? `${sg}(e)` : (sg.endsWith('s') ? `${sg}(es)` : `${sg}(e)s`);
      return { display: `${head} ${shown}`, accepted: keys.map(k => `${head} ${forms[k]}`) };
    },

    regularGroups: ['g1', 'g2'],
    irregularGroups: ['core', 'g3ir', 'g3re', 'g3oir'],
    topNOptions: [10, 25, 50, 100, 150],
    sessionSizes: [3, 5, 8, 12],
    sessionSize: 8,
    pickMax: 12,

    // Busca: verbo pronominal ("se lever", "s'asseoir") também é achado sem o "se".
    searchStrip: /^(se |s')/,
    searchLangs: { target: 'fr', translation: 'pt' },
    flags: { fr: '🇫🇷', pt: '🇧🇷' },
    flagLabelKeys: { fr: 'fr.conj.sel.langFr', pt: 'fr.conj.sel.langPt' },

    // Família latina: busca sem acento, "quase" = só acento/maiúscula e teclado (shared/core/familias/latina.js, fr/lang-hooks.js).
    accentGroups: () => LANG_HOOKS.familiaLatina.gruposDeAcentos,
    speak: (text, btn) => speakFrench(text, btn),
    games: typeof CONJ_GAMES !== 'undefined' ? CONJ_GAMES : null,
  });
})();
