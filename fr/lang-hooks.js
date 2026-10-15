// E4: o que muda de um idioma estudado para outro e que o código compartilhado (shared/core) precisa saber.
// Carregado antes do app.js. Funções chamam as do app.js só na hora do uso (setas), então a ordem de carga não importa.
const LANG_HOOKS = {
// --- E4 hooks ---
  speakAudioOnly: (...a) => speakFrenchAudioOnly(...a),
  speak: (...a) => speakFrench(...a),
  loadVoice: () => loadFrenchVoice(),
  audioListenKey: 'fr.audio.listen',
  cardOriginTitle: (c) => flashcardUnitTitleText(c),
  foldCase: (s) => s.toLowerCase(),
  recapText: (i) => i.f,
  recapExtra: () => '',
  uiKey: (k) => 'fr.' + k,
  studyNotifKey: 'frances_last_study_notif',
  appKey: 'frances',
  chartLearnedDates: () => wordLevelFirstLearnedDates(STATE.cards),
  chartEmptyHTML: (msg) => `<div style="text-align:center; padding:30px 20px; color:var(--ink-soft);"><p>${msg}</p></div>`,
  setFlyContent: (el, v) => { el.textContent = v; },
  pregenRate: () => PREGEN_AUDIO_RATE,
  ttsLang: 'fr-FR',
  ttsRate: 0.9,
  conceptExampleHTML: (ex) => `<div class="french">${ex.f} ${audioBtnHTML(ex.f)}</div>`,
  tfPinyinHTML: () => '',
  promptClass: 'flashcard-french',
  promptPinyinHTML: () => '',
  canSpeak: (s) => canSpeakFrench(s),
  revisaoPool: () => REVISAO_CONJ_CHALLENGES,
  revisaoFallbackId: 'conj1',
  dailyExtra: () => ({ stars: 0, grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0, conjugationTenses: [] }),
// --- /E4 hooks ---
  // Família latina (shared/core/familias/latina.js): configuração do FRANCÊS. O português, quando o /pt existir,
  // terá a dele no pt/lang-hooks.js (rascunho em shared/core/familias/latina-idiomas.js). Ver docs/i18n/familia-latina-modulo.md.
  familiaLatina: {
    id: 'fr',
    ligaduras: [['œ', 'oe'], ['æ', 'ae']],
    hifen: true,
    apostrofo: true,
    elisao: true,                       // ditado: "j' ai" -> "j'ai" antes de comparar
    acentoNaDigitacao: 'tolerante',     // exercícios de digitar: acento NÃO conta (decisão de 2026-09-16)
    ligadurasNaDigitacao: true,         // "soeur" por "sœur" = Quase (decisão da dona, 2026-10-15)
    ligadurasNaAcentuacao: true,        // desafio Acentuação: "soeur" por "sœur" = Quase (idem)
    // Teclado de acentos (minúsculas: a comparação já ignora maiúscula).
    gruposDeAcentos: [
      ['à', 'â'],
      ['ç'],
      ['é', 'è', 'ê', 'ë'],
      ['î', 'ï'],
      ['ô', 'œ'],
      ['ù', 'û', 'ü'],
    ],
    // ---- Ditado
    // A áudio dita a pontuação por extenso ("virgule", "point"...). Quem escreve
    // a palavra em vez do sinal comete um erro leve (a tela avisa).
    pontuacaoFalada: [
      [/point[\s-]+d'\s*interrogation/gi, '?', "point d'interrogation"],
      [/point[\s-]+d'\s*exclamation/gi, '!', "point d'exclamation"],
      [/point[\s-]*virgule/gi, ';', 'point-virgule'],
      [/deux[\s-]+points/gi, ':', 'deux points'],
      [/\bvirgule\b/gi, ',', 'virgule'],
      [/\bpoint\b/gi, '.', 'point']
    ],
    // Número em dígito digitado no ditado vira a palavra (0 a 100; senão null).
    numeroPorExtenso: (() => {
      const UNITS = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
      return (n) => {
        if (!Number.isInteger(n) || n < 0 || n > 100) return null;
        if (n <= 16) return UNITS[n];
        if (n < 20) return 'dix-' + UNITS[n - 10];
        if (n === 100) return 'cent';
        const tens = { 2:'vingt', 3:'trente', 4:'quarante', 5:'cinquante', 6:'soixante' };
        if (n < 70){
          const t = Math.floor(n / 10), u = n % 10;
          if (u === 0) return tens[t];
          if (u === 1) return tens[t] + ' et un';
          return tens[t] + '-' + UNITS[u];
        }
        if (n < 80){
          const r = n - 60;
          if (r === 11) return 'soixante et onze';
          return 'soixante-' + (r < 17 ? UNITS[r] : 'dix-' + UNITS[r - 10]);
        }
        const r = n - 80;
        if (r === 0) return 'quatre-vingts';
        return 'quatre-vingt-' + (r < 17 ? UNITS[r] : 'dix-' + UNITS[r - 10]);
      };
    })(),
    // Se o PRÓPRIO texto do ditado escreve o número em dígitos ("30"), o "30" da aluna fica como está
    // (antes virava "trente" e perdia ponto; decisão da dona, 2026-10-15).
    digitosDoTextoFicam: true,
    // Homófonos clássicos do francês (soam igual ou quase, escrita diferente). Só explicativo: NÃO muda a nota.
    // A explicação vem do catálogo de tradução (shared/i18n), no idioma do site.
    homofonos: [
      ['a', 'à'], ['et', 'est'], ['son', 'sont'], ['ou', 'où'], ['on', 'ont'], ['la', 'là'], ['ce', 'se'],
      ['ces', 'ses', "c'est", "s'est"], ['mes', 'mais'], ['peu', 'peux', 'peut'], ['leur', 'leurs'],
      ['quel', 'quelle', 'quels', 'quelles'],
    ].map(words => ({ words, get note(){ return t('fr.dict.hom.' + words[0]); } })),
    // Concordância: a palavra mais longa = a mais curta + -e/-s/-es/-x (petit/petite, ami/amis).
    concordancia: (r, u) => {
      const shorter = r.length <= u.length ? r : u, longer = r.length <= u.length ? u : r;
      const suffix = longer.slice(shorter.length);
      if (shorter.length >= 3 && longer.startsWith(shorter) && ['e', 's', 'es', 'x'].includes(suffix) && /^\p{L}+$/u.test(longer)) return suffix;
      return null;
    },
    // Explicações do ditado: catálogo de tradução (shared/i18n/pt-BR.js e en.js), no idioma do site.
    textos: {
      homofono: (shown, typed, note) => t('fr.dict.err.homophone', { shown, typed, note }),
      concordancia: (shown, typed, suffix) => t('fr.dict.err.agreement', { shown, typed, suffix }),
      outro: (shown, typed) => t('fr.dict.err.other', { shown, typed }),
      leve: {
        hyphen: (core, typed) => t('fr.dict.light.hyphen', { core, you: t('fr.dict.youWrote', { typed }) }),
        apostrophe: (core, typed) => t('fr.dict.light.apostrophe', { core, you: t('fr.dict.youWrote', { typed }) }),
        ligature: (core, typed) => t('fr.dict.light.ligature', { core, you: t('fr.dict.youWrote', { typed }) }),
        accent: (core, typed) => t('fr.dict.light.accent', { core, you: t('fr.dict.youWrote', { typed }) }),
        spelling: (core, typed) => t('fr.dict.light.spelling', { core, you: t('fr.dict.youWrote', { typed }) }),
        // Dois (ou mais) erros leves na mesma palavra: cita todos (decisão da dona, 2026-10-15).
        multiple: (core, typed, reasons) => {
          const parts = reasons.map(r => t('fr.dict.part.' + r));
          const list = parts.length > 1 ? parts.slice(0, -1).join(', ') + t('fr.dict.part.and') + parts[parts.length - 1] : parts[0];
          return t('fr.dict.light.multiple', { core, list, you: t('fr.dict.youWrote', { typed }) });
        },
      },
    },
  },
};
