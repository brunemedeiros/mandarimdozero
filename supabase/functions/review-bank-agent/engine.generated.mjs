// GERADO por scripts/build-review-bank-agent.js a partir de languages/registry.js, shared/flashcard-model.js, shared/flashcard-editor-state.js, shared/flashcard-field-editor.js, shared/flashcard-native-persistence.js, shared/flashcard-cloze-editor.js, shared/flashcard-mc-editor.js, shared/flashcard-typeanswer-editor.js, shared/review-bank-model.js, shared/review-bank-import.js. NÃO edite: mude o arquivo de origem e rode o script.
const window = globalThis;
const escapeHTML = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// ===== languages/registry.js =====
// ARQUIVO GERADO por scripts/build-registry.js -- NÃO editar. Fonte: languages/registry.json + languages/registry-api.js.
const LANGUAGE_REGISTRY_DATA = {
  "languages": [
    {
      "id": "fr",
      "appKey": "frances",
      "enabled": true,
      "family": "latin",
      "locale": "fr-FR",
      "fieldLang": "fr",
      "path": "fr/",
      "name": "Francês",
      "nativeName": "Français",
      "names": {
        "pt-BR": {
          "short": "Francês",
          "course": "Francês com Prof. Brune",
          "deck": "Francês"
        },
        "en": {
          "short": "French",
          "course": "French with Prof. Brune"
        }
      },
      "flagSvg": "<svg viewBox=\"0 0 3 2\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"Bandeira da França\"><rect width=\"1\" height=\"2\" fill=\"#0055A4\"/><rect width=\"1\" height=\"2\" x=\"1\" fill=\"#FFFFFF\"/><rect width=\"1\" height=\"2\" x=\"2\" fill=\"#EF4135\"/></svg>",
      "accent": "#3498D6",
      "icon": "fr/icons/icon-192.png",
      "brand": {
        "appName": "Francês com Prof. Brune",
        "themeColor": "#3498D6",
        "manifestLang": "pt-BR"
      },
      "tts": {
        "voice": "fr-FR",
        "baseRate": 0.9,
        "spokenRulesVersion": 4
      },
      "modules": [
        "desafios",
        "conjugacao",
        "ditados"
      ],
      "hasLevelTest": true,
      "siteLanguages": [
        "pt-BR",
        "en"
      ],
      "courses": {
        "pt-BR": {
          "status": "publicado"
        },
        "en": {
          "status": "beta",
          "legacyFallback": "pt-BR",
          "notice": false
        }
      },
      "flagEmoji": "🇫🇷",
      "legacyStorage": [
        "pt-BR"
      ]
    },
    {
      "id": "zh",
      "appKey": "mandarim",
      "enabled": true,
      "family": "cjk",
      "locale": "zh-CN",
      "fieldLang": "zh",
      "path": "zh/",
      "name": "Chinês",
      "nativeName": "中文",
      "names": {
        "pt-BR": {
          "short": "Chinês",
          "course": "Chinês com Prof. Brune",
          "deck": "Mandarim"
        },
        "en": {
          "short": "Chinese",
          "course": "Chinese with Prof. Brune"
        }
      },
      "flagSvg": "<svg viewBox=\"0 0 30 20\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"Bandeira da China\"><rect width=\"30\" height=\"20\" fill=\"#DE2910\"/><polygon points=\"5,2 5.67,4.08 7.85,4.07 6.08,5.35 6.76,7.43 5,6.14 3.24,7.43 3.92,5.35 2.15,4.07 4.33,4.08\" fill=\"#FFDE00\"/><polygon points=\"10,1 10.22,1.69 10.95,1.69 10.36,2.12 10.59,2.81 10,2.38 9.41,2.81 9.64,2.12 9.05,1.69 9.78,1.69\" fill=\"#FFDE00\"/><polygon points=\"12,3 12.22,3.69 12.95,3.69 12.36,4.12 12.59,4.81 12,4.38 11.41,4.81 11.64,4.12 11.05,3.69 11.78,3.69\" fill=\"#FFDE00\"/><polygon points=\"12,6 12.22,6.69 12.95,6.69 12.36,7.12 12.59,7.81 12,7.38 11.41,7.81 11.64,7.12 11.05,6.69 11.78,6.69\" fill=\"#FFDE00\"/><polygon points=\"10,8 10.22,8.69 10.95,8.69 10.36,9.12 10.59,9.81 10,9.38 9.41,9.81 9.64,9.12 9.05,8.69 9.78,8.69\" fill=\"#FFDE00\"/></svg>",
      "accent": "#C0231F",
      "icon": "zh/icons/icon-192.png",
      "brand": {
        "appName": "Chinês com Prof. Brune",
        "themeColor": "#C0231F",
        "manifestLang": "pt-BR"
      },
      "tts": {
        "voice": "cmn-CN",
        "baseRate": 0.85,
        "spokenRulesVersion": 0
      },
      "modules": [
        "hanzi"
      ],
      "hasLevelTest": false,
      "siteLanguages": [
        "pt-BR",
        "en"
      ],
      "courses": {
        "pt-BR": {
          "status": "publicado"
        },
        "en": {
          "status": "beta",
          "legacyFallback": "pt-BR",
          "notice": false
        }
      },
      "flagEmoji": "🇨🇳",
      "legacyStorage": [
        "pt-BR"
      ]
    },
    {
      "id": "pt",
      "appKey": "portugues",
      "enabled": false,
      "family": "latin",
      "locale": "pt-BR",
      "fieldLang": "pt",
      "path": "pt/",
      "name": "Português",
      "nativeName": "Português",
      "names": {
        "en": {
          "short": "Portuguese",
          "course": "Portuguese with Prof. Brune"
        },
        "pt-BR": {
          "short": "Português",
          "course": "Português com Prof. Brune",
          "deck": "Português"
        }
      },
      "flagSvg": "<svg viewBox=\"0 0 20 14\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"Brazil flag\"><rect width=\"20\" height=\"14\" fill=\"#009C3B\"/><polygon points=\"10,1.4 18,7 10,12.6 2,7\" fill=\"#FFDF00\"/><circle cx=\"10\" cy=\"7\" r=\"3.2\" fill=\"#002776\"/></svg>",
      "accent": "#009C3B",
      "icon": "pt/icons/icon-192.png",
      "brand": {
        "appName": "Portuguese with Prof. Brune",
        "themeColor": "#009C3B",
        "manifestLang": "en"
      },
      "tts": {
        "voice": "pt-BR",
        "baseRate": 1,
        "spokenRulesVersion": 3
      },
      "modules": [],
      "hasLevelTest": false,
      "siteLanguages": [
        "en"
      ],
      "courses": {
        "en": {
          "status": "rascunho"
        }
      },
      "flagEmoji": "🇧🇷",
      "legacyStorage": []
    }
  ]
};

// API do registro de idiomas (E1 de docs/i18n/arquitetura-multi-idioma-cursos.md).
// Fonte dos dados: languages/registry.json. Este trecho é concatenado por
// scripts/build-registry.js em languages/registry.js (arquivo GERADO, nunca editar).
// Funções com nome do SIGNIFICADO (idioma de Field x pasta x chave de progresso),
// não um mapa genérico: 'fr'/'zh' querem dizer coisas diferentes em cada ponto do código.
const LanguageRegistry = (function(){
  const list = LANGUAGE_REGISTRY_DATA.languages;
  const byAppKey = {};
  const byId = {};
  list.forEach(l => { byAppKey[l.appKey] = l; byId[l.id] = l; });

  function find(appKey){ return byAppKey[appKey] || null; }
  function pick(appKey, field){ const l = find(appKey); return l ? l[field] : undefined; }
  function mapOf(field, enabledOnly){
    const out = {};
    list.forEach(l => { if (!enabledOnly || l.enabled) out[l.appKey] = l[field]; });
    return out;
  }
  // courseId = "<appKey>@<idiomaDoSite>"; a pasta da camada usa o id da URL
  // ("courses/fr-pt-BR"). Nada monta esses caminhos por concatenação fora daqui.
  function courseIdOf(appKey, siteLang){ return appKey + '@' + siteLang; }
  function parseCourseId(courseId){
    const i = String(courseId || '').indexOf('@');
    return i < 0 ? null : { appKey: courseId.slice(0, i), siteLang: courseId.slice(i + 1) };
  }
  function layerDir(courseId){
    const p = parseCourseId(courseId);
    const l = p && find(p.appKey);
    return l ? 'courses/' + l.id + '-' + p.siteLang : null;
  }

  return {
    all: function(){ return list.slice(); },
    enabled: function(){ return list.filter(l => l.enabled); },
    byAppKey: find,
    byId: function(id){ return byId[id] || null; },
    isKnownAppKey: function(appKey){ return !!find(appKey); },
    appKeys: function(enabledOnly){ return list.filter(l => !enabledOnly || l.enabled).map(l => l.appKey); },
    appKeyOf: function(id){ return byId[id] ? byId[id].appKey : null; },
    langIdOf: function(appKey){ return pick(appKey, 'id') || null; },
    folderOf: function(appKey){ const l = find(appKey); return l ? l.path.replace(/\/$/, '') : null; },
    // Idioma do Field do estudado ('fr', 'zh', 'pt'); não confundir com o lado da tradução ('pt-BR').
    studyLangOf: function(appKey){ return pick(appKey, 'fieldLang') || null; },
    familyOf: function(appKey){ return pick(appKey, 'family') || null; },
    isCjk: function(appKey){ return pick(appKey, 'family') === 'cjk'; },
    studyLangMap: function(){ return mapOf('fieldLang'); },
    langIdMap: function(enabledOnly){ return mapOf('id', enabledOnly); },
    folderMap: function(enabledOnly){
      const out = {};
      list.forEach(l => { if (!enabledOnly || l.enabled) out[l.appKey] = l.path.replace(/\/$/, ''); });
      return out;
    },
    shortName: function(appKey, siteLang){
      const l = find(appKey);
      if (!l) return null;
      const n = l.names && (l.names[siteLang] || l.names['pt-BR'] || l.names.en);
      return n ? n.short : l.name;
    },
    courseName: function(appKey, siteLang){
      const l = find(appKey);
      const n = l && l.names && (l.names[siteLang] || l.names['pt-BR'] || l.names.en);
      return n ? n.course : null;
    },
    // Rótulo curto do idioma nos Decks ("Mandarim", não "Chinês"), em pt-BR.
    deckLabel: function(appKey){
      const l = find(appKey);
      const n = l && l.names && l.names['pt-BR'];
      return n ? (n.deck || n.short) : (l ? l.name : null);
    },
    flagEmoji: function(appKey){ return pick(appKey, 'flagEmoji') || ''; },
    // Primeiro idioma habilitado: fallback quando APP_KEY ainda não existe.
    defaultAppKey: function(){ const l = list.find(x => x.enabled); return l ? l.appKey : null; },
    siteLanguagesFor: function(appKey){ return (pick(appKey, 'siteLanguages') || []).slice(); },
    courseStatus: function(appKey, siteLang){
      const l = find(appKey);
      return (l && l.courses && l.courses[siteLang]) || null;
    },
    spokenRulesVersionByLang: function(){
      const out = {};
      list.forEach(l => { out[l.fieldLang] = l.tts.spokenRulesVersion; });
      return out;
    },
    // Cursos cujo progresso mora na chave SEM sufixo (data.frances, data.mandarim), por idioma do site.
    // Dado do registro, nunca deduzido: 'portugues' (curso base em inglês) não tem nenhum.
    usesLegacyStorage: function(appKey, siteLang){ return (pick(appKey, 'legacyStorage') || []).indexOf(siteLang) >= 0; },
    courseIdOf: courseIdOf,
    parseCourseId: parseCourseId,
    layerDir: layerDir,
  };
})();

// Formato de AVAILABLE_LANGUAGES mantido (R-04): só idiomas habilitados, sem 'pt' até a E7.
const AVAILABLE_LANGUAGES = LanguageRegistry.enabled().map(l => ({
  id: l.id, appKey: l.appKey, name: l.name, nativeName: l.nativeName, flagSvg: l.flagSvg,
  path: l.path, accent: l.accent, icon: l.icon, enabled: l.enabled, hasLevelTest: l.hasLevelTest,
}));

if (typeof module !== 'undefined' && module.exports) module.exports = { LanguageRegistry, AVAILABLE_LANGUAGES, LANGUAGE_REGISTRY_DATA };

// ===== shared/flashcard-model.js =====
// ---------- Fase 3 do prompt-mestre "reestruturação de flashcards inspirada
// no Anki" (ver CLAUDE.md) -- camada de compatibilidade ----------
//
// Este arquivo é o ÚNICO lugar do app, daqui pra frente, com permissão de
// ler as colunas legadas de teacher_flashcards/own_flashcards:
//   front, back_trans, front_pinyin, front_is_target_language, choices,
//   cloze_sentence, cloze_answer, cloze_answer_pinyin, audio_url, image_url
// Tudo que consome um flashcard (buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard em fr/zh app.js, e tudo depois deles) passa
// primeiro por interpretNoteFromRow() -- nunca lê `row.*` direto de novo.
//
// Modelo Note/Field/CardInstance conforme especificado na Fase 2 v2
// (aprovada pela autora, ver CLAUDE.md):
//   - Field só sabe seu idioma REAL (`lang`) e conteúdo -- nunca carrega
//     "target"/"native" nem posição.
//   - Note.fieldOrder é só a ordem de edição/exibição no editor -- NUNCA
//     interpretado como frente/verso (ressalva explícita da autora).
//   - Quem decide frente/verso (ou pergunta/resposta, ou qual campo é a
//     lacuna) é o CardInstance -- frontFieldIndex/backFieldIndex,
//     promptFieldIndex/correctFieldIndex, textFieldIndex, conforme o tipo.
//   - isStudyLanguageField() é só um helper pra regras que genuinamente
//     dependem do idioma do app -- nunca decide direção, áudio automático
//     ou apresentação (ressalva explícita da autora). Usado nesta fase só
//     UMA vez, como heurística de INTERPRETAÇÃO de dado histórico (ver
//     comentário em interpretNoteFromRow), não como regra de runtime.
//
// Depende de (já definido em fr/app.js e zh/app.js antes deste script ser
// efetivamente CHAMADO em runtime -- ordem de <script> não importa aqui
// porque nada neste arquivo roda no top-level, só declara funções):
//   - flashcardIdForRow(prefix, row)

const STUDY_LANG_FOR_APP_KEY = LanguageRegistry.studyLangMap(); // derivado de languages/registry.json (fieldLang)

// i18n Fase 7 -- idioma da TRADUÇÃO (back_trans) de uma linha LEGADA.
// Todo cartão legado existente foi escrito com a tradução em português, então
// o default é e continua 'pt-BR' (comportamento idêntico). NUNCA derivado do
// idioma do site no momento da leitura: o idioma é do DADO, não de quem lê
// (um aluno com o site em inglês continua vendo um back_trans em português).
// Quem um dia gravar linhas legadas com tradução em outro idioma passa
// `opts.nativeLang` explicitamente.
const LEGACY_TRANSLATION_LANG_DEFAULT = 'pt-BR';
function legacyTranslationLang(opts){
  return (opts && typeof opts.nativeLang === 'string' && opts.nativeLang) || LEGACY_TRANSLATION_LANG_DEFAULT;
}

// i18n Fase 7 -- unitTitle de cartão de professora/aluna. A string em PT é só
// EXIBIÇÃO (tag do flashcard), nunca comparada em lógica (confirmado por grep).
// O card ganha também `unitTitleKey` (chave estável) pra a fase de interface
// (fase 6) resolver por catálogo; `unitTitle` continua idêntico.
const FLASHCARD_ORIGIN_TITLE_KEYS = { teacher: 'flashcards.origin.teacherTitle', self: 'flashcards.origin.selfTitle' };
const FLASHCARD_ORIGIN_TITLES_PT = { teacher: 'Da sua professora', self: 'Meus cartões' };

// Fase 2 v2, ressalva da autora: helper de idioma, nunca de direção/áudio/
// apresentação. Único uso nesta fase: heurística de interpretação do
// audio_url legado (ver interpretNoteFromRow).
function isStudyLanguageField(field, appKey){
  return field.lang === STUDY_LANG_FOR_APP_KEY[appKey];
}

// ============================================================
// Fase 7b (ver CLAUDE.md) -- CONTRATO NATIVO DE Field.audio
// ============================================================
//
// Ausência de áudio é sempre `null` (nunca `{type:'none'}`) -- decisão
// explícita: todo o código já existente (buildNativeRuntimeFields,
// resolveCardField, comparação de estado do editor) já trata `field.audio`
// como "tem ou não tem" via checagem de truthiness (`field.audio || null`,
// `if (field.audio)`); introduzir um segundo valor "vazio mas presente"
// (`{type:'none'}`) duplicaria a representação de "nada" sem nenhum
// requisito real que precise distinguir "nunca configurado" de
// "explicitamente sem áudio" -- e obrigaria reescrever toda checagem
// truthy já existente pra também excluir esse novo caso.
//
// Quando presente, `field.audio` é SEMPRE um objeto com discriminador
// `type` (nunca `source` -- ver nota de compatibilidade abaixo) em um dos
// 4 valores de FIELD_AUDIO_TYPES:
//
//   { type: 'url', url }
//     -- link externo arbitrário, colado pela professora/aluna (nunca
//     hospedado pelo próprio app). `url` obrigatório.
//
//   { type: 'upload', url, uploadedAt, mimeType }
//     -- arquivo hospedado no próprio Storage do app (mesmo bucket
//     `flashcard-media` já usado pelo upload legado, migration 032).
//     `url` obrigatório; `uploadedAt`/`mimeType` são metadado opcional,
//     nunca lidos por resolveCardField() (só documentação/auditoria
//     futura). MESMO shape funcional que o código legado já produzia
//     (`{url, source:'upload'}`) -- só o nome do discriminador mudou
//     (ver nota de compatibilidade).
//
//   { type: 'tts', text, language, voiceId, rate, generationKey,
//     generatedUrl, generatedAt, storagePath }
//     -- CONFIGURAÇÃO de síntese de voz, nunca execução. Cada propriedade
//     é opcional/nullable -- um Field pode ter `type:'tts'` com TODAS
//     essas propriedades `null`, representando "o modo TTS foi escolhido
//     mas nada mais foi configurado ainda" (estado válido, não um erro).
//     - `text`: override opcional do texto a sintetizar -- `null` (o caso
//       comum) significa "sintetize field.content.value no momento da
//       geração".
//     - `language`: locale EXPLÍCITO da síntese (ex: 'fr-FR'/'zh-CN') --
//       DELIBERADAMENTE DISTINTO de `field.lang` (idioma pedagógico do
//       Field, ex: 'fr'/'zh'). NUNCA derivado automaticamente de
//       `field.lang` por nenhum código deste motor -- uma futura UI PODE
//       oferecer um valor sugerido a partir de `field.lang`, mas o que
//       fica gravado é sempre a escolha explícita (ou `null`, se a
//       pessoa ainda não escolheu). Nem `resolveFieldAudioUrl()` nem
//       `resolveCardField()` abaixo leem `language` pra decidir nada --
//       só existe como configuração, pra a geração (Fase 7f
//       implementação) consumir.
//     - `voiceId`/`rate`: configuração de síntese, mesma lógica de
//       "nullable = ainda não escolhido" que `language`.
//     - `generationKey`: hash SHA-256 determinístico de (texto efetivo +
//       language + voiceId + rate + providerModelId + configVersion --
//       os 2 últimos são CONSTANTES DE CÓDIGO, nunca persistidas aqui,
//       ver TTS_PROVIDER_MODEL_ID/TTS_CONFIG_VERSION abaixo) -- calculado
//       por computeTtsGenerationKey(). É dado DERIVADO, nunca a fonte de
//       verdade (a fonte de verdade são as propriedades de configuração
//       acima) -- serve só pra decidir idempotência/staleness
//       (isTtsAudioStale()), comparando o valor recém-computado contra
//       este já persistido.
//     - `generatedUrl`/`generatedAt`: o ATIVO já gerado e cacheado (se
//       existir) -- distinção explícita entre CONFIGURAÇÃO (as
//       propriedades acima, o que a pessoa pediu) e ATIVO RESOLVIDO
//       (isto, o que de fato existe como arquivo hoje). Um Field pode
//       ter `type:'tts'` com configuração completa e `generatedUrl:null`
//       (ainda não gerado) -- estado perfeitamente válido.
//     - `storagePath` (Fase 7f -- implementação): a REFERÊNCIA ESTÁVEL
//       ao objeto no bucket `flashcard-media` (ex:
//       `{userId}/tts-{fieldId}-{ts}-{rand}.wav`) -- É ESTA a IDENTIDADE
//       PERSISTENTE do asset, nunca `generatedUrl`. `generatedUrl` é só a
//       URL de ACESSO derivada/cacheada a partir dela
//       (`storage.from('flashcard-media').getPublicUrl(storagePath)`) --
//       hoje as duas coincidem em conteúdo (o bucket é público, sem URL
//       assinada/expirável, então `getPublicUrl()` de um path sempre
//       devolve a mesma URL, sem nunca precisar re-derivar), mas por que
//       guardar as duas mesmo assim: (1) uma futura rotina de limpeza de
//       áudio órfão (já cogitada, nunca implementada -- ver Fase 7e)
//       precisa do PATH pra chamar `storage.remove([path])`, nunca da
//       URL pública (extrair o path de dentro da URL seria acoplamento
//       implícito ao formato atual de URL pública do Supabase, frágil se
//       esse formato mudar); (2) se o bucket algum dia precisar virar
//       privado/com URL assinada (mudança de infraestrutura, não
//       decidida aqui), a URL vira algo com expiração -- o PATH continua
//       sendo a única coisa que permite re-derivar/re-assinar uma URL de
//       acesso nova sem precisar regenerar o áudio do zero. Nullable
//       (`null` quando o Field ainda não tem asset gerado, mesmo motivo
//       de `generatedUrl:null`) -- nunca lido por `resolveFieldAudioUrl()`/
//       `resolveCardField()` (que continuam expondo só `generatedUrl`
//       como `audioUrl` de exibição -- `storagePath` é metadado de
//       identidade/gestão, não de apresentação, mesmo papel que
//       `uploadedAt`/`mimeType` já tinham pro tipo `'upload'`). Adição
//       ADITIVA e OPCIONAL ao contrato -- nunca quebra dado já persistido
//       sem esta propriedade (um Field TTS gerado antes desta mudança
//       simplesmente tem `storagePath` ausente/`undefined`, continua
//       resolvendo `audioUrl` normalmente via `generatedUrl`, só não
//       participa de uma futura rotina de limpeza até ser regenerado).
//
//   { type: 'recording', url, recordedAt, mimeType, durationMs }
//     -- suporte estrutural pra gravação futura (MediaRecorder), NÃO
//     implementada nesta fase (sem microfone, sem UI, sem upload
//     específico -- ver CLAUDE.md, Fase 7 auditoria, subfase 7g). `url`
//     é nullable (`null` = "modo gravação escolhido, ainda sem arquivo",
//     mesmo espírito do TTS antes de gerar) -- uma vez gravado, aponta
//     pro MESMO tipo de URL que `upload` já usa (reaproveita a mesma
//     infraestrutura de Storage, nunca um mecanismo de persistência
//     paralelo).
//
// Nota de compatibilidade -- discriminador renomeado de `source` pra
// `type`: o shape anterior (`{url, source:'upload'}` / `{source:'tts',
// enabled:true}`, Fase 6B/8a) usava `source` como discriminador, mas
// NENHUM código em produção jamais LÊ essa propriedade (confirmado por
// grep antes de decidir isto) -- só é escrita. resolveCardField() sempre
// leu `.url` direto, então dado já persistido com `source` continua
// resolvendo corretamente mesmo sem nenhuma migração (a chave que
// importa pra resolução, `.url`, nunca mudou de nome). Ainda assim, os
// pontos que ESCREVEM esse shape (interpretação de audio_url legado, os
// call sites em interpretNoteFromRow()/attachLegacyMediaToFields) foram
// atualizados nesta fase pra emitir `type:'upload'` -- daqui pra frente,
// toda escrita nova usa o discriminador canônico único (`type`), nunca
// os dois convivendo como fontes de verdade diferentes.
const FIELD_AUDIO_TYPES = ['url', 'upload', 'tts', 'recording'];

// Validação ESTRUTURAL pura -- nunca lança, nunca decide nada sobre
// direção/apresentação. `null`/`undefined` são sempre válidos (ausência
// de áudio). Quando presente, exige um `type` reconhecido; exige `url`
// string não-vazia pra 'url'/'upload' (são inúteis sem link); 'tts' e
// 'recording' toleram todas as propriedades ausentes/null (representam
// configuração incompleta, não erro -- ver comentário acima). Usada por
// testes e por uma futura UI de edição de áudio (Fase 7e) -- NÃO é
// chamada hoje por validateNoteEditorStateForSave() (shared/
// flashcard-native-persistence.js): áudio continua opcional em qualquer
// Card Type, e a ausência de UI de edição real nesta fase significa que
// nenhum fluxo de salvar hoje pode produzir um `field.audio` inválido de
// qualquer jeito -- gate de validação forte fica pra quando a UI de
// edição (7e) existir de verdade.
function isValidFieldAudio(audio){
  if (audio === null || audio === undefined) return true;
  if (typeof audio !== 'object' || Array.isArray(audio)) return false;
  if (!FIELD_AUDIO_TYPES.includes(audio.type)) return false;
  if (audio.type === 'url' || audio.type === 'upload'){
    return typeof audio.url === 'string' && audio.url.length > 0;
  }
  if (audio.type === 'recording'){
    return audio.url === null || audio.url === undefined || (typeof audio.url === 'string' && audio.url.length > 0);
  }
  // type === 'tts' -- toda propriedade é opcional/nullable (ver comentário
  // acima); só rejeita se algo presente tiver o TIPO errado.
  const strOrNull = (v) => v === null || v === undefined || typeof v === 'string';
  return strOrNull(audio.text) && strOrNull(audio.language) && strOrNull(audio.voiceId)
    && (audio.rate === null || audio.rate === undefined || typeof audio.rate === 'number')
    && strOrNull(audio.generationKey) && strOrNull(audio.generatedUrl) && strOrNull(audio.generatedAt) && strOrNull(audio.storagePath);
}

// Único ponto que decide "que URL este `field.audio` resolve HOJE" --
// nunca gera TTS, nunca busca nada externo, nunca escolhe áudio baseado
// em `field.lang`. Defensivo: qualquer shape não reconhecido (incluindo
// lixo/estado inválido) devolve `null` em vez de lançar -- resolução pra
// EXIBIÇÃO nunca deve quebrar a tela por causa de um dado malformado
// (rejeitar dado malformado é trabalho de isValidFieldAudio(), numa
// camada de validação, não de leitura). Compatível com o shape anterior
// (`source` em vez de `type`) sem nenhuma normalização especial -- a
// única propriedade que importa pra 'url'/'upload'/'recording' já era
// `.url` desde a Fase 6B, nome nunca mudou.
function resolveFieldAudioUrl(audio){
  if (!audio || typeof audio !== 'object') return null;
  const candidate = audio.type === 'tts' ? audio.generatedUrl : audio.url;
  return typeof candidate === 'string' && candidate ? candidate : null;
}

// ---------- Fase 7e (upload de áudio por Field, ver CLAUDE.md) ----------
//
// Espelha EXATAMENTE os valores da migration 046
// (shared/supabase_migrations/046_flashcard_media_size_mime_limits.sql,
// aplicada ao vivo no bucket `flashcard-media`) -- nunca uma lista
// inventada a partir de conhecimento geral. A validação aqui é uma
// SEGUNDA camada, cliente, redundante de propósito com o
// file_size_limit/allowed_mime_types do próprio bucket (regra já travada
// neste arquivo/CLAUDE.md: "nunca confiar somente no cliente") -- dá
// feedback imediato sem round-trip de rede, mas o Storage rejeita de
// qualquer jeito um upload que burle esta checagem (ex: via devtools).
const FIELD_AUDIO_UPLOAD_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac',
  'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a',
];
const FIELD_AUDIO_UPLOAD_MAX_BYTES = 5242880; // 5 MiB

// Validação PURA de um File/Blob antes de subir pro Storage -- nunca faz
// I/O, nunca lança. `file.type` (MIME reportado pelo navegador) é a
// mesma fonte que `allowed_mime_types` do bucket já usa pra decidir --
// não é 100% confiável (um navegador pode reportar tipo errado/vazio),
// por isso é só a PRIMEIRA camada; a policy do bucket é quem de fato
// impede um upload malicioso. `file.name`/extensão NUNCA entram nesta
// checagem (Seção 15 -- nunca confiar no nome de arquivo pra decisão de
// segurança).
// Mensagens de erro de envio de mídia: idioma do site quando t() existe
// (fora do navegador, nos testes, fica o texto em português).
function mediaErrorText(key, pt){
  if (typeof t !== 'function') return pt;
  const v = t(key);
  return (v && v !== key) ? v : pt;
}

function validateFieldAudioUploadFile(file){
  if (!file) return { ok: false, error: mediaErrorText('media.noFile', 'Nenhum arquivo selecionado.') };
  if (typeof file.size === 'number' && file.size <= 0) return { ok: false, error: mediaErrorText('media.emptyFile', 'Arquivo vazio.') };
  if (typeof file.size === 'number' && file.size > FIELD_AUDIO_UPLOAD_MAX_BYTES){
    return { ok: false, error: mediaErrorText('media.audioTooBig', 'Arquivo maior que 5 MB. Escolha um arquivo de áudio menor.') };
  }
  const type = file.type || '';
  if (!FIELD_AUDIO_UPLOAD_MIME_TYPES.includes(type)){
    return { ok: false, error: mediaErrorText('media.audioBadType', 'Formato de áudio não suportado. Use MP3, M4A/AAC, OGG, WAV ou WEBM.') };
  }
  return { ok: true };
}

// Imagem por campo (botão discreto do editor, 2026-10-06). Mesmo bucket
// `flashcard-media` e mesmo teto de 5 MB do áudio; a migration 072 libera
// estes tipos no bucket.
const FIELD_IMAGE_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
function validateFieldImageUploadFile(file){
  if (!file) return { ok: false, error: mediaErrorText('media.noFile', 'Nenhum arquivo selecionado.') };
  if (typeof file.size === 'number' && file.size <= 0) return { ok: false, error: mediaErrorText('media.emptyFile', 'Arquivo vazio.') };
  if (typeof file.size === 'number' && file.size > FIELD_AUDIO_UPLOAD_MAX_BYTES){
    return { ok: false, error: mediaErrorText('media.imageTooBig', 'Imagem maior que 5 MB. Escolha uma imagem menor.') };
  }
  if (!FIELD_IMAGE_UPLOAD_MIME_TYPES.includes(file.type || '')){
    return { ok: false, error: mediaErrorText('media.imageBadType', 'Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.') };
  }
  return { ok: true };
}

// ---------- Fase 7h.1 (UI completa de áudio por Field, ver CLAUDE.md) ----------
//
// Validação PURA de uma URL externa de áudio -- nunca faz I/O (nunca busca
// a URL pra confirmar que existe/responde áudio de verdade; o próprio
// elemento `<audio>` de preview já falha graciosamente se a URL não tocar,
// mesma decisão já registrada na auditoria da Fase 7c, Seção L). Exige
// `https://` explícito -- nunca `http://` (conteúdo misto num app servido
// via https) nem qualquer outro esquema (`javascript:`/`data:`/`file:`/etc,
// vetor de XSS/leitura local se aceito cru) -- e um comprimento razoável.
const FIELD_AUDIO_URL_MAX_LENGTH = 2000;
function validateFieldAudioUrl(url){
  const clean = (url || '').trim();
  if (!clean) return { ok: false, error: mediaErrorText('media.urlEmpty', 'Cole o link do áudio.') };
  if (clean.length > FIELD_AUDIO_URL_MAX_LENGTH) return { ok: false, error: mediaErrorText('media.urlTooLong', 'Link muito longo.') };
  if (!/^https:\/\//i.test(clean)) return { ok: false, error: mediaErrorText('media.urlNeedsHttps', 'O link precisa começar com https://.') };
  return { ok: true, url: clean };
}

// ---------- Fase 7f (TTS explícito por Field, implementação -- ver
// CLAUDE.md) -- contrato de geração compartilhado ----------
//
// providerModelId/configVersion são CONSTANTES DE CÓDIGO, nunca
// persistidas em Field.audio -- decisão explícita da auditoria da Fase
// 7f (Seção 21): o shape já travado na Fase 7b (text/language/voiceId/
// rate/generationKey/generatedUrl/generatedAt) já é suficiente; os 2
// conceitos novos (Seção 9 da auditoria: "generationKey precisa incluir
// QUAL provedor/modelo gerou, e QUAL versão do algoritmo de geração, pra
// invalidar cache numa troca futura") entram só como entrada do hash,
// espelhadas EXATAMENTE aqui e em supabase/functions/tts-generate/index.ts
// -- os dois lados precisam concordar no mesmo valor pro cliente conseguir
// calcular "está desatualizado?" sem round-trip de rede. Trocar de
// provedor/algoritmo no futuro = mudar as 2 constantes nos DOIS lugares --
// invalida o cache de TODO Field TTS já gerado (generationKey muda pra
// todo mundo), sem nenhuma migração de dado.
const TTS_PROVIDER_MODEL_ID = 'google-chirp3-hd'; // Google Cloud TTS, Chirp 3 HD (ver Edge Function tts-generate)
const TTS_CONFIG_VERSION = 2;
// Versão das regras de "texto falado" POR IDIOMA (tts_core.mjs /
// spoken_text.py). Entra no generationKey junto com TTS_CONFIG_VERSION:
// mudar a regra de um idioma invalida só os áudios daquele idioma.
const TTS_SPOKEN_RULES_VERSION_BY_LANG = LanguageRegistry.spokenRulesVersionByLang(); // registry.json (tts.spokenRulesVersion); cópia no Deno: supabase/functions/tts-generate/index.ts
function ttsConfigVersionFor(language){
  const l = String(language || '').trim().toLowerCase();
  const fam = l.startsWith('fr') ? 'fr' : l.startsWith('pt') ? 'pt' : (l.startsWith('zh') || l.startsWith('cmn')) ? 'zh' : 'x';
  return `${TTS_CONFIG_VERSION}:${fam}${TTS_SPOKEN_RULES_VERSION_BY_LANG[fam] ?? 0}`;
}

// Limite de caracteres por geração -- controle de custo (auditoria Fase
// 7f, Seção 14/15: "nunca gerar um texto absurdamente longo"). Mesmo
// valor espelhado na Edge Function (2ª camada real -- nunca confia só no
// cliente, mesma disciplina de FIELD_AUDIO_UPLOAD_MAX_BYTES acima).
const TTS_TEXT_MAX_LENGTH = 500;

// Hash SHA-256 das 6 entradas do generationKey (Seção 9 da auditoria), em
// ORDEM FIXA -- nunca JSON.stringify de um objeto (ordem de chave não é
// garantida entre engines/versões, e um hash que depende disso deixaria
// de ser determinístico). Usa Web Crypto (crypto.subtle), disponível tanto
// no navegador quanto no runtime Deno das Edge Functions -- mesmo
// algoritmo nos dois lados, sem duplicar lógica de hash em JS puro.
// Assíncrona (subtle.digest é sempre Promise) -- só chamada em pontos que
// já são async (gerar/checar "está desatualizado?"), nunca no caminho de
// render síncrono (resolveCardField()/resolveFieldAudioUrl() continuam
// 100% síncronas, nunca tocam nisto).
async function computeTtsGenerationKey(effectiveText, language, voiceId, rate){
  const parts = [
    effectiveText || '',
    language || '',
    voiceId || '',
    (rate === null || rate === undefined) ? '' : String(rate),
    TTS_PROVIDER_MODEL_ID,
    ttsConfigVersionFor(language),
  ];
  const input = parts.map(p => encodeURIComponent(p)).join('\u001F');
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Texto EFETIVO que seria sintetizado AGORA pra um dado Field + a
// configuração TTS que ele já carrega -- regra já travada na Fase 7c
// (Seção F): se `audio.text` é um override explícito (não-null,
// não-vazio), usa ele; senão usa `field.content.value` (o texto de
// exibição do próprio Field) -- é essa regra que decide QUAL mudança
// invalida o cache (editar o Field invalida só quando não há override;
// editar o override nunca é afetado por uma edição do texto de exibição).
function ttsEffectiveText(field, audioConfig){
  const override = (audioConfig && typeof audioConfig.text === 'string') ? audioConfig.text : null;
  if (override !== null && override !== '') return override;
  return (field && field.content && field.content.value) || '';
}

// "Desatualizado" é sempre um estado CALCULADO na hora (Seção 9/10 da
// auditoria), nunca um booleano persistido em Field.audio -- compara o
// generationKey recém-computado (a partir do estado ATUAL do Field)
// contra o já persistido em `audio.generationKey`. Um Field sem
// `type:'tts'`, ou com `type:'tts'` mas ainda sem `generatedUrl` (nunca
// gerado), nunca é "desatualizado" -- essa pergunta só faz sentido quando
// já existe um ativo gerado pra comparar contra.
async function isTtsAudioStale(field){
  const audio = field && field.audio;
  if (!audio || audio.type !== 'tts' || !audio.generatedUrl) return false;
  const text = ttsEffectiveText(field, audio);
  const freshKey = await computeTtsGenerationKey(text, audio.language, audio.voiceId, audio.rate);
  return freshKey !== audio.generationKey;
}

// Validação de ENTRADA pura (nunca I/O) -- mesma disciplina de
// validateFieldAudioUploadFile acima: camada CLIENTE, feedback imediato
// sem round-trip; a Edge Function tts-generate valida de novo do lado do
// servidor (2ª camada real, nunca confia só nisto).
function validateTtsGenerationRequest({ text, language }){
  const cleanText = (text || '').trim();
  if (!cleanText) return { ok: false, error: t('flashcardModel.tts.missingText') };
  if (cleanText.length > TTS_TEXT_MAX_LENGTH){
    return { ok: false, error: t('flashcardModel.tts.textTooLong', { max: TTS_TEXT_MAX_LENGTH }) };
  }
  if (!language || typeof language !== 'string'){
    return { ok: false, error: t('flashcardModel.tts.missingLanguage') };
  }
  return { ok: true };
}

// Rótulos de erro compartilhados entre shared/teacher-flashcards.js e
// shared/own-flashcards.js (os 2 serviços de front-end que chamam a Edge
// Function tts-generate) -- declarado UMA vez só aqui (shared/
// flashcard-model.js já carrega antes dos dois, mesma posição de
// FIELD_AUDIO_UPLOAD_MIME_TYPES) pra nunca colidir como top-level `const`
// duplicado no mesmo escopo global de documento (mesmo problema já
// corrigido na Fase 6D.2 pra CARD_TYPE_UI_META).
const TTS_GENERATION_ERROR_LABELS = {
  get provider_not_configured(){ return t('flashcardModel.tts.providerNotConfigured'); },
  get provider_not_implemented(){ return t('flashcardModel.tts.providerNotImplemented'); },
  get provider_error(){ return t('flashcardModel.tts.providerError'); },
  get provider_rate_limited(){ return t('flashcardModel.tts.providerRateLimited'); },
  get rate_limited(){ return t('flashcardModel.tts.rateLimited'); },
  get monthly_quota_exceeded(){ return t('flashcardModel.tts.monthlyQuotaExceeded'); },
  get quota_check_failed(){ return t('flashcardModel.tts.quotaCheckFailed'); },
  get unsupported_language(){ return t('flashcardModel.tts.unsupportedLanguage'); },
  get invalid_voice(){ return t('flashcardModel.tts.invalidVoice'); },
  get not_authorized(){ return t('flashcardModel.tts.notAuthorized'); },
  get invalid_session(){ return t('flashcardModel.tts.invalidSession'); },
  get text_too_long(){ return t('flashcardModel.tts.textTooLong', { max: TTS_TEXT_MAX_LENGTH }); },
  get missing_text(){ return t('flashcardModel.tts.missingText'); },
  get missing_language(){ return t('flashcardModel.tts.missingLanguage'); },
  get upload_failed(){ return t('flashcardModel.tts.uploadFailed'); },
};

const FLASHCARD_MODEL_FSRS_DEFAULTS = Object.freeze({
  ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0,
  stability: 0, difficulty: 0, state: 'new', lastReview: null,
  fsrsReps: 0, fsrsLapses: 0,
});

// ---------- Sintaxe Cloze nova: {{cN::resposta}} ----------
// Puras -- só entendem a sintaxe NOVA, nunca cloze_sentence/cloze_answer.
const CLOZE_MARK_RE = /\{\{(c\d+)::(.*?)\}\}/g;

// Fase 5 (ver CLAUDE.md) -- {{cN::texto|compareAnswer}}: "|" separa o
// texto que fica embutido na frase (sempre mostrado ao revelar) do valor
// de comparação opcional daquela lacuna (pinyin no zh). Sem "|", a marca
// não tem compareAnswer próprio (caso comum do fr -- o próprio texto é a
// resposta esperada). Nunca confundir com "/" (aceita múltiplas formas
// dentro do próprio texto ou compareAnswer, ex. "viens/vient" -- feature
// separada, já tratada por acceptedForms() em fr/zh app.js).
function splitClozeMarkRaw(raw){
  const pipeIdx = raw.indexOf('|');
  if (pipeIdx === -1) return { answer: raw, compareAnswer: null };
  return { answer: raw.slice(0, pipeIdx), compareAnswer: raw.slice(pipeIdx + 1) };
}

function parseClozeMarks(text){
  const marks = [];
  let m;
  CLOZE_MARK_RE.lastIndex = 0;
  while ((m = CLOZE_MARK_RE.exec(text))){
    const { answer, compareAnswer } = splitClozeMarkRaw(m[2]);
    marks.push({ id: m[1], answer, compareAnswer });
  }
  return marks;
}

// Mostra `text` com a lacuna `targetMarkId` oculta (___) por padrão, e
// qualquer outra marcação da mesma nota já revelada como texto puro --
// relevante quando uma nota tiver c1+c2+c3 (Fase 5: geração real disso
// existe agora em interpretNoteFromRow(), ver seção correspondente).
// `opts.reveal=true` também revela o alvo. Nunca vaza a parte pós-"|"
// (compareAnswer) no texto renderizado -- só o texto embutido (answer).
function renderClozeText(text, targetMarkId, opts){
  const reveal = !!(opts && opts.reveal);
  CLOZE_MARK_RE.lastIndex = 0;
  return text.replace(CLOZE_MARK_RE, (_, id, raw) => {
    const { answer } = splitClozeMarkRaw(raw);
    if (id !== targetMarkId) return answer;
    return reveal ? answer : '___';
  });
}

// ============================================================
// Fase 6B (ver CLAUDE.md) -- Note NATIVA: persistência real de Fields como
// unidade de conteúdo, ao lado (nunca em cima) da inferência implícita que
// já existia. `fields` (array de Field) + `card_generation_mode` (string)
// SEMPRE pareados numa linha nativa -- ausência dos dois é o caminho
// legado (ramo `else` de interpretNoteFromRow, intocado desde a Fase 3);
// presença de só um dos dois é um estado inválido, nunca gravado por
// escrita correta (CHECK constraint proposto pra migration, ainda NÃO
// aplicada) mas SEMPRE revalidado aqui -- o motor nunca confia só na
// constraint do banco.
//
// Shape de Field persistido (row.fields[i]):
//   { id, lang, role, content: {type:'plain', value}, audio, image, pinyinFieldId }
// -- `id` é estável (não muda se a ordem dos Fields mudar no editor) e é o
// que `pinyinFieldId` referencia -- nunca um índice de array (índice muda
// se a ordem mudar; id não). Nada no motor de geração de CardInstance usa
// `id` pra decidir DIREÇÃO -- frontFieldIndex/backFieldIndex/promptFieldIndex/
// answerFieldIndex continuam por ÍNDICE de array, exatamente como o
// caminho legado já fazia (ver buildNativeRuntimeFields/interpretNativeNoteFromRow
// abaixo). `role` NUNCA decide direção de normal/normal_reversed/
// type_answer/cloze (restrição explícita da autora: "role não determina
// direção") -- pra esses 4 tipos, o convênio é sempre posicional (índice 0
// = front/prompt/texto-cloze, índice 1 = back/answer/tradução), mesmo se a
// professora nunca marcar `role` em nenhum Field. Só múltipla escolha
// consulta `role`, porque é o único tipo com mais de 2 Fields
// semanticamente distintos (prompt/answer/1-3 distractors) -- posição
// sozinha não basta pra desambiguar 5 fields.
// ============================================================

const CARD_GENERATION_MODES = ['normal', 'normal_reversed', 'multiple_choice', 'cloze', 'type_answer'];

function isNoteFieldsPresent(row){
  return row.fields !== null && row.fields !== undefined;
}
function isCardGenerationModePresent(row){
  return row.card_generation_mode !== null && row.card_generation_mode !== undefined && row.card_generation_mode !== '';
}

// ---------- Tags (Note-level) -- Fase 7j fechamento (ver CLAUDE.md,
// arquitetura consolidada "Decks/Tags/Painel", seção 10) ----------
//
// Tags pertencem à Note, nunca ao CardInstance -- por isso vivem só no
// editor state/linha persistida (shared/flashcard-editor-state.js), nunca
// no objeto `note`/`cards` que este arquivo gera em runtime pra
// Review/FSRS (interpretNoteFromRow/interpretNativeNoteFromRow nunca leem
// nem propagam tags -- não são propriedade de apresentação/scheduling).
// São globais na conta, compartilhadas entre idiomas (seção 10) -- a
// normalização mora aqui, no motor Note/Field, e não dentro de nenhuma
// feature específica (Anki import, editor, Painel), porque TODAS
// precisam produzir/ler o MESMO formato canônico de tag. ÚNICA função de
// normalização do app inteiro -- auditado antes de escrever (grep no
// repositório inteiro): nenhuma normalização de tag existia em lugar
// nenhum -- só slugifyUsername() (shared/profile.js), regra DIFERENTE e
// restrita ao alfabeto de username (nunca transiliteração de acento),
// nunca reaproveitável aqui. Qualquer código futuro que precise
// normalizar uma tag (editor nativo, Painel, atribuição de autoria de
// Deck público, Study Trail) deve chamar normalizeTagSlug()/
// normalizeNoteTags(), nunca reimplementar a regra.
//
// Regra (seção 10.1): minúsculas; sem acento (NFD + remove diacríticos,
// mesmo idioma já usado por normalizeLoose() em fr/app.js/normalizePinyinAnswer
// em zh/app.js pra outro propósito -- reaproveita o MESMO padrão de
// remoção de acento já estabelecido no repo, não inventa um novo);
// espaços viram '-'; hierarquia do Anki (parent::child) NUNCA é
// preservada como estrutura -- "Não haverá hierarquia de subtags" --
// '::' também vira '-', achatado numa tag plana só; qualquer caractere
// fora de [a-z0-9-] vira '-'; maiúsculas/minúsculas são a MESMA tag
// (normalização faz isso convergir).
function normalizeTagSlug(raw){
  return String(raw || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/::/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Normaliza uma lista de tags crua (qualquer fonte -- Anki, um editor
// nativo futuro) -- descarta as que normalizam pra vazio, deduplica (2
// tags cruas diferentes que colapsam na mesma forma normalizada, ex:
// "Erro"/"erro", contam como 1 só), preserva a ORDEM de 1ª aparição.
function normalizeNoteTags(rawTags){
  const seen = new Set();
  const out = [];
  (Array.isArray(rawTags) ? rawTags : []).forEach(raw => {
    const slug = normalizeTagSlug(raw);
    if (slug && !seen.has(slug)){ seen.add(slug); out.push(slug); }
  });
  return out;
}

// ---------- Fase I (Tags): limites, validação e filtro ----------
//
// Tags pertencem à NOTE (nunca ao CardInstance: irmãos -- Normal reverso,
// Cloze multi-marca -- compartilham a MESMA lista). Globais na conta, sem
// namespace por idioma, sem hierarquia. Estas funções são o ÚNICO ponto de
// limite/validação/filtro de tag do app -- editor, Anki, cópias e Review
// chamam daqui, nunca reimplementam.
const TAG_MAX_PER_NOTE = 20;
const TAG_MAX_LENGTH = 50;

// Valida uma coleção crua (após normalizeNoteTags). NUNCA trunca nem
// descarta em silêncio por limite: acima do limite devolve ok:false com a
// mensagem que a UI mostra. (O que normalizeNoteTags já fazia --
// deduplicar e descartar o que normaliza pra vazio -- continua sendo
// normalização, não "descarte por limite".)
// Etapa 3 (lote C): mensagem no idioma do site quando t() existe; sem ele (testes Node), o português de sempre.
function noteTagsErrorText(key, pt, params){
  if (typeof t === 'function'){
    const v = t(key, params);
    if (v && v !== key) return v;
  }
  return String(pt).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? String(params[k]) : m));
}
function validateNoteTags(rawTags){
  const tags = normalizeNoteTags(rawTags);
  const tooLong = tags.filter(t => t.length > TAG_MAX_LENGTH);
  if (tooLong.length){
    return { ok: false, tags, errorCode: 'tag_too_long',
      error: noteTagsErrorText('tags.err.tooLong', 'Tag muito longa (máximo {max} caracteres): "{tag}…".', { max: TAG_MAX_LENGTH, tag: tooLong[0].slice(0, 20) }) };
  }
  if (tags.length > TAG_MAX_PER_NOTE){
    return { ok: false, tags, errorCode: 'too_many_tags',
      error: noteTagsErrorText('tags.err.tooMany', 'Máximo de {max} tags por cartão (foram informadas {n}).', { max: TAG_MAX_PER_NOTE, n: tags.length }) };
  }
  return { ok: true, tags };
}

// ---------- Identity/Attribution: tag de SISTEMA `criado-por-*` ----------
// A tag de atribuição (`criado-por-[username]`, AT §10.3) é emitida SÓ pelo
// servidor (RPC copy_public_flashcard, migration 060) e protegida por
// trigger: o usuário não a cria, renomeia, apaga nem forja. NÃO é a fonte de
// verdade de identidade (isso é user_id): é a representação persistente
// exigida pela arquitetura. Estas funções são o espelho de UX dessa regra;
// a autoridade é o banco. O cliente NUNCA interpreta a tag para decidir
// identidade/permissão.
const ATTRIBUTION_TAG_PREFIX = 'criado-por';
function isAttributionTag(tag){
  const t = String(tag || '').trim().toLowerCase();
  return t === ATTRIBUTION_TAG_PREFIX || t.startsWith(ATTRIBUTION_TAG_PREFIX + '-');
}
// Remove tags de sistema de uma lista vinda de FORA (arquivo/link/Anki/
// payload colado): quem importa nunca recebe nem fabrica atribuição.
function stripSystemTags(rawTags){
  return (Array.isArray(rawTags) ? rawTags : []).filter(t => !isAttributionTag(normalizeTagSlug(t)));
}

// Para fluxos EM LOTE (importação do Anki, onde recusar a Note inteira
// seria pior que importar: mantém as tags válidas (na ordem, até o limite)
// e devolve EXPLICITAMENTE o que ficou de fora e por quê -- quem chama
// mostra isso ao usuário (nunca silencioso).
function partitionNoteTagsByLimits(rawTags){
  const all = normalizeNoteTags(rawTags);
  const kept = [];
  const dropped = [];
  all.forEach(t => {
    // Tag de sistema vinda de fora é DESCARTADA (e informada), nunca mantida.
    if (isAttributionTag(t)) dropped.push({ tag: t, reason: 'system_tag' });
    else if (t.length > TAG_MAX_LENGTH) dropped.push({ tag: t, reason: 'too_long' });
    else if (kept.length >= TAG_MAX_PER_NOTE) dropped.push({ tag: t, reason: 'over_limit' });
    else kept.push(t);
  });
  return { tags: kept, dropped };
}

// Filtro de Review por Tag: OR (pelo menos uma). Filtro vazio = sem
// restrição. Card sem tags (ex.: Study Trail) só passa com filtro vazio.
function cardMatchesTagFilter(card, filterTags){
  if (!Array.isArray(filterTags) || filterTags.length === 0) return true;
  const own = Array.isArray(card && card.tags) ? card.tags : [];
  return filterTags.some(t => own.includes(t));
}

// Tags distintas presentes num conjunto de cards, ordem alfabética.
function collectTagsFromCards(cards){
  const set = new Set();
  (cards || []).forEach(c => (Array.isArray(c.tags) ? c.tags : []).forEach(t => set.add(t)));
  return Array.from(set).sort();
}

// Cardinalidade de múltipla escolha nativa -- o motor valida, nunca confia
// só na UI (restrição explícita da autora: "não confie apenas na validação
// da UI"). Exatamente 1 Field role:'prompt', exatamente 1 role:'answer'
// (nunca o MESMO Field nos dois papéis), 1 a 3 role:'distractor'.
function validateMultipleChoiceFields(fields){
  const prompts = fields.filter(f => f.role === 'prompt');
  const answers = fields.filter(f => f.role === 'answer');
  const distractors = fields.filter(f => f.role === 'distractor');
  if (prompts.length !== 1) return { ok: false, error: `Múltipla escolha precisa de exatamente 1 Field com role 'prompt' (encontrado: ${prompts.length}).` };
  if (answers.length !== 1) return { ok: false, error: `Múltipla escolha precisa de exatamente 1 Field com role 'answer' (encontrado: ${answers.length}).` };
  if (prompts[0].id === answers[0].id) return { ok: false, error: 'O mesmo Field não pode ser prompt e resposta ao mesmo tempo.' };
  if (distractors.length < 1 || distractors.length > 3) return { ok: false, error: `Múltipla escolha precisa de 1 a 3 Fields com role 'distractor' (encontrado: ${distractors.length}).` };
  return { ok: true };
}

// Validação estrutural completa de uma linha nativa -- chamada por
// interpretNoteFromRow() ANTES de gerar qualquer CardInstance. Devolve
// {ok:false,error} em vez de lançar, pra ser testável isoladamente;
// interpretNoteFromRow() decide lançar a partir do resultado (ver abaixo).
function validateNativeNoteRow(row){
  const hasFields = isNoteFieldsPresent(row);
  const hasMode = isCardGenerationModePresent(row);
  if (hasFields !== hasMode){
    return { ok: false, error: 'fields e card_generation_mode precisam estar ambos presentes ou ambos ausentes (nunca só um).' };
  }
  if (!hasFields) return { ok: true, native: false };
  if (!Array.isArray(row.fields) || !row.fields.length){
    return { ok: false, error: 'fields precisa ser um array não vazio quando presente.' };
  }
  if (!CARD_GENERATION_MODES.includes(row.card_generation_mode)){
    return { ok: false, error: `card_generation_mode desconhecido: "${row.card_generation_mode}".` };
  }
  if (row.fields.some(f => !f || !f.id)){
    return { ok: false, error: 'Todo Field precisa ter um id.' };
  }
  const ids = row.fields.map(f => f.id);
  if (new Set(ids).size !== ids.length){
    return { ok: false, error: 'Fields precisam ter ids únicos dentro da mesma Note.' };
  }
  for (const f of row.fields){
    if (f.pinyinFieldId != null && !ids.includes(f.pinyinFieldId)){
      return { ok: false, error: `pinyinFieldId "${f.pinyinFieldId}" não corresponde a nenhum Field desta Note.` };
    }
  }
  if (row.card_generation_mode === 'multiple_choice'){
    const mc = validateMultipleChoiceFields(row.fields);
    if (!mc.ok) return mc;
  } else {
    // normal/normal_reversed/type_answer/cloze são todos posicionais (ver
    // contentFieldIndices abaixo) -- precisam de pelo menos 2 "slots" de
    // conteúdo, descontando Fields que só existem como par de pinyin de
    // outro Field.
    const slots = contentFieldIndices(row.fields);
    if (slots.length < 2){
      return { ok: false, error: `Este modo precisa de pelo menos 2 Fields de conteúdo, descontando pares de pinyin (encontrado: ${slots.length}).` };
    }
  }
  return { ok: true, native: true };
}

// Converte row.fields (persistido, pinyinFieldId por ID ESTÁVEL) pro shape
// runtime que resolveCardField() já consome (pinyinFieldIndex por ÍNDICE) --
// resolveCardField() não precisa de NENHUMA mudança, só esta função traduz
// id->índice uma vez, na leitura (e continua válida mesmo que a ordem dos
// Fields mude no editor, porque a referência persistida é sempre por id).
// `audio` é passado através sem transformação -- resolveCardField() já lê
// `.url` dele defensivamente (upload tem url, tts não tem, então nunca
// produz audioUrl automático -- correto, TTS é gerado em runtime pelo
// motor de pronúncia já existente, nunca guarda URL própria).
// `image` é só armazenado aqui (`field.image`), sem nenhuma resolução pra
// view/renderer ainda -- modelagem/persistência desta fase, comportamento
// visual fica pra Fase 6C/D (ver CLAUDE.md, decisão explícita da autora).
function buildNativeRuntimeFields(rawFields){
  const idToIndex = new Map(rawFields.map((f, i) => [f.id, i]));
  return rawFields.map(f => {
    const field = {
      lang: f.lang,
      text: (f.content && f.content.value) || '',
      role: f.role || null,
      audio: f.audio || null,
      image: f.image || null,
    };
    if (f.pinyinFieldId != null && idToIndex.has(f.pinyinFieldId)){
      field.pinyinFieldIndex = idToIndex.get(f.pinyinFieldId);
    }
    return field;
  });
}

function fieldIndexByRole(rawFields, role){
  return rawFields.findIndex(f => f.role === role);
}

// "Slot" posicional (front/back, prompt/answer, texto/tradução) pula
// Fields que são satélites de pinyin de outro Field -- mesmo espírito de
// audio/image (um Field de pinyin não é uma posição própria, é um anexo de
// outro Field; só é modelado como Field separado, em vez de inline, por
// herdar o shape que resolveCardField()/pinyinFieldIndex já usa desde a
// Fase 3). Sem isso, um Note zh de 3 Fields (hanzi+pinyin+tradução) teria
// "back" apontando pro Field de PINYIN (índice 1) em vez da tradução
// (índice 2) -- quebraria o mesmo convênio que o caminho legado já usa
// (ver ramo `else`, isZh: front=0, back=2, pulando o pinyin do meio).
// Nenhuma `role` envolvida aqui -- é puramente estrutural (quem é alvo de
// pinyinFieldId de outro Field nunca conta como slot de conteúdo).
function contentFieldIndices(rawFields){
  const pinyinTargetIds = new Set(rawFields.filter(f => f.pinyinFieldId != null).map(f => f.pinyinFieldId));
  const indices = [];
  rawFields.forEach((f, i) => { if (!pinyinTargetIds.has(f.id)) indices.push(i); });
  return indices;
}

// Gera { note, cards } a partir de uma linha NATIVA já validada por
// validateNativeNoteRow(). Mesmo shape de retorno do caminho legado -- todo
// consumidor a jusante (buildEngineCardsFromRow, resolveCardContentView, os
// resolvers) já é agnóstico a qual dos dois caminhos produziu a Note --
// nenhum deles precisa de nenhuma mudança por causa desta função existir.
function interpretNativeNoteFromRow(row, { origin, appKey, idPrefix, cardId }){
  const rawFields = row.fields;
  const fields = buildNativeRuntimeFields(rawFields);
  const note = {
    id: cardId,
    legacyRowId: row.id,
    origin,
    languageAppKey: appKey,
    status: row.status,
    note: row.note || null,
    // Fase 6B -- imagem nativa vive no FIELD agora (ver buildNativeRuntimeFields),
    // não na Note -- "imagem como propriedade exclusiva da Note" foi
    // explicitamente rejeitado pela autora. Note.image continua existindo
    // só pro caminho LEGADO (ramo `else`, intocado) -- nunca populado aqui.
    image: null,
    fields,
    fieldOrder: fields.map((_, i) => i),
  };

  const mode = row.card_generation_mode;

  if (mode === 'multiple_choice'){
    const promptIdx = fieldIndexByRole(rawFields, 'prompt');
    const answerIdx = fieldIndexByRole(rawFields, 'answer');
    const distractorTexts = rawFields
      .filter(f => f.role === 'distractor')
      .map(f => (f.content && f.content.value) || '');
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'multiple_choice',
      promptFieldIndex: promptIdx, correctFieldIndex: answerIdx, distractors: distractorTexts,
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards };
  }

  // normal/normal_reversed/type_answer/cloze são todos posicionais --
  // "slot" 0 = front/prompt/texto-cloze, slot 1 = back/answer/tradução,
  // PULANDO Fields que são satélite de pinyin de outro Field (ver
  // contentFieldIndices -- é o que faz um Note zh de 3 Fields resolver
  // front=hanzi/back=tradução, sem cair no Field de pinyin do meio,
  // exatamente como o caminho legado já faz). validateNativeNoteRow() já
  // garantiu slots.length>=2 antes de chegar aqui.
  const slots = contentFieldIndices(rawFields);

  if (mode === 'type_answer'){
    // Fase 6B -- primeiro tipo genuinamente novo no motor (nenhum dado
    // legado jamais representou "digite a resposta", é 100% nativo, sem
    // caminho de inferência implícita correspondente no ramo `else`).
    // compareAnswer NÃO é gravado aqui como campo próprio -- reaproveita o
    // MESMO pareamento hanzi/pinyin que Normal já usa via pinyinFieldIndex
    // (ver resolveTypeAnswerCardView, que ganhou um fallback novo pra
    // isso): o Field de resposta pode ter um pinyinFieldIndex, e o
    // resolver cai pra ele -- nenhum canal de comparação novo inventado.
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'type_answer',
      promptFieldIndex: slots[0], answerFieldIndex: slots[1],
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards };
  }

  if (mode === 'cloze'){
    // slots[0] é o texto com as marcas {{cN::...}} -- mesmo convênio
    // posicional do caminho legado (textFieldIndex:0), só a FONTE do texto
    // muda (Field nativo em vez da coluna cloze_sentence). Mecanismo de
    // marcas (parseClozeMarks/renderClozeText) inalterado, já validado na
    // Fase 5 -- reaproveitado aqui sem nenhuma mudança.
    const text = fields[slots[0]].text;
    const marks = parseClozeMarks(text);
    const cards = marks.map(mark => ({
      id: `${cardId}-${mark.id}`, noteId: cardId, cardTypeId: 'cloze', markId: mark.id,
      textFieldIndex: slots[0], translationFieldIndex: slots[1],
      compareAnswer: null, // idem legado -- resolveClozeCardView() cai pro compareAnswer embutido na própria marca (mark.compareAnswer)
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }));
    return { note, cards };
  }

  if (mode === 'normal_reversed'){
    // buildReversedCardInstancePair já existe desde a Fase 4a, reaproveitada
    // sem nenhuma mudança -- só os índices passados agora respeitam
    // contentFieldIndices() em vez de 0/1 fixos.
    const cards = buildReversedCardInstancePair(cardId, slots[0], slots[1]);
    return { note, cards };
  }

  // mode === 'normal'
  const cards = [{
    id: cardId, noteId: cardId, cardTypeId: 'normal',
    frontFieldIndex: slots[0], backFieldIndex: slots[1],
    ...FLASHCARD_MODEL_FSRS_DEFAULTS,
  }];
  return { note, cards };
}

// ---------- O adapter ----------
// row: linha crua de teacher_flashcards/own_flashcards.
// opts.origin: 'teacher' | 'self'
// opts.appKey: 'frances' | 'mandarim' (== APP_KEY do site)
// opts.idPrefix: 't' | 's' (mesmo prefixo que flashcardIdForRow já usa)
//
// Devolve { note, cards }:
//   - note: Note (Fase 2 v2)
//   - cards: array de CardInstance (sempre 1 elemento pra dado legado --
//     Cloze com múltiplas lacunas nunca ocorre aqui, porque cloze_sentence
//     só suporta um "___" por natureza da coluna antiga)
// Fase 4d (ver CLAUDE.md): a ponte pro shape legado plano
// (bridgeNoteCardsToLegacyShape/legacyFlashcardRowToCard/legacyRaw) foi
// removida -- o fluxo real agora é sempre Note+CardInstance ->
// resolveCardField() -> renderer/feature (ver seção "Fase 4b" abaixo),
// nunca mais um objeto legado intermediário.
function interpretNoteFromRow(row, opts){
  const { origin, appKey, idPrefix } = opts;
  const isZh = LanguageRegistry.isCjk(appKey);
  const studyLang = STUDY_LANG_FOR_APP_KEY[appKey];
  const translationLang = legacyTranslationLang(opts);
  const cardId = flashcardIdForRow(idPrefix, row);

  // Fase 6B (ver CLAUDE.md) -- Note NATIVA: fields+card_generation_mode
  // (snake_case, nome real de coluna decidido nesta fase) sempre PAREADOS.
  // Presença de só um dos dois é estado inválido, rejeitado por
  // validateNativeNoteRow() -- o motor nunca confia só no CHECK constraint
  // proposto pra migration (ainda NÃO aplicada), valida de novo aqui.
  // Ramo curto-circuita ANTES de qualquer lógica legada abaixo -- nenhuma
  // linha com fields populado toca no código que segue.
  if (isNoteFieldsPresent(row) || isCardGenerationModePresent(row)){
    const validation = validateNativeNoteRow(row);
    if (!validation.ok) throw new Error(`Note nativa inválida (linha id=${row.id}): ${validation.error}`);
    return interpretNativeNoteFromRow(row, { origin, appKey, idPrefix, cardId });
  }

  // Inferência implícita de sempre (Fase 3), pro dado 100% legado (sem
  // fields) -- comportamento intocado.
  //
  // Fase 6B, mudança em relação à Fase 5: o mecanismo `row.cardGenerationMode`
  // (camelCase, só em memória de teste -- nunca existiu como coluna SQL)
  // que permitia "normal_reversed sobre colunas legadas soltas, sem
  // fields" foi RETIRADO. A própria Fase 5 já registrava esse nome como
  // provisório ("o nome físico da coluna fica pra Fase 6") -- agora que a
  // Fase 6B decide o nome real (`card_generation_mode`, sempre pareado com
  // `fields`), manter os 2 mecanismos vivos ao mesmo tempo criaria duas
  // fontes de verdade pro mesmo conceito, exatamente o que este projeto
  // evita sistematicamente (ver princípio geral no topo do CLAUDE.md).
  // Nenhuma linha real jamais usou esse campo -- retirada sem impacto em
  // produção. Quem quiser normal_reversed agora usa uma Note nativa
  // (fields+card_generation_mode), não mais um flag solto sobre colunas
  // legadas -- testes que exercitavam o mecanismo antigo foram
  // atualizados/substituídos (ver relatório desta fase).
  const isCloze = !!row.cloze_sentence;
  const isMC = !isCloze && !!(row.choices && row.choices.length);
  const cardTypeId = isCloze ? 'cloze' : isMC ? 'multiple_choice' : 'normal';

  const noteBase = {
    id: cardId,                 // legado: Note.id == id do CardInstance principal (ver ressalva de IDs abaixo)
    legacyRowId: row.id,        // numérico, cru -- mesma info que `rowId` já carregava antes desta fase
    origin,
    languageAppKey: appKey,
    status: row.status,
    note: row.note || null,
    // Achado desta fase (ver relatório): image_url legado NUNCA foi
    // vinculado a um lado específico -- é ilustração do conceito inteiro,
    // não de um Field. Fica no nível da Note, não de um Field individual
    // (Field.image continua existindo no modelo pra uso futuro do editor
    // novo, Fase 6+, só não é usado por este adapter).
    image: row.image_url ? { url: row.image_url } : null,
  };

  if (isCloze){
    // Fase 5 (ver CLAUDE.md) -- detecção estrutural, não depende de
    // explicitMode: se cloze_sentence já contém marcação nativa
    // {{cN::...}}, ela é a ÚNICA fonte de verdade pra geração -- nunca
    // misturada com cloze_answer/cloze_answer_pinyin legados da mesma
    // linha (ajuste explícito da autora). Nenhum dado legado real produz
    // isso hoje (schema antigo só permite "___", nunca "{{c") -- só uma
    // linha construída por um editor futuro (Fase 6) ou por teste.
    const hasNativeMarks = /\{\{c\d+::/.test(row.cloze_sentence || '');
    if (hasNativeMarks){
      // Um CardInstance por cN distinto -- id/FSRS/histórico próprios
      // pra cada um (`${cardId}-${markId}`, nunca colide com `-b` de
      // normal_reversed nem com `-r{revision}` de edição). A sintaxe
      // {{cN::texto}}/{{cN::texto|compareAnswer}} é representação
      // INTERNA apenas -- a professora nunca digita isso à mão, quem
      // gera é o editor visual (Fase 6, fora do escopo aqui).
      const text = row.cloze_sentence;
      const textField = { lang: isZh ? 'zh' : studyLang, text };
      if (row.audio_url) textField.audio = { url: row.audio_url, type: 'upload' };
      const note = {
        ...noteBase,
        fields: [
          textField,
          { lang: translationLang, text: row.back_trans },
        ],
        fieldOrder: [0, 1],
      };
      const marks = parseClozeMarks(text);
      const cards = marks.map(mark => ({
        id: `${cardId}-${mark.id}`, noteId: cardId, cardTypeId: 'cloze', markId: mark.id,
        textFieldIndex: 0, translationFieldIndex: 1,
        // compareAnswer null de propósito -- resolveClozeCardView() cai
        // pro compareAnswer embutido na própria marca (mark.compareAnswer,
        // extraído do "|" por parseClozeMarks), nunca lê cloze_answer_pinyin
        // aqui (seria misturar as duas fontes, proibido pelo ajuste 3).
        compareAnswer: null,
        ...FLASHCARD_MODEL_FSRS_DEFAULTS,
      }));
      return { note, cards };
    }

    // ÚNICO trecho que ainda conhece cloze_sentence/cloze_answer/
    // cloze_answer_pinyin (caminho legado, "___" -- inalterado desde a
    // Fase 3) -- reconstrói a sintaxe {{c1::...}} na hora.
    // zh: o que a aluna DIGITA é pinyin (cloze_answer_pinyin), o que está
    // de fato escrito na frase e é revelado depois é hanzi (cloze_answer)
    // -- por isso a marcação embute o hanzi (é o conteúdo real da frase)
    // e `compareAnswer` no CardInstance guarda separadamente o valor de
    // comparação quando ele difere do texto embutido (só acontece no zh).
    const text = row.cloze_sentence.replace('___', `{{c1::${row.cloze_answer}}}`);
    const textField = { lang: isZh ? 'zh' : studyLang, text };
    // Áudio próprio em cartão cloze é renderizado por renderClozeReviewCard
    // (confirmado na auditoria da Fase 0/1) -- precisa sobreviver à ponte
    // igual ao caso normal/MC abaixo, vinculado ao único Field que
    // representa o idioma estudado (o campo de texto com a lacuna).
    if (row.audio_url) textField.audio = { url: row.audio_url, type: 'upload' };
    const note = {
      ...noteBase,
      fields: [
        textField,
        { lang: translationLang, text: row.back_trans },
      ],
      fieldOrder: [0, 1],
    };
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'cloze', markId: 'c1',
      textFieldIndex: 0, translationFieldIndex: 1,
      compareAnswer: isZh ? (row.cloze_answer_pinyin || '') : null,
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards };
  }

  // Normal / Múltipla escolha -- mesmo par de Fields (frente/verso); só o
  // CardInstance difere entre os dois tipos.
  let fields, frontFieldIndex, backFieldIndex;
  if (isZh){
    // zh nunca inverte (Fase 0/1 da auditoria: front_is_target_language
    // nunca é lido em zh/app.js) -- hanzi sempre no índice 0, junto do
    // pinyin (pinyinFieldIndex), tradução sempre no índice 2.
    fields = [
      { lang: 'zh', text: row.front, pinyinFieldIndex: 1 },
      { lang: 'zh-pinyin', text: row.front_pinyin || '' },
      { lang: translationLang, text: row.back_trans },
    ];
    frontFieldIndex = 0; backFieldIndex = 2;
  } else {
    // fr: a coluna `front` do banco sempre mapeia pro índice 0 (é
    // literalmente "o que a professora digitou na caixa Frente") --
    // front_is_target_language decide só o IDIOMA de cada índice, NUNCA
    // a posição (posição continua fixa: [0]=front,[1]=back, exatamente
    // como a coluna do banco já era).
    fields = [
      { lang: studyLang, text: row.front },
      { lang: translationLang, text: row.back_trans },
    ];
    frontFieldIndex = 0; backFieldIndex = 1;
    if (row.front_is_target_language === false){
      fields[0].lang = translationLang;
      fields[1].lang = studyLang;
    }
  }

  // Áudio -- heurística de INTERPRETAÇÃO de dado histórico, não uma regra
  // de runtime (ver ressalva da autora no topo do arquivo): audio_url
  // legado nunca foi explicitamente vinculado a um lado (Fase 0: era
  // renderizado fora da estrutura frente/verso, sempre visível). A única
  // leitura consistente com a intenção original (pronúncia do idioma
  // estrangeiro) é vincular ao campo cujo idioma é o estudado.
  // isStudyLanguageField() é usado aqui UMA vez, só pra interpretar este
  // dado histórico -- cartões autorados pelo editor novo (Fase 6+) vão
  // gravar o áudio explicitamente no Field certo, sem depender disto.
  if (row.audio_url){
    const studyIdx = fields.findIndex(f => isStudyLanguageField(f, appKey));
    if (studyIdx >= 0) fields[studyIdx].audio = { url: row.audio_url, type: 'upload' };
  }

  const note = { ...noteBase, fields, fieldOrder: fields.map((_, i) => i) };

  // Fase 6B -- normal_reversed sobre colunas legadas soltas foi retirado
  // (ver comentário no topo desta função); pra reverso, use uma Note
  // nativa (fields+card_generation_mode:'normal_reversed'), que já
  // reaproveita buildReversedCardInstancePair() no ramo nativo acima.
  const cards = [{
    id: cardId, noteId: cardId, cardTypeId,
    frontFieldIndex, backFieldIndex,
    ...(isMC ? {
      promptFieldIndex: frontFieldIndex,
      correctFieldIndex: backFieldIndex,
      distractors: row.choices,
    } : {}),
    ...FLASHCARD_MODEL_FSRS_DEFAULTS,
  }];
  return { note, cards };
}

// ============================================================
// Fase 4 do prompt-mestre "reestruturação inspirada no Anki" (ver
// CLAUDE.md) -- MOTOR DE TIPOS/TEMPLATES.
//
// 4d (concluída): a ponte pro shape legado plano
// (bridgeNoteCardsToLegacyShape/legacyFlashcardRowToCard/legacyRaw) foi
// REMOVIDA -- não existe mais nenhum objeto legado intermediário em
// nenhum ponto do sistema. buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard (fr/zh app.js) chamam buildEngineCardsFromRow()
// diretamente; todo consumidor (renderizadores de Revisão, Speed Review,
// Combinar, export Anki) lê `note`/`cardInstance` via
// resolveCardField()/resolveCardContentView(), nunca um campo de conteúdo
// solto tipo `card.front`/`card.choices`/`card.clozeSentence`.
//
// Princípio central, travado pela autora (Fase 4, restrições 2-5): o fluxo
// final é
//     Note + CardInstance -> resolveCardField() -> renderer/feature
// nunca
//     Note + CardInstance -> objeto legado/shape intermediário -> renderer
// resolveCardField() é o ÚNICO ponto que projeta um Field pra texto/áudio
// exibível -- nenhum renderer (ou Speed Review/Combinar/export Anki, a
// partir de 4c) deve ler `note.fields[i]` direto.
// ============================================================

// Catálogo dos 5 tipos previstos nesta fase -- só documentação/referência,
// não uma tabela de despacho (o despacho de verdade mora em cada
// renderer/feature, olhando `cardInstance.cardTypeId`). "Normal com
// reverso" NÃO tem um cardTypeId próprio -- ver buildReversedCardInstancePair()
// logo abaixo pra explicação de por quê.
const CARD_TYPE_IDS = Object.freeze({
  NORMAL: 'normal',
  TYPE_ANSWER: 'type_answer',
  CLOZE: 'cloze',
  MULTIPLE_CHOICE: 'multiple_choice',
});

// ---------- resolveCardField() -- o único ponto de projeção Field->exibição ----------
// Devolve o texto/pinyin/áudio/imagem de UM Field, dado seu índice dentro
// de note.fields. Nunca decide direção (isso já foi decidido antes, por
// quem escolheu QUAL índice passar aqui -- o CardInstance) nem lê `lang`
// pra inferir front/back/template -- só devolve o que o Field já carrega.
// `field.pinyinFieldIndex` (zh) é resolvido aqui pra nenhum chamador
// precisar saber que hanzi/pinyin são 2 Fields relacionados.
//
// Fase 7a (ver CLAUDE.md) -- `imageUrl` passou a ser resolvido aqui
// também, exatamente pelo mesmo padrão de `audioUrl` (só lê `field.image.url`
// defensivamente, nunca inventa nada). Antes desta fase, imagem SÓ existia
// no nível da Note (`note.image`, caminho legado) -- `field.image` já era
// persistido desde a Fase 6B mas nunca chegava a lugar nenhum de exibição.
// `resolveCardField()` continua sendo o ÚNICO ponto de projeção Field->
// exibição -- nenhuma segunda função de "resolver imagem" foi criada.
//
// Fase 7b (ver CLAUDE.md) -- `audioUrl` passou a ser calculado via
// resolveFieldAudioUrl() (definida acima, junto do contrato de
// Field.audio), em vez da leitura inline `(field.audio && field.audio.url)
// || null` -- mesmo resultado pra todo dado já existente (upload/url
// sempre tinham `.url`), mas agora também resolve corretamente
// `type:'tts'` (usa `generatedUrl` se já existir, `null` senão -- nunca
// gera nada aqui) e `type:'recording'` (idem `upload`, `url` nullable).
// A View devolvida por resolveCardField() continua expondo só o ATIVO
// resolvido (`audioUrl`, uma URL ou null) -- nunca a CONFIGURAÇÃO
// completa de `field.audio` (ex: `language`/`voiceId`/`generationKey` do
// modo TTS não aparecem aqui, de propósito: quem precisar da
// configuração pra oferecer uma UI de edição/geração lê `field.audio`
// direto, nunca por meio desta view de exibição).
function resolveCardField(note, fieldIndex){
  if (fieldIndex === null || fieldIndex === undefined) return null;
  const field = note.fields[fieldIndex];
  if (!field) return null;
  const pinyinField = field.pinyinFieldIndex !== undefined && field.pinyinFieldIndex !== null
    ? note.fields[field.pinyinFieldIndex] : null;
  return {
    text: field.text,
    lang: field.lang,
    pinyinText: pinyinField ? pinyinField.text : null,
    audioUrl: resolveFieldAudioUrl(field.audio),
    imageUrl: (field.image && field.image.url) || null,
  };
}

// ---------- Elegibilidade de pronúncia automática (TTS) ----------
// Ressalva importante, sinalizada explicitamente no checkpoint da Fase 4a
// (não decidida em silêncio): a restrição da autora ("lang nunca decide se
// deve existir áudio") é sobre usar `lang` pra inventar DIREÇÃO/estrutura
// (ex: "este campo é lang==studyLang, então ele É o front") -- isso
// continua proibido, e resolveCardField() acima não faz isso em nenhum
// caso. Esta função aqui é uma categoria DIFERENTE de decisão: o motor de
// pronúncia do app (speakFrench()/AUDIO_MANIFEST, fr/app.js -- não
// reconstruído nesta fase, restrição 7) só sabe falar UM idioma real;
// chamá-lo sobre texto que não está nesse idioma produziria pronúncia
// errada (voz francesa lendo português), não uma escolha de
// apresentação. `lang` aqui é consultado como propriedade INTRÍNSECA do
// próprio Field (o mesmo tipo de checagem que já se faz sobre `field.text`
// em si), nunca pra decidir qual campo É o front/back -- isso o
// CardInstance já decidiu antes de resolveCardField() ser chamado.
// audio_url explícito (upload) sempre conta como "tem áudio", em
// QUALQUER idioma -- só a tentativa de TTS AUTOMÁTICO depende do idioma
// real do campo.
function fieldHasAudio(resolvedField, appKey){
  if (!resolvedField) return false;
  if (resolvedField.audioUrl) return true;
  return resolvedField.lang === STUDY_LANG_FOR_APP_KEY[appKey];
}

// ---------- Resolvers por Card Type ----------
// Cada um devolve só texto/áudio já resolvido (via resolveCardField) --
// nenhum HTML, nenhuma decisão de tela. O renderer (fr/zh app.js, Fase
// 4b/4c) decide como desenhar isso; este arquivo nunca sabe de DOM.

// Normal -- também usado pelas DUAS CardInstance de um par "Normal com
// reverso" (ver buildReversedCardInstancePair) -- mecanicamente idênticas,
// só com frontFieldIndex/backFieldIndex trocados entre si.
function resolveNormalCardView(note, cardInstance){
  return {
    front: resolveCardField(note, cardInstance.frontFieldIndex),
    back: resolveCardField(note, cardInstance.backFieldIndex),
  };
}

function resolveMultipleChoiceCardView(note, cardInstance){
  const prompt = resolveCardField(note, cardInstance.promptFieldIndex);
  const correct = resolveCardField(note, cardInstance.correctFieldIndex);
  return {
    prompt,
    // `correct` (Field resolvido inteiro, com audioUrl) fica disponível pro
    // renderer buscar áudio próprio em qualquer um dos 2 lados -- a
    // heurística de interpretação (Fase 3) vincula o upload ao campo cujo
    // idioma é o estudado, que pode ser prompt OU correct dependendo da
    // direção do cartão. `correctText` continua exposto solto por
    // conveniência (é o que a maioria dos chamadores só precisa).
    correct,
    correctText: correct ? correct.text : '',
    distractorTexts: cardInstance.distractors || [],
  };
}

// "Digite a resposta" -- novo nesta fase, sem dado legado (nenhuma coluna
// de teacher_flashcards/own_flashcards jamais pediu este tipo). Estrutura
// deliberadamente próxima da de Cloze (promptFieldIndex/answerFieldIndex
// em vez de textFieldIndex/markId, porque não há lacuna embutida numa
// frase -- é pergunta inteira -> resposta digitada inteira) -- mesmo
// mecanismo de comparação (compareAnswer opcional, pro caso zh em que o
// que se digita, pinyin, difere do que se revela, hanzi).
function resolveTypeAnswerCardView(note, cardInstance){
  const prompt = resolveCardField(note, cardInstance.promptFieldIndex);
  const answer = resolveCardField(note, cardInstance.answerFieldIndex);
  const displayAnswerText = answer ? answer.text : '';
  // Fase 6B (ver CLAUDE.md) -- compareAnswer pro zh reaproveita o MESMO
  // pareamento hanzi/pinyin que resolveCardField() já resolve pra QUALQUER
  // Field (pinyinFieldIndex) -- não um canal de comparação próprio deste
  // tipo. cardInstance.compareAnswer explícito continua tendo prioridade
  // (mantém a mesma flexibilidade de antes, testada na Fase 4a), mas nenhum
  // caminho de geração hoje (legado nem nativo) o define pra type_answer --
  // é sempre null/undefined nesse caso, então a cadeia cai pro pinyin do
  // Field de resposta (zh) ou pro próprio texto da resposta (fr, sem
  // pinyin) -- mesmo espírito já usado por Normal/resolveNormalCardView.
  const compareAnswerText = (cardInstance.compareAnswer !== null && cardInstance.compareAnswer !== undefined)
    ? cardInstance.compareAnswer
    : (answer && answer.pinyinText ? answer.pinyinText : displayAnswerText);
  // Fase 7a (ver CLAUDE.md) -- `answer` (o Field resolvido inteiro, com seu
  // próprio audioUrl/imageUrl) passa a ser devolvido, não só descartado
  // depois de extrair `displayAnswerText`/`pinyinText` dele -- achado #2 da
  // auditoria da Fase 7 (mídia da resposta nunca chegava ao renderer, mesmo
  // que o Field a tivesse). O renderer decide QUANDO mostrar (só depois de
  // revelada -- nunca antes, seria vazar a resposta pelo ouvido/imagem).
  return { prompt, answer, displayAnswerText, compareAnswerText };
}

// Cloze -- reaproveita parseClozeMarks/renderClozeText já existentes
// (sintaxe {{cN::...}}, nunca cloze_sentence/cloze_answer aqui). Devolve a
// frase com TODAS as marcações ainda embutidas (`rawSentenceText`) -- quem
// desenha decide se usa renderClozeText pra ocultar/revelar a lacuna alvo.
function resolveClozeCardView(note, cardInstance){
  // Fase 7a (ver CLAUDE.md) -- passou a resolver o Field de texto via
  // resolveCardField() (antes lia `.audio.url` direto do Field cru, nunca
  // considerava imagem) -- mesmo ÚNICO ponto de projeção Field->exibição
  // que todo o resto do motor já usa, nenhuma segunda leitura de imagem/
  // áudio inventada aqui. Como TODAS as CardInstance (c1/c2/...) de uma
  // mesma Note compartilham o MESMO textFieldIndex, elas naturalmente
  // resolvem a MESMA origem de mídia -- nunca um áudio/imagem diferente
  // por lacuna, sem precisar de nenhum código especial pra garantir isso.
  const textFieldView = resolveCardField(note, cardInstance.textFieldIndex);
  const translation = resolveCardField(note, cardInstance.translationFieldIndex);
  const marks = parseClozeMarks(textFieldView.text);
  const mark = marks.find(m => m.id === cardInstance.markId) || marks[0];
  const displayAnswerText = mark ? mark.answer : '';
  // Fase 5 -- prioridade de compareAnswer: cardInstance.compareAnswer
  // explícito (caminho legado, vem de cloze_answer_pinyin) vence; senão
  // cai pro compareAnswer embutido na própria marca (mark.compareAnswer,
  // extraído do "|" por parseClozeMarks -- caminho nativo multi-marca);
  // senão usa o próprio texto da marca (fr sem pinyin, nos dois caminhos).
  // Nunca mistura cloze_answer_pinyin legado com marca nativa da mesma
  // nota -- as duas fontes já são mutuamente exclusivas por construção em
  // interpretNoteFromRow() (uma nota ou é 100% legada ou 100% nativa).
  const compareAnswerText = (cardInstance.compareAnswer !== null && cardInstance.compareAnswer !== undefined)
    ? cardInstance.compareAnswer
    : (mark && mark.compareAnswer !== null && mark.compareAnswer !== undefined ? mark.compareAnswer : displayAnswerText);
  return {
    rawSentenceText: textFieldView.text,
    markId: cardInstance.markId,
    audioUrl: textFieldView.audioUrl,
    imageUrl: textFieldView.imageUrl,
    translation,
    displayAnswerText,
    compareAnswerText,
  };
}

// ---------- "Normal com reverso" ----------
// Decisão arquitetural (reportada explicitamente no checkpoint 4a, não
// presumida): NÃO existe um cardTypeId `normal_reversed` -- uma Note
// reversível gera 2 CardInstance, cada uma com cardTypeId:'normal'
// (renderizadas pelo MESMO resolveNormalCardView acima), só com
// frontFieldIndex/backFieldIndex trocados entre si. É fiel ao Anki real
// (a note type "Basic and reversed card" gera Card 1 e Card 2, as duas
// usando o mesmo template "Card", só com Frente/Verso invertidos -- não
// um template distinto) e evita inventar uma 6ª forma de renderizar
// quando a lógica já é idêntica à de "Normal".
// Sufixo de id `-b` (nunca `-r{revision}`, que já significa "cartão
// editado" desde a Fase 8) -- garante que as 2 metades do par nunca
// colidem entre si nem com o mecanismo de reset-por-edição já existente.
// Pura/independente -- não chamada por interpretNoteFromRow() (nenhuma
// linha legada jamais pediu isto, não há coluna pra "reversível" em
// teacher_flashcards/own_flashcards) -- existe pronta pro editor futuro
// (Fase 6+, fora do escopo desta fase) poder gerar uma Note reversível.
function buildReversedCardInstancePair(noteId, frontFieldIndex, backFieldIndex){
  return [
    { id: noteId, noteId, cardTypeId: CARD_TYPE_IDS.NORMAL, frontFieldIndex, backFieldIndex, ...FLASHCARD_MODEL_FSRS_DEFAULTS },
    { id: `${noteId}-b`, noteId, cardTypeId: CARD_TYPE_IDS.NORMAL, frontFieldIndex: backFieldIndex, backFieldIndex: frontFieldIndex, ...FLASHCARD_MODEL_FSRS_DEFAULTS },
  ];
}

// ============================================================
// Fase 4b -- caminho REAL de construção de STATE.cards (substitui
// legacyFlashcardRowToCard() como o que buildCardFromTeacherFlashcard()/
// buildCardFromSelfFlashcard() de fato chamam a partir de agora).
// ============================================================

// Constrói o(s) card(s) nativos pro STATE.cards a partir de uma linha
// legada. Diferença central em relação à ponte (Fase 3): NENHUM campo de
// conteúdo (front/back_trans/clozeSentence/choices/frontIsTargetLanguage/
// audioUrl de Field) é reconstruído solto no card -- `note`+`cardInstance`
// vão INTEIROS, e quem precisar de texto/áudio passa por
// resolveCardField()/resolveCardContentView() abaixo, nunca lendo
// `card.front` etc. (esse campo simplesmente não existe mais no objeto).
//
// Campos FSRS continuam FLAT no nível de topo do card -- mesmo lugar de
// sempre, porque shared/fsrs.js (não tocado nesta fase, restrição da
// autora) lê/escreve ali direto (`applyMemoryGrade(card, grade)` muta
// `card.due`/`card.stability`/etc. do objeto que se passa a ele). Por
// isso eles são DESTRUCTURADOS pra fora do CardInstance bruto aqui --
// `cardInstance` guardado no card carrega só identidade/apresentação
// (id/cardTypeId/índices de campo), nunca uma 2ª cópia dos campos FSRS
// que iria dessincronizar da cópia real assim que a 1ª revisão acontecer.
//
// Devolve um ARRAY -- hoje sempre 1 elemento pra dado legado (nenhuma
// linha jamais pediu "Normal com reverso"), mas o formato já é o que
// "Normal com reverso"/multi-CardInstance vai precisar quando o editor
// existir (Fase 6+).
function buildEngineCardsFromRow(row, opts){
  const { note, cards } = interpretNoteFromRow(row, opts);
  const originTitleKey = note.origin === 'teacher' ? 'teacher' : 'self';
  const unitTitle = FLASHCARD_ORIGIN_TITLES_PT[originTitleKey];
  const unitTitleKey = FLASHCARD_ORIGIN_TITLE_KEYS[originTitleKey];
  // Tags (CONSOLIDAÇÃO-5) -- pertencem à Note, nunca à CardInstance.
  // Lidas direto de `row` (nunca via interpretNoteFromRow()/
  // interpretNativeNoteFromRow(), que continuam sem ler tags -- essa
  // exclusão é intencional e documentada na seção "Tags" acima). Mesmo
  // "bucket" de metadado Note-level que rowId/teacherNote/imageUrl já
  // usam aqui. Normalizadas 1x por linha via a única implementação
  // canônica (normalizeTagSlug/normalizeNoteTags) -- nunca reimplementada
  // -- e aplicadas idênticas a toda CardInstance derivada da mesma Note
  // (normal_reversed, Cloze multi-marca): nunca uma 2ª fonte de verdade,
  // nunca tags divergentes entre irmãs da mesma Note.
  const tags = normalizeNoteTags(row.tags);
  return cards.map(rawCardInstance => {
    const {
      id, noteId, cardTypeId,
      ef, interval, reps, due, lapses, stability, difficulty, state, lastReview, fsrsReps, fsrsLapses,
      ...presentationFields
    } = rawCardInstance;
    const cardInstance = { id, noteId, cardTypeId, ...presentationFields };
    return {
      id,
      rowId: note.legacyRowId,
      unitId: null,
      unitTitle,
      unitTitleKey,
      vocabIdx: null,
      type: 'vocab',
      origin: note.origin,
      teacherNote: note.note,
      flashcardStatus: note.status,
      // Note-level (nunca de um Field específico -- achado da Fase 3,
      // confirmado de novo aqui): imagem ilustra o conceito inteiro.
      imageUrl: note.image ? note.image.url : null,
      tags,
      // Deck (Fase C, "Decks, Tags e Painel") -- mesmo bucket Note-level
      // de tags/imageUrl acima, nunca lido por interpretNoteFromRow()
      // (Deck nunca é conteúdo pedagógico, regra 2.3 do prompt-mestre).
      // null pra qualquer linha ainda não organizada (todo dado legado
      // hoje) ou pra cartão de trilha (que nem passa por esta função) --
      // é isto que shared/deck-engine.js::getStudyScopeForDeck() usa pra
      // filtrar STATE.cards por subtree de Deck.
      deckId: row.deck_id != null ? row.deck_id : null,
      // Professora dona do cartão (só origin 'teacher'): a aba Aluno > Revisão só mostra os cartões da professora com
      // vínculo ATIVO (decisão da autora, 2026-10-15). O cartão continua em STATE.cards (e salvo) para o progresso não se perder.
      teacherId: row.teacher_id || null,
      note,
      cardInstance,
      ef, interval, reps, due, lapses, stability, difficulty, state, lastReview, fsrsReps, fsrsLapses,
    };
  });
}

// Dispatcher único -- dado um card de STATE.cards já construído por
// buildEngineCardsFromRow(), devolve a "view" de conteúdo certa pro tipo
// dele (ver resolvers acima). É o ponto de entrada que renderers/Speed
// Review/Combinar/export Anki (Fase 4b/4c) chamam -- nunca despacham por
// conta própria olhando `card.choices`/`card.clozeSentence` (esses campos
// não existem mais no card nativo).
function resolveCardContentView(card){
  const { note, cardInstance } = card;
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.MULTIPLE_CHOICE){
    return { kind: CARD_TYPE_IDS.MULTIPLE_CHOICE, ...resolveMultipleChoiceCardView(note, cardInstance) };
  }
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.TYPE_ANSWER){
    return { kind: CARD_TYPE_IDS.TYPE_ANSWER, ...resolveTypeAnswerCardView(note, cardInstance) };
  }
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.CLOZE){
    return { kind: CARD_TYPE_IDS.CLOZE, ...resolveClozeCardView(note, cardInstance) };
  }
  return { kind: CARD_TYPE_IDS.NORMAL, ...resolveNormalCardView(note, cardInstance) };
}

// ============================================================
// Fase 7i (ver CLAUDE.md) -- resolução de mídia para EXPORTAÇÃO ANKI
// ============================================================
//
// resolveCardExportMedia(card) -- mesma pergunta que os 4 renderers de
// Revisão/Preview (Fase 6C/7a) já respondem, só que num único ponto PURO
// e language-agnostic, reutilizado pelo exportador Anki
// (ANKI_EXPORT_CONFIG, fr/zh app.js + shared/anki-export.js) em vez de
// reimplementar a mesma lógica de novo. NUNCA gera nada -- só resolve
// URLs JÁ existentes via resolveCardContentView()/resolveFieldAudioUrl()
// (pra `type:'tts'`, resolveFieldAudioUrl() só devolve `generatedUrl` se
// já existir, nunca dispara geração -- restrição explícita desta fase:
// "nunca gerar TTS durante a exportação").
//
// Espelha EXATAMENTE as mesmas fórmulas de fallback que os renderers já
// usam (conferido linha a linha em fr/app.js antes de escrever isto --
// zh/app.js é estruturalmente idêntico nesses pontos):
//   - normal (inclui as 2 metades de "normal com reverso"): a frente
//     pega a imagem LEGADA (`card.imageUrl`, Note-level) como fallback
//     quando o Field da frente não tem imagem própria; o verso NUNCA usa
//     esse fallback (evita duplicar a mesma imagem legada nos 2 lados) --
//     mesma regra de `renderNormalCard`.
//   - multiple_choice: só o prompt tem mídia (imagem com fallback
//     legado, áudio sem fallback) -- a resposta certa/distratores NUNCA
//     têm mídia própria exibida, mesmo critério de `renderMultipleChoiceCard`
//     desde a Fase 7a (evita vazar a resposta certa pelo áudio/imagem
//     antes de a aluna escolher entre as opções).
//   - type_answer: prompt com fallback legado de imagem; resposta sem
//     fallback (só a própria mídia do Field de resposta, se houver) --
//     mesmo critério de `renderTypeAnswerCard`, só que lá é condicionado
//     a `answered` (runtime); aqui a exportação sempre inclui, já que o
//     .apkg não tem um estado de "revelado" -- é o próprio template do
//     Anki (afmt) que decide quando mostrar a Resposta.
//   - cloze: só a frase (Field de texto) tem mídia, com fallback legado
//     de imagem -- a tradução nunca tem mídia própria, mesmo critério de
//     `renderClozeCard`.
//   - trilha (`!card.cardInstance`): SEM mídia nenhuma -- o áudio da
//     trilha vem de AUDIO_MANIFEST (arquivos estáticos pré-gerados,
//     referenciados por texto literal, nunca por Field.audio) e fica
//     fora do escopo desta fase (ver relatório da Fase 7i, CLAUDE.md).
//
// Devolve { front, back } -- cada um `null` (sem mídia nesse lado) ou
// `{ audioUrl, imageUrl }` (qualquer um dos 2 pode ser `null` individualmente).
function resolveCardExportMedia(card){
  const view = resolveCardContentView(card);
  if (view.kind === CARD_TYPE_IDS.MULTIPLE_CHOICE){
    return {
      front: { audioUrl: view.prompt.audioUrl, imageUrl: card.imageUrl || view.prompt.imageUrl || null },
      back: null,
    };
  }
  if (view.kind === CARD_TYPE_IDS.TYPE_ANSWER){
    return {
      front: { audioUrl: view.prompt.audioUrl, imageUrl: card.imageUrl || view.prompt.imageUrl || null },
      back: view.answer ? { audioUrl: view.answer.audioUrl, imageUrl: view.answer.imageUrl } : null,
    };
  }
  if (view.kind === CARD_TYPE_IDS.CLOZE){
    return {
      front: { audioUrl: view.audioUrl, imageUrl: card.imageUrl || view.imageUrl || null },
      back: null,
    };
  }
  // normal (inclui as 2 metades de "normal com reverso")
  return {
    front: { audioUrl: view.front.audioUrl, imageUrl: card.imageUrl || view.front.imageUrl || null },
    back: { audioUrl: view.back.audioUrl, imageUrl: view.back.imageUrl },
  };
}

// buildAnkiClozeFieldText(rawText, targetMarkId) -- converte a sintaxe
// INTERNA {{cN::resposta}}/{{cN::resposta|compareAnswer}} (Fase 5) pra
// sintaxe NATIVA do Anki ({{cN::resposta}}/{{cN::resposta::hint}} -- o
// Anki usa "::" pra hint, nunca "|"). Só a marca `targetMarkId` vira
// marcação Cloze de verdade -- qualquer OUTRA marca da mesma Note (uma
// nota com múltiplas lacunas gera 1 CardInstance por lacuna, ver Fase 5)
// é achatada pro próprio texto revelado, mesmo espírito de
// `renderClozeText(text, targetMarkId, {reveal:false})` (revela tudo
// exceto a marca alvo) -- só que aqui a marca alvo vira sintaxe Cloze de
// verdade em vez de "___". Cada CardInstance de Cloze é exportada como
// sua PRÓPRIA nota Anki independente (nunca dependendo do mecanismo
// nativo do Anki de "1 nota Cloze gera N cards", que acoplaria marcas
// que este app trata como progresso FSRS genuinamente independentes).
//
// SEMPRE renumera a marca alvo pra "c1", nunca preserva o markId
// original (`c2`, `c3`...) -- cada nota exportada representa só 1 card
// (ord:0 sempre, mesmo padrão que o resto do exportador já usa pra
// qualquer tipo), e o filtro `{{cloze:Text}}` do Anki decide o que
// esconder a partir do número da marca vs. o `ord` do card -- ord:0 só
// combina com c1.
function buildAnkiClozeFieldText(rawText, targetMarkId){
  CLOZE_MARK_RE.lastIndex = 0;
  return (rawText || '').replace(CLOZE_MARK_RE, (_, id, raw) => {
    const { answer, compareAnswer } = splitClozeMarkRaw(raw);
    if (id !== targetMarkId) return answer;
    return (compareAnswer !== null && compareAnswer !== undefined && compareAnswer !== '')
      ? `{{c1::${answer}::${compareAnswer}}}`
      : `{{c1::${answer}}}`;
  });
}

// ===== shared/flashcard-editor-state.js =====
// ---------- Fase 6D.1 do prompt-mestre "reestruturação Note/CardType/
// CardInstance" (ver CLAUDE.md) -- ESTADO/MODELO NATIVO DO EDITOR ----------
//
// Fundação de estado pro editor de flashcards (shared/admin-flashcards.js/
// shared/my-flashcards.js) migrar pro modelo Note/Field da Fase 6B --
// só a REPRESENTAÇÃO INTERNA, sem nenhuma UI nova, sem persistência, sem
// mudar o formulário atual. Nada aqui é chamado ainda pelo editor real
// (ver "O que fica pra 6D.2+" no relatório desta fase em CLAUDE.md).
//
// Separação de responsabilidade, 4 baldes distintos (pedido explícito da
// autora nesta fase):
//   1. Note editor state (este arquivo) -- o que É persistível: fields,
//      card_generation_mode, revision, identidade.
//   2. "Note" o conceito (fields/cardGenerationMode) -- vive DENTRO do
//      Note editor state, nunca confundido com #3.
//   3. Estado de UI efêmero (createEditorUiState) -- objeto SEPARADO,
//      nunca mesclado no Note editor state, nunca comparado por
//      noteEditorStateChanged()/...RequiresNewRevision(). Campo
//      selecionado, foco, seleção de texto pro Cloze etc. pertencem aqui
//      quando as subfases 6D.2+ precisarem deles -- hoje só o esqueleto.
//   4. Legacy row -- um cartão que ainda usa as 12 colunas antigas
//      (front/back_trans/cloze_sentence/etc.) nunca é convertido
//      automaticamente pra native por este arquivo (decisão travada
//      nesta fase, ver CLAUDE.md) -- fica embrulhado como
//      `{kind:'legacy', legacyRow:{...}}`, opaco pra quem só lida com
//      Note/Field. A conversão de verdade (quando/como) é decisão da
//      Fase 6D.8, não daqui.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- depois de
// shared/flashcard-model.js, antes do editor real):
//   - shared/flashcard-model.js (CARD_GENERATION_MODES,
//     isNoteFieldsPresent, isCardGenerationModePresent,
//     validateNativeNoteRow)
//
// Convenção de "revision" nesta fase (decisão 4, travada pela autora):
// QUALQUER alteração de conteúdo persistível -- Fields, idioma de um
// Field, Card Type, resposta/alternativas, imagem, áudio, pinyinFieldId,
// inclusive a nota privada da professora (`privateNote`) -- conta como
// "mudou" pra fins de nova revision. De propósito NÃO existe ainda uma
// taxonomia fina que distinga "só corrigi um erro de digitação" de "troquei
// a estrutura" -- é o MESMO nível de rigor que o editor legado já tinha
// (updateFlashcardContent/updateOwnFlashcardContent sempre incrementam
// `revision` a cada save, não importa o que mudou). Quando uma taxonomia
// mais fina existir, só noteEditorStateRequiresNewRevision() muda -- o
// resto do editor não precisa saber.

// ---------- Field state ----------

// Id estável de Field -- gerado só quando um Field NOVO é criado (nunca
// regenerado ao carregar um Field já persistido, nem ao clonar/comparar
// estado -- ver createFieldState abaixo). Mesmo padrão de "componente
// aleatório" já usado em paths de Storage neste repo (ex:
// uploadFlashcardMedia), só que aqui o id em si é o dado persistido
// (pinyinFieldId referencia por ele), não um path de arquivo.
function generateFieldId(){
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Normaliza `content` pra sempre `{value: string}` -- mesmo shape que
// buildNativeRuntimeFields() (shared/flashcard-model.js) já lê
// (`(f.content && f.content.value) || ''`). Aceita string solta como
// atalho de conveniência pro chamador, mas o estado guardado é sempre o
// objeto -- nunca uma segunda representação paralela de conteúdo (rich
// text fica pra decisão futura, ver CLAUDE.md seção 7 da auditoria; este
// arquivo não fecha nem abre essa porta, só não INVENTA uma estrutura
// nova que a decisão futura teria que desfazer).
function normalizeFieldContent(content){
  if (typeof content === 'string') return { value: content };
  if (content && typeof content.value === 'string') return { value: content.value };
  return { value: '' };
}

// Field state -- shape EXATO que o motor já valida/consome
// (validateNativeNoteRow/buildNativeRuntimeFields, shared/flashcard-model.js):
// id, lang, role (só usado por multiple_choice), content, audio, image,
// pinyinFieldId. Nenhuma propriedade a mais -- em particular, NUNCA
// `frontIsTargetLanguage`/`isReverse`/qualquer booleano de "direção":
// direção não é propriedade de Field, é decidida pelo CardInstance (via
// frontFieldIndex/backFieldIndex/promptFieldIndex/... -- responsabilidade
// do motor, não do editor).
function createFieldState(overrides){
  const o = overrides || {};
  return {
    id: (typeof o.id === 'string' && o.id) ? o.id : generateFieldId(),
    lang: o.lang || null,
    role: o.role || null,
    content: normalizeFieldContent(o.content),
    // audio: contrato canônico travado na Fase 7b (ver shared/
    // flashcard-model.js, FIELD_AUDIO_TYPES/isValidFieldAudio) --
    // null | {type:'url',url} | {type:'upload',url,...} |
    // {type:'tts',language,voiceId,rate,generationKey,generatedUrl,...} |
    // {type:'recording',url,...}. image: {url} | null. Passados através
    // sem transformação nem validação aqui -- mesmo shape que
    // buildNativeRuntimeFields() já espera. Upload/TTS/gravação de
    // verdade continuam fora do escopo (Fases 7e/7f/7g, ver CLAUDE.md) --
    // este construtor só garante que a PROPRIEDADE existe no Field certo,
    // nunca em note.audio/note.image/card.audio/card.image.
    audio: o.audio || null,
    image: o.image || null,
    pinyinFieldId: (typeof o.pinyinFieldId === 'string' && o.pinyinFieldId) ? o.pinyinFieldId : null,
  };
}

// ---------- Note editor state (native) ----------

// Estado NATIVO do editor pra um Note -- o que precisa existir pra
// interpretNativeNoteFromRow() gerar CardInstances de verdade quando a
// 6D.6 (persistência) existir. `noteId`/`revision`/`languageAppKey`/
// `origin` são identidade/proveniência (nunca fazem parte da COMPARAÇÃO
// de conteúdo -- ver noteEditorStateContentForComparison abaixo, senão a
// própria revision incrementando invalidaria a comparação que decide se
// ela deveria incrementar). `privateNote` é a nota privada da professora
// (coluna `note` legada, nunca mostrada ao aluno) -- mora aqui, não em
// nenhum Field, porque não pertence ao conteúdo pedagógico do cartão.
function createNativeNoteEditorState(overrides){
  const o = overrides || {};
  const mode = o.cardGenerationMode || 'normal';
  if (typeof CARD_GENERATION_MODES !== 'undefined' && !CARD_GENERATION_MODES.includes(mode)){
    throw new Error(`createNativeNoteEditorState: cardGenerationMode desconhecido: "${mode}".`);
  }
  return {
    kind: 'native',
    noteId: o.noteId != null ? o.noteId : null, // null = cartão ainda não existe no banco
    revision: o.revision || 0,
    languageAppKey: o.languageAppKey || null,
    origin: o.origin || null, // 'teacher' | 'self' -- proveniência (qual tabela), não parte do modelo Note/Field em si
    privateNote: o.privateNote || null,
    cardGenerationMode: mode,
    fields: (o.fields || []).map(f => createFieldState(f)),
    // Tags (Fase 7j fechamento, ver CLAUDE.md) -- propriedade da Note,
    // nunca do Field/CardInstance (arquitetura consolidada "Decks/Tags/
    // Painel", seção 6/10). SEMPRE normalizadas aqui, no único ponto de
    // construção do estado nativo -- garante que TODO Note editor state
    // (Anki import de hoje, um editor manual de tags futuro) carrega
    // tags já no formato canônico, nunca dependendo de cada chamador
    // lembrar de normalizar (normalizeTagSlug/normalizeNoteTags,
    // shared/flashcard-model.js -- reutilizado, nunca duplicado aqui).
    tags: (typeof normalizeNoteTags === 'function') ? normalizeNoteTags(o.tags) : (Array.isArray(o.tags) ? o.tags.slice() : []),
  };
}

// Constrói o estado native a partir de uma linha JÁ nativa (fields +
// card_generation_mode presentes e pareados) -- ids de Field preservados
// EXATAMENTE como persistidos (createFieldState só gera um id novo
// quando `f.id` está ausente/vazio -- nunca é o caso aqui). Reaproveita
// validateNativeNoteRow() do motor pra rejeitar dado corrompido com o
// MESMO critério que interpretNoteFromRow() usaria -- nunca reimplementa
// a checagem aqui.
function createNativeNoteEditorStateFromRow(row){
  if (typeof isNoteFieldsPresent === 'function' && typeof isCardGenerationModePresent === 'function'){
    if (!isNoteFieldsPresent(row) || !isCardGenerationModePresent(row)){
      throw new Error('createNativeNoteEditorStateFromRow() exige uma linha nativa (fields + card_generation_mode presentes e pareados).');
    }
  }
  if (typeof validateNativeNoteRow === 'function'){
    const v = validateNativeNoteRow(row);
    if (!v.ok) throw new Error(`createNativeNoteEditorStateFromRow(): ${v.error}`);
  }
  return createNativeNoteEditorState({
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key || null,
    origin: row.origin || null,
    privateNote: row.note || null,
    cardGenerationMode: row.card_generation_mode,
    fields: row.fields,
    tags: row.tags,
  });
}

// ---------- Note editor state (legacy) ----------

// Embrulha uma linha LEGADA (front/back_trans/cloze_sentence/etc., sem
// fields/card_generation_mode) sem convertê-la -- decisão travada nesta
// fase: abrir um cartão legado NUNCA muda nada sozinho, só olhar (e
// cancelar) nunca grava nada. `legacyRow` guarda uma CÓPIA das 10 colunas
// legadas relevantes (nunca a linha inteira -- id/teacher_id/student_id/
// created_at/status não são "conteúdo do editor", continuam vivendo na
// linha real do banco, geridos por fora deste estado). A conversão de
// verdade pra native (quando uma edição efetivamente precisar do modelo
// novo) é trabalho da Fase 6D.8, não deste construtor.
function createLegacyNoteEditorStateFromRow(row){
  return {
    kind: 'legacy',
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key || null,
    origin: row.origin || null,
    legacyRow: {
      front: row.front != null ? row.front : null,
      front_pinyin: row.front_pinyin != null ? row.front_pinyin : null,
      back_trans: row.back_trans != null ? row.back_trans : null,
      front_is_target_language: row.front_is_target_language !== false,
      note: row.note != null ? row.note : null,
      image_url: row.image_url != null ? row.image_url : null,
      audio_url: row.audio_url != null ? row.audio_url : null,
      choices: Array.isArray(row.choices) ? row.choices.slice() : null,
      cloze_sentence: row.cloze_sentence != null ? row.cloze_sentence : null,
      cloze_answer: row.cloze_answer != null ? row.cloze_answer : null,
      cloze_answer_pinyin: row.cloze_answer_pinyin != null ? row.cloze_answer_pinyin : null,
    },
  };
}

// Dispatcher único -- mesmo critério de pareamento que o motor usa
// (interpretNoteFromRow, shared/flashcard-model.js) pra decidir qual dos
// dois ramos gerar. Ponto de entrada que uma tela de edição real (Fase
// 6D.8+) vai chamar, sem precisar saber de antemão se a linha é nativa
// ou legada.
function createNoteEditorStateFromRow(row){
  const native = typeof isNoteFieldsPresent === 'function' && typeof isCardGenerationModePresent === 'function'
    ? (isNoteFieldsPresent(row) && isCardGenerationModePresent(row))
    : (row.fields != null && row.card_generation_mode != null);
  return native ? createNativeNoteEditorStateFromRow(row) : createLegacyNoteEditorStateFromRow(row);
}

function isNativeNoteEditorState(state){
  return !!state && state.kind === 'native';
}
function isLegacyNoteEditorState(state){
  return !!state && state.kind === 'legacy';
}

// ---------- Estado de UI efêmero (balde #3) ----------

// Reservado pras subfases 6D.2+ (seleção de Card Type, campo com foco,
// seleção de texto pro Cloze, popover de marca aberto etc.) --
// deliberadamente mínimo aqui, NUNCA implementado como parte do Note
// editor state acima: é um objeto TOTALMENTE SEPARADO, nunca mesclado
// nele. É essa separação ESTRUTURAL (não uma convenção de "não olhar
// esses campos ao comparar") que garante que mudar seleção/foco nunca
// afeta noteEditorStateChanged()/...RequiresNewRevision() -- os dois
// objetos não têm nenhuma referência cruzada.
function createEditorUiState(overrides){
  const o = overrides || {};
  return {
    selectedFieldId: o.selectedFieldId || null,
    focusedFieldId: o.focusedFieldId || null,
  };
}

// ---------- Clonagem / snapshot / comparação ----------

// Clone profundo -- via round-trip JSON, seguro porque todo Note editor
// state (native OU legacy) é dado 100% plano (nunca funções/referências
// de DOM). Preserva noteId/revision/ids de Field exatamente -- nunca
// regenera nada.
function cloneNoteEditorState(state){
  return JSON.parse(JSON.stringify(state));
}

// Recorte SÓ do que conta como "conteúdo" pra fins de comparação --
// exclui `noteId`/`revision`/`origin` de propósito: são identidade/
// versão/proveniência, não conteúdo. Comparar incluindo `revision`
// tornaria a comparação circular (o valor que estamos decidindo se deve
// incrementar já estaria dentro do que compara pra decidir isso).
function noteEditorStateContentForComparison(state){
  if (isNativeNoteEditorState(state)){
    return {
      kind: 'native',
      languageAppKey: state.languageAppKey,
      privateNote: state.privateNote,
      cardGenerationMode: state.cardGenerationMode,
      // tags entram na comparação de CONTEÚDO com a mesma disciplina
      // "coarse" já travada pra privateNote (Fase 6D.1) -- mudar tags é
      // uma alteração persistível como qualquer outra, mesmo não sendo
      // mostrada na tela de Revisão.
      tags: (state.tags || []).slice(),
      fields: state.fields.map(f => ({
        id: f.id,
        lang: f.lang,
        role: f.role,
        content: { value: f.content.value },
        audio: f.audio,
        image: f.image,
        pinyinFieldId: f.pinyinFieldId,
      })),
    };
  }
  return {
    kind: 'legacy',
    languageAppKey: state.languageAppKey,
    legacyRow: state.legacyRow,
  };
}

// Snapshot estável (string) do CONTEÚDO -- nunca por referência de
// objeto JS (dois estados com o mesmo conteúdo mas objetos/arrays
// diferentes devem comparar iguais). `createFieldState`/
// `createNativeNoteEditorState` sempre constroem as propriedades na
// MESMA ordem sintática, então `JSON.stringify` produz a mesma string
// pra conteúdo equivalente independente de como o chamador passou os
// dados -- não precisa de um deep-equal customizado.
function snapshotNoteEditorState(state){
  return JSON.stringify(noteEditorStateContentForComparison(state));
}

function noteEditorStatesEqual(stateA, stateB){
  return snapshotNoteEditorState(stateA) === snapshotNoteEditorState(stateB);
}

function noteEditorStateChanged(originalState, currentState){
  return !noteEditorStatesEqual(originalState, currentState);
}

// Decisão 4 (ver CLAUDE.md, travada pela autora) -- hoje é EXATAMENTE
// `noteEditorStateChanged()`, exposta com nome próprio pra o call site
// futuro (6D.6, incremento de `revision` no submit) já poder chamar a
// função "certa" sem precisar saber que as duas são idênticas agora.
// Quando uma taxonomia mais fina existir (ex: só nota privada mudou =
// não reseta progresso), só esta função muda -- nenhum outro ponto do
// editor precisa ser tocado.
function noteEditorStateRequiresNewRevision(originalState, currentState){
  return noteEditorStateChanged(originalState, currentState);
}

// ---------- Preparação pra 6D.6 (persistência) / 6D.7 (Preview) ----------

// Transform de dado PURO -- nenhuma chamada de rede, nenhum
// INSERT/UPDATE. Devolve o shape de linha que interpretNoteFromRow()/
// buildEngineCardsFromRow() (shared/flashcard-model.js) já sabem
// interpretar, pra um estado native poder ser testado contra o motor
// REAL sem precisar salvar primeiro (Preview, 6D.7) ou pra servir de
// base ao INSERT/UPDATE de verdade quando a 6D.6 existir. Só se aplica a
// estado NATIVE -- um estado legacy grava pelas colunas antigas
// (createFlashcard()/createOwnFlashcard(), shared/teacher-flashcards.js/
// shared/own-flashcards.js), nunca por aqui.
function noteEditorStateToRow(state, extra){
  if (!isNativeNoteEditorState(state)){
    throw new Error('noteEditorStateToRow() só se aplica a estado native -- estado legacy usa createFlashcard()/createOwnFlashcard() (colunas legadas), não este transform.');
  }
  return Object.assign({
    id: state.noteId,
    revision: state.revision,
    language_app_key: state.languageAppKey,
    origin: state.origin,
    note: state.privateNote,
    fields: state.fields.map(f => ({
      id: f.id,
      lang: f.lang,
      role: f.role,
      content: { value: f.content.value },
      audio: f.audio,
      image: f.image,
      pinyinFieldId: f.pinyinFieldId,
    })),
    card_generation_mode: state.cardGenerationMode,
    tags: (state.tags || []).slice(),
  }, extra || {});
}

// ===== shared/flashcard-field-editor.js =====
// ---------- Editor de Fields nativos, reutilizável -- Fase 6D.3 da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI que opera DIRETAMENTE sobre o Field state já definido na
// Fase 6D.1 (shared/flashcard-editor-state.js: createFieldState() ->
// {id, lang, role, content:{value}, audio, image, pinyinFieldId}) --
// nunca uma estrutura paralela (frontText/backText/fieldValue/etc.).
// Reutilizado por shared/admin-flashcards.js e shared/my-flashcards.js,
// conectado ao `editorState.nativeCardState` que a Fase 6D.2 já
// introduziu nos dois (ADMIN_FLASHCARDS_STATE.nativeCardState/
// MY_FLASHCARDS_STATE.nativeCardState).
//
// Escopo estrito desta subfase (ver relatório completo no CLAUDE.md):
// - Editor de Field genérico (conteúdo + idioma), sem UI de rich text.
// - IDs de Field são ESTÁVEIS -- editar conteúdo/idioma NUNCA cria um id
//   novo; só clonar um Field deliberadamente cria um id novo
//   (cloneFieldIntoEditorState).
// - `fields` continua sendo só ORDEM ESTRUTURAL do Note -- este módulo
//   nunca interpreta fields[0]/fields[1] como frente/verso; isso é
//   trabalho do resolver/renderer (shared/flashcard-model.js, Fase 6C),
//   nunca deste editor.
// - `lang` descreve o Field, nunca decide direção/CardType/áudio
//   automaticamente -- não recria frontIsTargetLanguage/isReverse.
// - `role` fica de fora da UI nesta subfase (Multiple Choice/Type Answer
//   ganham UI de role só nas Fases 6D.4a/6D.4b) -- mas é PRESERVADO ao
//   editar o resto do Field (nunca apagado por updateFieldInEditorState).
// - `audio`/`image`/`pinyinFieldId`: preservados através de qualquer
//   edição de texto/idioma; sem upload/TTS/player/UI de pinyin completa
//   ainda (só um indicador textual de que já existem, se existirem).
// - Não persiste nada (sem chamada de rede aqui) -- só muta o
//   editorState em memória; a gravação nativa é a Fase 6D.6.
// - Não cria CardInstance nem chama buildEngineCardsFromRow/
//   interpretNoteFromRow -- isso é do motor, nunca do editor.
//
// Depende de (mesma posição de shared/flashcard-editor-state.js -- antes
// de shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-editor-state.js (createFieldState, normalizeFieldContent)
//   - escapeHTML (fr/zh app.js -- já carregado antes de qualquer *-flashcards.js)

// Conjunto de idiomas conhecidos hoje pelo motor (ver STUDY_LANG_FOR_APP_KEY/
// isStudyLanguageField em shared/flashcard-model.js: 'fr'/'zh' pro idioma
// estudado, 'zh-pinyin' pro Field satélite de pinyin, 'pt-BR' pra
// tradução). Lista fechada mas ESTENDÍVEL -- quando um novo idioma de site
// existir (ex: português), um novo valor entra aqui, nunca inferido a
// partir de APP_KEY/direção (isso seria recriar frontIsTargetLanguage).
const FIELD_LANG_OPTIONS = [
  { value: 'fr', labelKey: 'fieldEditor.lang.fr' },
  { value: 'zh', labelKey: 'fieldEditor.lang.zh' },
  { value: 'zh-pinyin', labelKey: 'fieldEditor.lang.zhPinyin' },
  { value: 'pt-BR', labelKey: 'fieldEditor.lang.ptBR' },
];

function fieldLangLabel(lang){
  const found = FIELD_LANG_OPTIONS.find(o => o.value === lang);
  return found ? t(found.labelKey) : (lang ? lang : t('fieldEditor.lang.undefinedLabel'));
}

// Fase 7b (ver CLAUDE.md) -- indicador textual reflete o `type` canônico
// de Field.audio em vez de um "tem áudio vinculado" genérico -- deixa
// visível a diferença entre um link externo, um upload, uma configuração
// de TTS ainda sem áudio gerado, e uma gravação futura. Shape legado/
// desconhecido (ex: `{url, source:'upload'}` de dado já persistido antes
// da Fase 7b) cai no fallback genérico -- nunca quebra a tela por causa
// de um `type` ausente. Reutilizado pela Fase 7e (renderFieldAudioBlockHTML,
// abaixo) como linha de status dentro do editor de áudio de verdade.
function fieldAudioIndicatorText(audio){
  if (!audio) return null;
  if (audio.type === 'tts') return audio.generatedUrl ? t('fieldEditor.audio.status.ttsDone') : t('fieldEditor.audio.status.ttsPending');
  if (audio.type === 'recording') return audio.url ? t('fieldEditor.audio.status.recDone') : t('fieldEditor.audio.status.recPending');
  if (audio.type === 'url') return t('fieldEditor.audio.status.url');
  if (audio.type === 'upload') return t('fieldEditor.audio.status.upload');
  return t('fieldEditor.audio.status.generic');
}

// ---------- Editor de áudio por Field -- Fase 7e (ver CLAUDE.md) ----------
//
// Único componente de UI reutilizado por TODO Card Type que passa por
// renderFieldEditorHTML() (normal/normal_reversed/multiple_choice/
// type_answer, mais a TRADUÇÃO do cloze) -- e chamado A MAIS, direto,
// pelo Field de TEXTO do cloze (shared/flashcard-cloze-editor.js, que
// tem seu próprio editor visual e nunca passa por renderFieldEditorHTML).
// Nunca uma segunda implementação por Card Type -- exatamente o mesmo
// espírito de "Field editor genérico, sem conhecimento de Card Type" já
// travado desde a Fase 6D.3.
//
// Escopo desta subfase (Fase 7e): "Arquivo (upload)" é funcional -- URL
// externa continua só de espaço reservado (`<select>` nunca finge que
// funciona). "Texto para voz" (Fase 7f -- implementação, ver CLAUDE.md)
// passou a ser um 3º ORIGEM FUNCIONAL, deliberadamente MÍNIMA (nunca o
// "seletor completo" descrito na auditoria da Fase 7f, Seção 20 -- sem
// lista de vozes vinda de um provedor real, sem indicador visual rico de
// "desatualizado", sem popover) -- só o necessário pra provar o contrato
// ponta a ponta: texto+idioma+voz(opcional)+velocidade+botão
// Gerar/Regenerar, reaproveitando os mesmos controles/classes CSS já
// calibrados no resto do editor (zero CSS novo).
//
// "Gravação" (Fase 7g -- ver CLAUDE.md) passou a ser a 4ª ORIGEM
// FUNCIONAL -- captura real via microfone (shared/flashcard-field-audio-
// recorder.js), upload pra Storage reaproveitando a MESMA infraestrutura
// da Fase 7e, `field.audio` só atualizado depois do upload ter sucesso de
// verdade (mesma disciplina de upload/TTS -- nunca antes).
// Fase 7h.1 (ver CLAUDE.md) -- "URL externa" deixou de ser espaço
// reservado: virou a 5ª origem FUNCIONAL, ao lado de upload/TTS/gravação.
// Nunca sobe/baixa nada -- só valida (validateFieldAudioUrl,
// shared/flashcard-model.js) e grava `{type:'url', url}` direto, mediante
// clique explícito em "Usar este link" (nunca ao digitar/colar sozinho).
const FIELD_AUDIO_ORIGIN_UI_META = [
  { value: 'none', labelKey: 'fieldEditor.audio.origin.none' },
  { value: 'url', labelKey: 'fieldEditor.audio.origin.url' },
  { value: 'upload', labelKey: 'fieldEditor.audio.origin.upload' },
  { value: 'tts', labelKey: 'fieldEditor.audio.origin.tts' },
  { value: 'recording', labelKey: 'fieldEditor.audio.origin.recording' },
];

// ---------- CONSOLIDAÇÃO-4 (ver CLAUDE.md) -- UX de áudio em 2 passos ----------
//
// O <select> técnico acima (FIELD_AUDIO_ORIGIN_UI_META, com "Sem áudio"
// incluído) continua existindo -- ele é o motor por baixo (mesma
// disciplina de "não alterar o motor de áudio"), só deixa de ser
// mostrado diretamente. `FIELD_AUDIO_METHOD_UI_META` é a lista de
// MÉTODOS que aparecem no picker do "+ Adicionar áudio"/"Substituir" --
// nunca inclui "Sem áudio" (isso é o botão "Remover", não um método de
// adicionar). Ordem = a do mockup aprovado (Seção 27): grátis primeiro
// (Enviar arquivo/Usar link), Premium depois (Texto para voz/Gravar) --
// mesmo padrão de entitlement já usado pelo Card Type selector
// (cardTypeUIMetaForEntitlement, shared/admin-flashcards.js): esconder
// a opção não-permitida da lista, nunca mostrá-la cinza/travada.
const FIELD_AUDIO_METHOD_UI_META = [
  { value: 'upload', labelKey: 'fieldEditor.audio.method.upload' },
  { value: 'url', labelKey: 'fieldEditor.audio.method.url' },
  { value: 'tts', labelKey: 'fieldEditor.audio.method.tts' },
  { value: 'recording', labelKey: 'fieldEditor.audio.method.recording' },
];

// Locale de síntese (audio.language) -- eixo DELIBERADAMENTE independente
// de Field.lang (idioma pedagógico), nunca derivado automaticamente (ver
// contrato da Fase 7b em shared/flashcard-model.js) -- só usado aqui pra
// SUGERIR um valor inicial no `<select>`, nunca gravado sozinho.
const TTS_LANGUAGE_UI_OPTIONS = [
  { value: '', labelKey: 'fieldEditor.audio.ttsLang.choose' },
  { value: 'fr-FR', labelKey: 'fieldEditor.audio.ttsLang.fr' },
  { value: 'zh-CN', labelKey: 'fieldEditor.audio.ttsLang.zh' },
  { value: 'pt-BR', labelKey: 'fieldEditor.audio.ttsLang.pt' },
];
function suggestedTtsLanguageForFieldLang(lang){
  if (lang === 'fr') return 'fr-FR';
  if (lang === 'zh' || lang === 'zh-pinyin') return 'zh-CN';
  if (lang === 'pt-BR') return 'pt-BR';
  return '';
}
const TTS_RATE_UI_OPTIONS = [
  { value: '0.8', labelKey: 'fieldEditor.audio.rate.slow' },
  { value: '1', labelKey: 'fieldEditor.audio.rate.normal' },
  { value: '1.2', labelKey: 'fieldEditor.audio.rate.fast' },
];

// ---------- Fase 7g (gravação de áudio por Field, ver CLAUDE.md) ----------
//
// Texto de status mostrado dentro do painel de gravação -- reflete o
// `status` da máquina de estados PURA (shared/flashcard-field-audio-
// recorder.js), nunca um estado próprio duplicado aqui. `recState` pode
// ser `null`/ausente na 1ª renderização antes do recorder existir --
// cai no mesmo texto de "idle".
function fieldAudioRecordingStatusLabel(recState){
  const status = (recState && recState.status) || 'idle';
  if (status === 'requesting_permission') return t('fieldEditor.audio.rec.requesting');
  if (status === 'recording') return t('fieldEditor.audio.rec.recording');
  if (status === 'stopping') return t('fieldEditor.audio.rec.stopping');
  if (status === 'uploading') return t('fieldEditor.audio.rec.uploading');
  if (status === 'ready') return t('fieldEditor.audio.rec.ready');
  if (status === 'error') return (recState && recState.errorMessage) || t('fieldEditor.audio.rec.error');
  return t('fieldEditor.audio.rec.idle');
}

// ---------- Fase 7h.2 (fechamento/auditoria da UI de áudio por Field, ver
// CLAUDE.md) -- registro por Field pra guarda de "geração" contra corrida
// entre origens, SOBREVIVE a re-renders ----------
//
// Achado real desta auditoria: upload/TTS/gravação já se protegiam contra
// uma resposta chegar DEPOIS que o bloco inteiro foi destruído
// (`!block.isConnected`, re-render estrutural), e o TTS já se protegia
// contra a PRÓPRIA config mudar em voo (myKey/currentKey, dentro de
// wireFieldAudioBlockFor) -- mas nenhum dos 3 verificava se OUTRA ORIGEM já
// tinha assumido field.audio enquanto eles estavam em voo. Trocar de
// origem (ex: TTS -> Upload) só alterna qual painel aparece via
// style.display -- nunca cancela a operação assíncrona da origem anterior.
// Cenário real sem este guard: iniciar geração de TTS, trocar pra Upload
// antes dela terminar, subir um arquivo com sucesso (field.audio=upload) --
// quando a resposta do TTS chegasse depois, ela sobrescreveria o upload
// recém-aplicado, silenciosamente.
//
// Por que um REGISTRO por fieldId, não uma variável local dentro de
// wireFieldAudioBlockFor: uma operação de áudio bem-sucedida (TTS/upload/
// gravação) já dispara `onChange('structure', fieldId)`, que RE-RENDERIZA
// A CAIXA INTEIRA (refreshNativeFieldsBox/refreshNativeCardTypeBox) --
// inclusive Fields QUE NÃO MUDARAM. Isso recria `wireFieldAudioBlockFor`
// (e portanto qualquer variável local) do ZERO pra TODO Field da caixa.
// Uma gravação real iniciada ANTES desse re-render (Fase 7g: o MediaRecorder
// sobrevive a re-renders via FIELD_AUDIO_RECORDER_REGISTRY, de propósito)
// continuaria rodando -- e seu `onReady`, ao finalmente disparar, chamaria
// o closure NOVO (pós-re-render), cujo contador reiniciaria em 0/null,
// nunca detectando que a gravação era de uma "geração" anterior já
// superada. Corrigido com um registro module-level, no MESMO espírito de
// FIELD_AUDIO_RECORDER_REGISTRY (Fase 7g) -- persiste através de qualquer
// número de re-renders, só é limpo quando o Field é removido de verdade
// (ver wireFieldEditorList, [data-field-remove], abaixo).
const FIELD_AUDIO_OP_GENERATION_REGISTRY = {};
const FIELD_AUDIO_PENDING_RECORDING_REGISTRY = {};
function beginFieldAudioOp(fieldId){
  FIELD_AUDIO_OP_GENERATION_REGISTRY[fieldId] = (FIELD_AUDIO_OP_GENERATION_REGISTRY[fieldId] || 0) + 1;
  return FIELD_AUDIO_OP_GENERATION_REGISTRY[fieldId];
}
function currentFieldAudioOpGeneration(fieldId){
  return FIELD_AUDIO_OP_GENERATION_REGISTRY[fieldId] || 0;
}
function clearFieldAudioOpGeneration(fieldId){
  delete FIELD_AUDIO_OP_GENERATION_REGISTRY[fieldId];
  delete FIELD_AUDIO_PENDING_RECORDING_REGISTRY[fieldId];
}

// Render puro -- nunca side-effect (mesmo I/O de rede que o Gerar áudio
// dispara vive só em wireFieldAudioBlockFor, abaixo). `resolveFieldAudioUrl`/
// `FIELD_AUDIO_UPLOAD_MIME_TYPES` vêm de shared/flashcard-model.js
// (carregado antes deste arquivo, ver "Depende de" no topo) -- checados
// defensivamente (`typeof ... !== 'undefined'`) só pra este arquivo nunca
// quebrar sozinho se algum dia for carregado fora de ordem num teste.
//
// CONSOLIDAÇÃO-4 (ver CLAUDE.md) -- UX em 2 passos, motor intocado:
// o bloco sempre nasce no estado "summary" (resumo -- toca/substitui/
// remove, ou "Sem áudio" + "+ Adicionar áudio"). Escolher "Adicionar"/
// "Substituir" revela o PICKER de método (Enviar arquivo/Usar link/
// Texto para voz/Gravar, filtrado por entitlement); escolher um método
// seleciona o <select> técnico (agora escondido) e revela só O PAINEL
// daquele método -- os 4 painéis por baixo (url/upload/tts/recording)
// são BYTE A BYTE os mesmos elementos/ids/data-attributes de antes desta
// fase, nunca reescritos -- só passaram a viver dentro de um wrapper
// que a UI de 2 passos controla. Nenhuma mudança na lógica que decide
// QUAL painel corresponde à origem atual (showUrl/showUpload/etc.),
// só em QUANDO o conjunto inteiro fica visível.
function renderFieldAudioBlockHTML(field, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'field-editor';
  const audio = field.audio || null;
  const originValue = audio ? audio.type : 'none';
  // CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- matriz Free/Premium aprovada: Free só
  // vê Sem áudio/URL/Upload; TTS/Gravação ficam atrás de Premium. Filtro
  // puramente de UI (quais métodos o picker oferece), nunca reescreve o
  // motor de áudio (Fase 7e/7f/7g intocadas). A origem JÁ SALVA de um Field
  // continua sempre incluída na lista mesmo se não estiver mais permitida
  // (ex: conta que foi Premium e criou um TTS, depois voltou pra Free) --
  // nunca esconde/perde um dado já existente, só limita o que pode ser
  // ESCOLHIDO de novo. `opts.allowedAudioOrigins` ausente = sem restrição
  // (professora/admin, sempre; aluna Premium).
  const allowedOrigins = Array.isArray(opts.allowedAudioOrigins) ? opts.allowedAudioOrigins : null;
  const originMeta = allowedOrigins
    ? FIELD_AUDIO_ORIGIN_UI_META.filter(o => allowedOrigins.includes(o.value) || o.value === originValue)
    : FIELD_AUDIO_ORIGIN_UI_META;
  const pickableMethods = allowedOrigins
    ? FIELD_AUDIO_METHOD_UI_META.filter(m => allowedOrigins.includes(m.value) || m.value === originValue)
    : FIELD_AUDIO_METHOD_UI_META;
  const resolvedUrl = (typeof resolveFieldAudioUrl === 'function') ? resolveFieldAudioUrl(audio) : null;
  const statusText = fieldAudioIndicatorText(audio);
  const acceptAttr = (typeof FIELD_AUDIO_UPLOAD_MIME_TYPES !== 'undefined') ? FIELD_AUDIO_UPLOAD_MIME_TYPES.join(',') : 'audio/*';

  const canGenerate = !!(opts.noteId) && typeof opts.ttsFn === 'function';
  const ttsAudio = (audio && audio.type === 'tts') ? audio : null;
  const ttsText = (ttsAudio && typeof ttsAudio.text === 'string' && ttsAudio.text) ? ttsAudio.text : (field.content.value || '');
  const ttsLanguage = (ttsAudio && ttsAudio.language) || suggestedTtsLanguageForFieldLang(field.lang);
  const ttsVoiceId = (ttsAudio && ttsAudio.voiceId) || '';
  const ttsRate = (ttsAudio && ttsAudio.rate !== null && ttsAudio.rate !== undefined) ? String(ttsAudio.rate) : '1';
  const generateLabel = (ttsAudio && ttsAudio.generatedUrl) ? t('fieldEditor.audio.regenerate') : t('fieldEditor.audio.generate');

  const showUrl = originValue === 'url';
  const showUpload = originValue === 'upload' || originValue === 'none';
  const showTts = originValue === 'tts';
  const showRecording = originValue === 'recording';
  const recordingAudio = (audio && audio.type === 'recording') ? audio : null;
  const urlAudio = (audio && audio.type === 'url') ? audio : null;

  return `
    <div class="field-audio-block" data-field-audio-field="${field.id}" data-field-audio-ui-state="summary">
      <span class="section-label field-audio-title">${t('fieldEditor.audio.title')}</span>

      <div class="field-audio-summary" data-field-audio-summary="${field.id}">
        ${resolvedUrl ? `<audio controls preload="none" src="${escapeHTML(resolvedUrl)}"></audio>` : ''}
        <p class="profile-edit-hint field-audio-status">${escapeHTML(statusText || t('fieldEditor.audio.noAudio'))}</p>
        <div class="field-audio-actions">
          ${audio ? `
            <button type="button" class="btn btn-secondary" data-field-audio-replace="${field.id}">${t('fieldEditor.audio.replace')}</button>
            <button type="button" class="admin-select-link" data-field-audio-remove="${field.id}">${t('fieldEditor.audio.remove')}</button>
          ` : `
            <button type="button" class="btn btn-secondary" data-field-audio-add="${field.id}">${t('fieldEditor.audio.add')}</button>
          `}
        </div>
      </div>

      <div data-field-audio-picker="${field.id}" style="display:none;">
        <p class="profile-edit-hint" style="margin:0 0 6px;">${t('fieldEditor.audio.pickerQuestion')}</p>
        <div style="display:flex; flex-direction:column; gap:6px; align-items:stretch;">
          ${pickableMethods.map(m => `<button type="button" class="btn btn-secondary" style="text-align:left;" data-field-audio-pick="${m.value}">${t(m.labelKey)}</button>`).join('')}
        </div>
        <button type="button" class="admin-select-link" data-field-audio-picker-cancel="${field.id}" style="margin-top:8px;">${t('fieldEditor.audio.cancel')}</button>
      </div>

      <select id="${namePrefix}-audio-origin-${field.id}" class="profile-edit-input" data-field-audio-origin="${field.id}" style="display:none;" aria-hidden="true" tabindex="-1">
        ${originMeta.map(o => `<option value="${o.value}" ${originValue === o.value ? 'selected' : ''}>${t(o.labelKey)}</option>`).join('')}
      </select>

      <div data-field-audio-method-panel="${field.id}" style="display:none;">
        <button type="button" class="admin-select-link" data-field-audio-panel-back="${field.id}" style="margin-bottom:8px;">${t('fieldEditor.audio.back')}</button>

        <div data-field-audio-panel-url="${field.id}" style="${showUrl ? '' : 'display:none;'}">
          <label class="profile-edit-label" for="${namePrefix}-audio-url-${field.id}">${t('fieldEditor.audio.urlLabel')}</label>
          <input type="url" id="${namePrefix}-audio-url-${field.id}" class="profile-edit-input" placeholder="${t('fieldEditor.audio.urlPlaceholder')}" value="${escapeHTML((urlAudio && urlAudio.url) || '')}" data-field-audio-url-input="${field.id}">
          <button type="button" class="btn btn-secondary" style="margin-top:6px;" data-field-audio-url-apply="${field.id}">${t('fieldEditor.audio.urlApply')}</button>
        </div>

        <div data-field-audio-panel-upload="${field.id}" style="${showUpload ? '' : 'display:none;'}">
          <input type="file" accept="${acceptAttr}" data-field-audio-file="${field.id}">
          <p class="profile-edit-hint" data-field-audio-upload-status="${field.id}" style="margin:6px 0 0;"></p>
        </div>

        <div data-field-audio-panel-tts="${field.id}" style="${showTts ? '' : 'display:none;'}">
          ${canGenerate ? `
            <label class="profile-edit-label" for="${namePrefix}-audio-tts-text-${field.id}">${t('fieldEditor.audio.ttsText')}</label>
            <textarea id="${namePrefix}-audio-tts-text-${field.id}" class="profile-edit-input profile-edit-textarea" rows="2" data-field-audio-tts-text="${field.id}">${escapeHTML(ttsText)}</textarea>
            <label class="profile-edit-label" for="${namePrefix}-audio-tts-lang-${field.id}">${t('fieldEditor.audio.ttsLangLabel')}</label>
            <select id="${namePrefix}-audio-tts-lang-${field.id}" class="profile-edit-input" data-field-audio-tts-lang="${field.id}">
              ${TTS_LANGUAGE_UI_OPTIONS.map(o => `<option value="${o.value}" ${ttsLanguage === o.value ? 'selected' : ''}>${t(o.labelKey)}</option>`).join('')}
            </select>
            <label class="profile-edit-label" for="${namePrefix}-audio-tts-voice-${field.id}">${t('fieldEditor.audio.ttsVoice')}</label>
            <input type="text" id="${namePrefix}-audio-tts-voice-${field.id}" class="profile-edit-input" placeholder="${t('fieldEditor.audio.ttsVoicePlaceholder')}" value="${escapeHTML(ttsVoiceId)}" data-field-audio-tts-voice="${field.id}">
            <label class="profile-edit-label" for="${namePrefix}-audio-tts-rate-${field.id}">${t('fieldEditor.audio.ttsRate')}</label>
            <select id="${namePrefix}-audio-tts-rate-${field.id}" class="profile-edit-input" data-field-audio-tts-rate="${field.id}">
              ${TTS_RATE_UI_OPTIONS.map(o => `<option value="${o.value}" ${ttsRate === o.value ? 'selected' : ''}>${t(o.labelKey)}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-secondary" style="margin-top:6px;" data-field-audio-tts-generate="${field.id}">${generateLabel}</button>
            <p class="profile-edit-field-error" data-field-audio-tts-stale="${field.id}" style="margin:4px 0 0; display:none;"></p>
            <p class="profile-edit-hint" data-field-audio-tts-msg="${field.id}" style="margin:4px 0 0;"></p>
          ` : `<p class="profile-edit-hint">${t('fieldEditor.audio.saveFirst')}</p>`}
        </div>

        <div data-field-audio-panel-recording="${field.id}" style="${showRecording ? '' : 'display:none;'}">
          <p class="profile-edit-hint" data-field-audio-record-status="${field.id}" style="margin:0 0 6px;">${escapeHTML(fieldAudioRecordingStatusLabel(null))}</p>
          <button type="button" class="btn btn-secondary" data-field-audio-record-start="${field.id}">${recordingAudio ? t('fieldEditor.audio.rerecord') : t('fieldEditor.audio.record')}</button>
          <button type="button" class="btn btn-secondary" data-field-audio-record-stop="${field.id}" style="display:none;">${t('fieldEditor.audio.stop')}</button>
          <button type="button" class="admin-select-link" data-field-audio-record-cancel="${field.id}" style="display:none;">${t('fieldEditor.audio.cancel')}</button>
          ${recordingAudio && recordingAudio.durationMs != null ? `<p class="profile-edit-hint" style="margin:4px 0 0;">${t('fieldEditor.audio.duration', { s: Math.round(recordingAudio.durationMs / 1000) })}</p>` : ''}
        </div>
      </div>

      <p class="profile-edit-field-error" data-field-audio-error="${field.id}"></p>
    </div>
  `;
}

// Liga o bloco de áudio de UM Field (identificado por `fieldId`) dentro
// de `container` -- chamada tanto pelo wiring genérico
// (wireFieldEditorList, abaixo) quanto direto pelo editor de Cloze
// (shared/flashcard-cloze-editor.js, pro Field de frase, que nunca passa
// por wireFieldEditorList). `opts.uploadFn`/`opts.deleteFn` (Seção 7 --
// "mesma infraestrutura pros dois editores") vêm de quem integra
// (shared/admin-flashcards.js -> uploadFlashcardMedia/deleteFlashcardMedia;
// shared/my-flashcards.js -> uploadOwnFlashcardMedia/deleteOwnFlashcardMedia).
function wireFieldAudioBlockFor(container, editorState, fieldId, onChange, opts){
  opts = opts || {};
  const block = container.querySelector(`[data-field-audio-field="${fieldId}"]`);
  if (!block) return;
  const fileInput = block.querySelector('[data-field-audio-file]');
  const errorEl = block.querySelector('[data-field-audio-error]');
  const uploadStatusEl = block.querySelector('[data-field-audio-upload-status]');
  const removeBtn = block.querySelector('[data-field-audio-remove]');
  const originSelect = block.querySelector('[data-field-audio-origin]');
  const urlPanel = block.querySelector('[data-field-audio-panel-url]');
  const uploadPanel = block.querySelector('[data-field-audio-panel-upload]');
  const ttsPanel = block.querySelector('[data-field-audio-panel-tts]');
  const recordingPanel = block.querySelector('[data-field-audio-panel-recording]');

  // Fase 7h.2 -- helpers locais que delegam pro registro module-level
  // (declarado acima, ver comentário completo lá sobre por que precisa
  // sobreviver a re-renders). `beginAudioOp()` é só um atalho pra não
  // repetir `fieldId` em toda chamada dentro deste wiring.
  function beginAudioOp(){ return beginFieldAudioOp(fieldId); }

  // ---------- CONSOLIDAÇÃO-4 (ver CLAUDE.md) -- estado de UI em 2 passos ----------
  //
  // Puramente de apresentação -- nunca toca editorState/field.audio (só o
  // clique explícito em "+ Adicionar"/método/"Remover"/os corredores
  // técnicos abaixo, todos intocados por esta fase, fazem isso). Vive só
  // no DOM (data-field-audio-ui-state), então uma troca de "summary" pra
  // "picker" pra "panel" nunca dispara re-render nem perde o que a
  // pessoa já tinha digitado em outro campo do mesmo Field (mesma
  // disciplina de "nunca re-renderizar o form inteiro" já travada desde a
  // UX-fix 5/Fase 6D.3). Volta pra "summary" sozinho sempre que um
  // corredor conclui com sucesso, porque sucesso já dispara
  // onChange('structure', fieldId) -> refreshNativeFieldsBox/
  // refreshNativeCardTypeBox -> RE-RENDER COMPLETO do bloco, que sempre
  // nasce em "summary" de novo (ver renderFieldAudioBlockHTML acima).
  const summaryEl = block.querySelector('[data-field-audio-summary]');
  const pickerEl = block.querySelector('[data-field-audio-picker]');
  const methodPanelEl = block.querySelector('[data-field-audio-method-panel]');
  const addBtn = block.querySelector('[data-field-audio-add]');
  const replaceBtn = block.querySelector('[data-field-audio-replace]');
  const pickerCancelBtn = block.querySelector('[data-field-audio-picker-cancel]');
  const panelBackBtn = block.querySelector('[data-field-audio-panel-back]');
  const pickButtons = block.querySelectorAll('[data-field-audio-pick]');

  function setAudioUiState(state){
    block.dataset.fieldAudioUiState = state;
    if (summaryEl) summaryEl.style.display = (state === 'summary') ? '' : 'none';
    if (pickerEl) pickerEl.style.display = (state === 'picker') ? '' : 'none';
    if (methodPanelEl) methodPanelEl.style.display = (state === 'panel') ? '' : 'none';
    // Nenhuma transição de UI (avançar pro picker, escolher um método,
    // voltar, cancelar) deve deixar uma mensagem de erro de uma tentativa
    // ANTERIOR (upload/URL/TTS) visível sobre o painel novo -- nunca
    // mutação de field.audio, só limpeza de texto transitório.
    if (errorEl) errorEl.textContent = '';
  }

  if (addBtn) addBtn.addEventListener('click', () => setAudioUiState('picker'));
  if (replaceBtn) replaceBtn.addEventListener('click', () => setAudioUiState('picker'));
  if (pickerCancelBtn) pickerCancelBtn.addEventListener('click', () => setAudioUiState('summary'));
  if (panelBackBtn) panelBackBtn.addEventListener('click', () => setAudioUiState('summary'));

  pickButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.fieldAudioPick;
      // Reaproveita 100% o <select> técnico + seu listener de 'change'
      // (definido logo abaixo, intocado por esta fase) pra decidir qual
      // painel mostrar e pra invalidar (beginAudioOp) qualquer operação
      // de outra origem ainda em voo -- nunca uma segunda implementação
      // da mesma lógica.
      if (originSelect){
        originSelect.value = method;
        originSelect.dispatchEvent(new Event('change'));
      }
      setAudioUiState('panel');
    });
  });

  // Trocar de ORIGEM no `<select>` NUNCA sobrescreve field.audio sozinho
  // (decisão travada na auditoria da Fase 7c, item D5) -- exceto
  // escolher "Sem áudio" explicitamente, que é a ÚNICA outra forma
  // (além do botão "Remover áudio") de limpar a referência antes de
  // existir um ativo concreto novo. Trocar pra 'url'/'upload'/'tts'/
  // 'recording' só alterna QUAL PAINEL aparece (mutação de DOM local,
  // nunca re-render da caixa inteira -- mesma disciplina de "nunca perder
  // o que a pessoa já digitou" já usada em todo o resto deste arquivo).
  if (originSelect){
    originSelect.addEventListener('change', () => {
      beginAudioOp(); // Fase 7h.2 -- trocar de origem invalida qualquer operação da origem anterior ainda em voo.
      const val = originSelect.value;
      if (urlPanel) urlPanel.style.display = (val === 'url') ? '' : 'none';
      if (uploadPanel) uploadPanel.style.display = (val === 'upload' || val === 'none') ? '' : 'none';
      if (ttsPanel) ttsPanel.style.display = (val === 'tts') ? '' : 'none';
      if (recordingPanel) recordingPanel.style.display = (val === 'recording') ? '' : 'none';
      if (val === 'none'){
        updateFieldInEditorState(editorState, fieldId, { audio: null });
        if (onChange) onChange('structure', fieldId);
      }
    });
  }

  // ---------- Fase 7h.1 (UI completa de áudio por Field, ver CLAUDE.md) --
  // "URL externa" ----------
  //
  // Sem chamada de rede -- valida (validateFieldAudioUrl, shared/
  // flashcard-model.js: exige https://, rejeita esquemas perigosos como
  // javascript:/data:/file:) e grava direto. Nunca dispara sozinho ao
  // digitar/colar -- só no clique explícito em "Usar este link" (mesma
  // disciplina de "gravar só numa ação explícita" já usada por upload/TTS/
  // gravação). Falha de validação nunca toca `field.audio` -- o áudio já
  // existente (se havia) permanece intacto.
  const urlApplyBtn = block.querySelector('[data-field-audio-url-apply]');
  const urlInput = block.querySelector('[data-field-audio-url-input]');
  if (urlApplyBtn && urlInput){
    urlApplyBtn.addEventListener('click', () => {
      beginAudioOp(); // Fase 7h.2 -- aplicar uma URL invalida qualquer operação de outra origem ainda em voo.
      if (errorEl) errorEl.textContent = '';
      const v = (typeof validateFieldAudioUrl === 'function')
        ? validateFieldAudioUrl(urlInput.value)
        : { ok: false, error: t('fieldEditor.audio.err.urlValidatorMissing') };
      if (!v.ok){
        if (errorEl) errorEl.textContent = v.error;
        return;
      }
      updateFieldInEditorState(editorState, fieldId, { audio: { type: 'url', url: v.url } });
      if (onChange) onChange('structure', fieldId);
    });
  }

  if (fileInput){
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (errorEl) errorEl.textContent = '';
      // Validação client-side ANTES de qualquer chamada de rede (Seção 4) --
      // uploadFn() valida de novo do lado do dado (mesma disciplina de
      // duas camadas já usada em toda a feature), mas checar aqui primeiro
      // evita gastar uma chamada de Storage num arquivo já sabidamente
      // inválido.
      if (typeof validateFieldAudioUploadFile === 'function'){
        const v = validateFieldAudioUploadFile(file);
        if (!v.ok){
          if (errorEl) errorEl.textContent = v.error;
          fileInput.value = '';
          return;
        }
      }
      if (typeof opts.uploadFn !== 'function'){
        if (errorEl) errorEl.textContent = t('fieldEditor.audio.err.uploadUnavailable');
        return;
      }
      // Fase 7h.2 -- captura a "geração" desta tentativa ANTES de subir de
      // verdade (ver comentário de FIELD_AUDIO_OP_GENERATION_REGISTRY
      // acima): se outra origem (TTS/gravação/URL/"Sem áudio") produzir um
      // resultado
      // enquanto este upload ainda está em voo, o resultado deste upload é
      // descartado ao voltar, nunca sobrescreve um field.audio mais recente.
      const myGeneration = beginAudioOp();
      fileInput.disabled = true;
      if (uploadStatusEl) uploadStatusEl.textContent = t('fieldEditor.audio.uploading');
      const up = await opts.uploadFn(file, 'audio', fieldId);
      // Seção 8 (relatório da fase) -- guarda contra o container ter sido
      // removido do DOM enquanto o upload estava em voo (ex: a professora
      // cancelou a edição/trocou de Card Type antes do upload terminar) --
      // nunca mutar um editorState que a tela já abandonou, nunca tocar um
      // elemento desconectado.
      if (!block.isConnected) return;
      fileInput.disabled = false;
      fileInput.value = '';
      if (!up.ok){
        if (errorEl) errorEl.textContent = up.error || t('fieldEditor.audio.err.uploadFailed');
        if (uploadStatusEl) uploadStatusEl.textContent = '';
        return; // Seção 2/9 -- upload falhou: o áudio anterior (se havia) permanece intacto, nada é sobrescrito.
      }
      // Seção 14 -- rastreia o upload recém-concluído NESTA sessão de
      // edição, pra a tela de integração poder compensar (best-effort
      // delete) se a gravação da Note falhar logo em seguida -- ver
      // shared/admin-flashcards.js/shared/my-flashcards.js, handlers de
      // submit/salvar, que leem editorState.__freshMediaUploads. Rastreado
      // MESMO se o resultado for descartado abaixo (a corrida de origem) --
      // o objeto foi genuinamente criado no Storage, então continua
      // candidato à mesma compensação best-effort.
      editorState.__freshMediaUploads = editorState.__freshMediaUploads || [];
      editorState.__freshMediaUploads.push({ path: up.path, deleteFn: opts.deleteFn || null });
      if (myGeneration !== currentFieldAudioOpGeneration(fieldId)){
        // Outra origem já assumiu field.audio enquanto este upload estava
        // em voo (Fase 7h.2) -- descarta silenciosamente, nunca sobrescreve.
        if (uploadStatusEl) uploadStatusEl.textContent = t('fieldEditor.audio.discardedUpload');
        return;
      }
      // Só ATUALIZA field.audio depois do upload ter sucesso de verdade
      // (Seção 2/9) -- nunca antes.
      updateFieldInEditorState(editorState, fieldId, {
        audio: { type: 'upload', url: up.url, uploadedAt: new Date().toISOString(), mimeType: file.type || null },
      });
      if (onChange) onChange('structure', fieldId);
    });
  }

  // ---------- Fase 7f (TTS explícito por Field, implementação -- ver
  // CLAUDE.md) -- botão "Gerar/Regenerar áudio" ----------
  const ttsGenerateBtn = block.querySelector('[data-field-audio-tts-generate]');
  const ttsStaleEl = block.querySelector('[data-field-audio-tts-stale]');

  // ---------- Fase 7h.1 (UI completa de áudio por Field, ver CLAUDE.md) --
  // detecção de "desatualizado" reaproveitando isTtsAudioStale() (Fase 7f,
  // shared/flashcard-model.js) ----------
  //
  // "Desatualizado" é sempre CALCULADO (nunca um booleano persistido em
  // Field.audio -- regra já travada na Fase 7c/7f) comparando o
  // generationKey recém-derivado do ESTADO ATUAL do Field (`editorState`,
  // fonte de verdade -- nunca os inputs ainda não aplicados do próprio
  // painel de TTS) contra o já persistido em `audio.generationKey`. Como
  // `isTtsAudioStale()` é assíncrona (SHA-256 via Web Crypto), esta função
  // roda depois da renderização síncrona -- chamada 1x ao ligar o wiring
  // (equivalente ao estado no momento em que o bloco entrou na tela) e de
  // novo automaticamente sempre que uma mudança ESTRUTURAL reconstrói a
  // caixa inteira (add/remove Field, geração concluída, troca de origem
  // pra "Sem áudio") -- mesmo ciclo de vida de refreshNativeFieldsBox.
  // Nunca dispara nenhuma chamada de rede/geração sozinha -- só lê e
  // exibe; a ação de regenerar continua exigindo o clique explícito no
  // botão (mesmo com o rótulo/mensagem trocados aqui).
  async function refreshTtsStaleUi(){
    if (!ttsStaleEl || !block.isConnected) return;
    const currentField = (editorState.fields || []).find(f => f.id === fieldId);
    const audio = currentField && currentField.audio;
    const hasGenerated = !!(audio && audio.type === 'tts' && audio.generatedUrl);
    if (!hasGenerated || typeof isTtsAudioStale !== 'function'){
      ttsStaleEl.style.display = 'none';
      ttsStaleEl.textContent = '';
      return;
    }
    const stale = await isTtsAudioStale(currentField);
    if (!block.isConnected) return; // container abandonado enquanto o hash era calculado (mesmo guard já usado por upload/geração)
    if (stale){
      ttsStaleEl.style.display = '';
      ttsStaleEl.textContent = t('fieldEditor.audio.stale');
      if (ttsGenerateBtn) ttsGenerateBtn.textContent = t('fieldEditor.audio.generateAgain');
    } else {
      ttsStaleEl.style.display = 'none';
      ttsStaleEl.textContent = '';
    }
  }
  if (ttsPanel) refreshTtsStaleUi();

  if (ttsGenerateBtn){
    ttsGenerateBtn.addEventListener('click', async () => {
      const textEl = block.querySelector('[data-field-audio-tts-text]');
      const langEl = block.querySelector('[data-field-audio-tts-lang]');
      const voiceEl = block.querySelector('[data-field-audio-tts-voice]');
      const rateEl = block.querySelector('[data-field-audio-tts-rate]');
      const msgEl = block.querySelector('[data-field-audio-tts-msg]');
      const text = (textEl && textEl.value) || '';
      const language = (langEl && langEl.value) || '';
      const voiceId = (voiceEl && voiceEl.value.trim()) || null;
      const rate = rateEl ? Number(rateEl.value) : null;

      if (errorEl) errorEl.textContent = '';
      if (typeof validateTtsGenerationRequest === 'function'){
        const v = validateTtsGenerationRequest({ text, language });
        if (!v.ok){
          if (errorEl) errorEl.textContent = v.error;
          return;
        }
      }
      if (typeof opts.ttsFn !== 'function' || !opts.noteId){
        if (errorEl) errorEl.textContent = t('fieldEditor.audio.err.genUnavailable');
        return;
      }

      // Fase 7h.2 -- captura a "geração" desta tentativa (ver comentário
      // de FIELD_AUDIO_OP_GENERATION_REGISTRY acima): protege contra OUTRA
      // ORIGEM (upload/URL/gravação/"Sem áudio") assumir field.audio
      // enquanto esta geração ainda está em voo -- eixo diferente do
      // myKey/currentKey
      // logo abaixo, que só protege contra a PRÓPRIA config de TTS mudar.
      const myGeneration = beginAudioOp();

      // Concorrência (Seção 11 da auditoria da Fase 7f) -- calcula o
      // generationKey da config NO MOMENTO DO CLIQUE, antes de disparar a
      // requisição. Se a pessoa editar texto/idioma/voz/velocidade
      // enquanto a geração está em voo, a resposta que voltar é
      // comparada de novo contra a config ATUAL do formulário -- só
      // aplicada se ainda bater; senão é DESCARTADA silenciosamente
      // (nunca sobrescreve uma config mais nova com um resultado velho).
      const myKey = (typeof computeTtsGenerationKey === 'function')
        ? await computeTtsGenerationKey(text, language, voiceId, rate)
        : null;

      // Idempotência (Fase 7f -- implementação, Seções 2.8/6 da própria
      // especificação): se o Field JÁ tem um asset TTS gerado pra ESTA
      // MESMA config (mesmo generationKey), não gasta uma chamada de rede/
      // custo de provedor à toa -- reutiliza o asset já existente (o
      // `<audio>`/botão de tocar já reflete `field.audio.generatedUrl`,
      // sem precisar de nenhuma ação nova). Comparação 100% local (mesmo
      // hash já calculado acima pra `myKey`), sem tabela de cache global --
      // o "cache" é o próprio `field.audio` do Field, exatamente como a
      // especificação exige.
      const fieldBeforeGen = (editorState.fields || []).find(f => f.id === fieldId);
      const existingAudio = fieldBeforeGen && fieldBeforeGen.audio;
      if (existingAudio && existingAudio.type === 'tts' && existingAudio.generatedUrl
        && myKey !== null && existingAudio.generationKey === myKey){
        if (msgEl) msgEl.textContent = t('fieldEditor.audio.alreadyUpToDate');
        return;
      }

      ttsGenerateBtn.disabled = true;
      const originalLabel = ttsGenerateBtn.textContent;
      ttsGenerateBtn.textContent = t('fieldEditor.audio.generating');
      if (msgEl) msgEl.textContent = '';

      const res = await opts.ttsFn({ rowId: opts.noteId, fieldId, text, language, voiceId, rate });

      if (!block.isConnected) return; // guarda contra container abandonado enquanto a geração estava em voo (Seção 8, mesmo padrão do upload)

      ttsGenerateBtn.disabled = false;
      ttsGenerateBtn.textContent = originalLabel;

      if (!res.ok){
        if (errorEl) errorEl.textContent = res.error || t('fieldEditor.audio.err.genFailed');
        return; // falha nunca sobrescreve o áudio anterior (se havia) -- mesma regra do upload.
      }

      if (myGeneration !== currentFieldAudioOpGeneration(fieldId)){
        // Outra origem (upload/URL/gravação/"Sem áudio") já assumiu
        // field.audio enquanto esta geração estava em voo (Fase 7h.2) --
        // descarta o resultado silenciosamente, nunca sobrescreve o que já
        // é mais recente. O áudio devolvido continua salvo no Storage
        // (órfão, best-effort -- sem garbage collector nesta fase).
        if (msgEl) msgEl.textContent = t('fieldEditor.audio.discardedGen');
        return;
      }

      const stillCurrentText = (textEl && textEl.value) || '';
      const stillCurrentLanguage = (langEl && langEl.value) || '';
      const stillCurrentVoiceId = (voiceEl && voiceEl.value.trim()) || null;
      const stillCurrentRate = rateEl ? Number(rateEl.value) : null;
      const currentKey = (typeof computeTtsGenerationKey === 'function')
        ? await computeTtsGenerationKey(stillCurrentText, stillCurrentLanguage, stillCurrentVoiceId, stillCurrentRate)
        : myKey;
      if (myKey !== null && currentKey !== myKey){
        // A pessoa mudou a config enquanto a geração estava em voo --
        // resultado obsoleto, descartado (nunca aplicado). O áudio
        // devolvido ainda ficou salvo no Storage (órfão) -- best-effort,
        // mesma categoria já documentada pra remoção/substituição (sem
        // garbage collector nesta fase).
        if (msgEl) msgEl.textContent = t('fieldEditor.audio.configChanged');
        return;
      }

      // Só ATUALIZA field.audio depois da geração ter sucesso de verdade
      // (mesma regra 2/9 do upload) -- text:null quando o texto digitado
      // é idêntico ao texto de exibição do Field (sem override explícito,
      // ver ttsEffectiveText em shared/flashcard-model.js); um override
      // real só é gravado quando a pessoa de fato mudou o texto padrão.
      const currentField = (editorState.fields || []).find(f => f.id === fieldId);
      const currentFieldText = (currentField && currentField.content && currentField.content.value) || '';
      const override = (text !== currentFieldText) ? text : null;
      editorState.__freshMediaUploads = editorState.__freshMediaUploads || [];
      editorState.__freshMediaUploads.push({ path: res.path, deleteFn: opts.deleteFn || null });
      // storagePath (Decisão 4, ver CLAUDE.md/shared/flashcard-model.js) --
      // a IDENTIDADE persistente do asset no bucket (res.path, o mesmo
      // valor já rastreado em __freshMediaUploads acima), gravada
      // SEPARADA de generatedUrl (a URL de acesso derivada/cacheada) --
      // nunca a única fonte de verdade, só a referência estável pra uma
      // futura rotina de limpeza/re-derivação de URL.
      updateFieldInEditorState(editorState, fieldId, {
        audio: {
          type: 'tts', text: override, language, voiceId, rate,
          generationKey: res.generationKey, generatedUrl: res.url, generatedAt: res.generatedAt,
          storagePath: res.path || null,
        },
      });
      if (onChange) onChange('structure', fieldId);
    });
  }

  // ---------- Fase 7g (gravação de áudio por Field, ver CLAUDE.md) ----------
  //
  // getOrCreateFieldAudioRecorder() REAPROVEITA a instância viva deste
  // Field entre re-renders (nunca cria uma nova a cada wire-up) -- sem
  // isso, um re-render disparado por OUTRO Field (add/remove campo em
  // qualquer lugar da mesma caixa) destruiria a referência ao
  // MediaRecorder/stream ativos enquanto este Field estivesse gravando,
  // vazando o microfone ligado sem nenhum jeito de pará-lo pela UI.
  // `onReady` só é chamado DEPOIS que a gravação já foi enviada ao
  // Storage com sucesso (mesma disciplina de upload/TTS -- nunca antes) --
  // é só aí que field.audio é atualizado.
  const recordStartBtn = block.querySelector('[data-field-audio-record-start]');
  const recordStopBtn = block.querySelector('[data-field-audio-record-stop]');
  const recordCancelBtn = block.querySelector('[data-field-audio-record-cancel]');
  const recordStatusEl = block.querySelector('[data-field-audio-record-status]');
  if (typeof getOrCreateFieldAudioRecorder === 'function' && (recordStartBtn || recordStopBtn || recordCancelBtn)){
    const recorder = getOrCreateFieldAudioRecorder(fieldId, {
      uploadFn: opts.uploadFn || null,
      deleteFn: opts.deleteFn || null,
      onReady: (result) => {
        // Guarda contra o container ter sido removido do DOM enquanto o
        // upload estava em voo (mesmo padrão já usado por upload/TTS) --
        // nunca muta um editorState que a tela já abandonou.
        if (!block.isConnected) return;
        editorState.__freshMediaUploads = editorState.__freshMediaUploads || [];
        editorState.__freshMediaUploads.push({ path: result.path, deleteFn: result.deleteFn || null });
        // Fase 7h.2 -- protege contra OUTRA ORIGEM (TTS/upload/URL/"Sem
        // áudio") ter assumido field.audio enquanto esta gravação (que
        // sobrevive a trocas de origem E a re-renders inteiros da caixa,
        // ver comentário de FIELD_AUDIO_OP_GENERATION_REGISTRY acima) ainda
        // estava em voo -- descarta silenciosamente, nunca sobrescreve. O
        // valor é lido do REGISTRO module-level (nunca uma variável local
        // deste closure) porque `onReady` pode disparar bem depois de um ou
        // mais re-renders estruturais terem recriado este wiring do zero.
        const pendingGen = FIELD_AUDIO_PENDING_RECORDING_REGISTRY[fieldId];
        if (pendingGen !== undefined && pendingGen !== currentFieldAudioOpGeneration(fieldId)) return;
        updateFieldInEditorState(editorState, fieldId, {
          audio: { type: 'recording', url: result.url, recordedAt: result.recordedAt, mimeType: result.mimeType, durationMs: result.durationMs, storagePath: result.path || null },
        });
        if (onChange) onChange('structure', fieldId);
      },
    });

    const applyRecorderUi = (recState) => {
      if (!block.isConnected) return;
      if (recordStatusEl) recordStatusEl.textContent = fieldAudioRecordingStatusLabel(recState);
      const status = (recState && recState.status) || 'idle';
      if (recordStartBtn){
        recordStartBtn.style.display = canStartFieldAudioRecording(status) ? '' : 'none';
        recordStartBtn.textContent = (status === 'ready' || status === 'error') ? t('fieldEditor.audio.rerecord') : t('fieldEditor.audio.record');
      }
      if (recordStopBtn) recordStopBtn.style.display = canStopFieldAudioRecording(status) ? '' : 'none';
      if (recordCancelBtn) recordCancelBtn.style.display = canCancelFieldAudioRecording(status) ? '' : 'none';
    };
    applyRecorderUi(recorder.getState());
    recorder.onStateChange(applyRecorderUi);

    if (recordStartBtn){
      recordStartBtn.addEventListener('click', () => {
        if (errorEl) errorEl.textContent = '';
        // Fase 7h.2 -- captura a "geração" desta tentativa de gravação NO
        // CLIQUE (não em onReady, que dispara bem depois, possivelmente
        // após a pessoa ter trocado de origem e voltado, e possivelmente
        // depois de um ou mais re-renders estruturais -- ver comentário de
        // FIELD_AUDIO_OP_GENERATION_REGISTRY acima). Gravada no REGISTRO
        // module-level, nunca numa variável local deste closure, porque
        // `onReady` (acima) pode rodar num closure diferente deste.
        FIELD_AUDIO_PENDING_RECORDING_REGISTRY[fieldId] = beginAudioOp();
        recorder.start();
      });
    }
    if (recordStopBtn) recordStopBtn.addEventListener('click', () => recorder.stop());
    if (recordCancelBtn) recordCancelBtn.addEventListener('click', () => recorder.cancel());
  }

  if (removeBtn){
    removeBtn.addEventListener('click', () => {
      beginAudioOp(); // Fase 7h.2 -- remoção explícita invalida qualquer operação de outra origem ainda em voo.
      // Seção 10 -- remoção EXPLÍCITA é só de REFERÊNCIA (field.audio =
      // null), NUNCA delete físico do objeto no Storage: um Field
      // clonado (cloneFieldIntoEditorState, Fase 6D.3) copia `audio` por
      // VALOR (mesma URL), então 2 Fields podem apontar pro mesmo
      // arquivo sem nenhuma contagem de referências -- deletar aqui
      // arriscaria quebrar o áudio do OUTRO Field clonado. O arquivo
      // órfão fica documentado no relatório desta fase (CLAUDE.md) como
      // candidato a uma rotina de limpeza futura, nunca apagado às cegas
      // agora ("nenhum garbage collector é necessário nesta fase").
      updateFieldInEditorState(editorState, fieldId, { audio: null });
      if (onChange) onChange('structure', fieldId);
    });
  }
}

// ---------- Validação básica (Fase 6D.3 -- só o Field, não o Card Type
// inteiro; validação de cardinalidade por tipo, como Múltipla Escolha,
// continua sendo trabalho de fase futura/do motor, nunca deste módulo) ----------
// Não é chamada por nenhum fluxo de submit nesta subfase (submit continua
// 100% legacy, ver shared/admin-flashcards.js/shared/my-flashcards.js) --
// existe pronta pra quando 6D.6+ precisar dela.
function isValidFieldState(field){
  if (!field || typeof field !== 'object') return false;
  if (typeof field.id !== 'string' || !field.id) return false;
  if (!field.content || typeof field.content.value !== 'string') return false;
  return true;
}

// ---------- Render ----------

// Renderiza UM Field -- textarea de conteúdo + select de idioma + um
// indicador textual (não editável) de áudio/imagem/pinyin já vinculados,
// se existirem. `opts.namePrefix` evita colisão de id quando o mesmo
// componente aparece 2x na mesma página (admin + my-flashcards).
// Imagem do campo: um link discreto ("🖼️ Imagem") que só abre o seletor
// de arquivo quando clicado. Com imagem: miniatura + Trocar / Remover.
// Sem uploadFn (ex.: Preview), mostra só a miniatura, sem botões.
function renderFieldImageBlockHTML(field, opts){
  opts = opts || {};
  const url = field.image && typeof field.image.url === 'string' ? field.image.url : '';
  const canUpload = typeof opts.uploadFn === 'function';
  if (!url && !canUpload) return '';
  return `
    <div class="field-image-block" data-field-image-field="${field.id}">
      ${url ? `<img class="field-image-thumb" src="${escapeHTML(url)}" alt="${escapeHTML(t('review.image.alt'))}">` : ''}
      ${canUpload ? `<div class="field-image-actions">
        <button type="button" class="field-image-link" data-field-image-pick>${escapeHTML(t(url ? 'review.image.change' : 'review.image.add'))}</button>
        ${url ? `<button type="button" class="field-image-link" data-field-image-remove>${escapeHTML(t('review.image.remove'))}</button>` : ''}
        <span class="field-image-status" data-field-image-status></span>
      </div>
      <input type="file" accept="${FIELD_IMAGE_UPLOAD_MIME_TYPES.join(',')}" data-field-image-input hidden>
      <p class="profile-edit-field-error" data-field-image-error></p>` : ''}
    </div>`;
}

function wireFieldImageBlockFor(block, editorState, fieldId, onChange, opts){
  opts = opts || {};
  const input = block.querySelector('[data-field-image-input]');
  const statusEl = block.querySelector('[data-field-image-status]');
  const errorEl = block.querySelector('[data-field-image-error]');
  block.querySelector('[data-field-image-pick]')?.addEventListener('click', () => input && input.click());
  block.querySelector('[data-field-image-remove]')?.addEventListener('click', () => {
    // Só tira a referência; nunca apaga o arquivo (pode ser de um campo clonado).
    updateFieldInEditorState(editorState, fieldId, { image: null });
    if (onChange) onChange('structure', fieldId);
  });
  input?.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (errorEl) errorEl.textContent = '';
    const v = validateFieldImageUploadFile(file);
    if (!v.ok){ if (errorEl) errorEl.textContent = v.error; input.value = ''; return; }
    if (typeof opts.uploadFn !== 'function') return;
    input.disabled = true;
    if (statusEl) statusEl.textContent = t('review.image.uploading');
    const up = await opts.uploadFn(file, 'image', fieldId);
    if (!block.isConnected) return;
    input.disabled = false;
    input.value = '';
    if (statusEl) statusEl.textContent = '';
    if (!up || !up.ok){
      if (errorEl) errorEl.textContent = (up && up.error) || t('review.image.uploadError');
      return; // a imagem anterior (se havia) continua
    }
    editorState.__freshMediaUploads = editorState.__freshMediaUploads || [];
    editorState.__freshMediaUploads.push({ path: up.path, deleteFn: opts.deleteFn || null });
    updateFieldInEditorState(editorState, fieldId, {
      image: { url: up.url, uploadedAt: new Date().toISOString(), mimeType: file.type || null },
    });
    if (onChange) onChange('structure', fieldId);
  });
}

function renderFieldEditorHTML(field, index, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'field-editor';
  const removable = opts.removable !== false;
  const label = opts.label || t('fieldEditor.field.defaultLabel', { n: index + 1 });
  const contentValue = field.content && typeof field.content.value === 'string' ? field.content.value : '';
  // Fase 7e (ver CLAUDE.md) -- áudio saiu de `mediaNotes` (texto estático)
  // e virou o editor de verdade (renderFieldAudioBlockHTML, acima) --
  // imagem/pinyin continuam só indicador textual, ainda fora do escopo
  // desta subfase (Seção 8/19 -- só upload de ÁUDIO é implementado agora).
  const mediaNotes = [];
  if (field.pinyinFieldId) mediaNotes.push(t('fieldEditor.field.hasPinyin'));
  return `
    <div class="field-editor-row" data-field-editor data-field-id="${field.id}" data-field-index="${index}">
      <div class="field-editor-head">
        <span class="section-label field-editor-title">${escapeHTML(label)}</span>
        ${removable ? `<button type="button" class="admin-badge-delete-btn" data-field-remove="${field.id}" data-touch44 title="${t('fieldEditor.field.removeTitle')}">🗑</button>` : ''}
      </div>
      <label class="profile-edit-label" for="${namePrefix}-content-${field.id}">${t('fieldEditor.field.content')}</label>
      <textarea id="${namePrefix}-content-${field.id}" class="profile-edit-input profile-edit-textarea" rows="2" data-field-content="${field.id}">${escapeHTML(contentValue)}</textarea>
      <label class="profile-edit-label" for="${namePrefix}-lang-${field.id}">${t('fieldEditor.field.language')}</label>
      <select id="${namePrefix}-lang-${field.id}" class="profile-edit-input" data-field-lang="${field.id}">
        <option value="" ${!field.lang ? 'selected' : ''}>${t('fieldEditor.lang.notSet')}</option>
        ${FIELD_LANG_OPTIONS.map(o => `<option value="${o.value}" ${field.lang === o.value ? 'selected' : ''}>${t(o.labelKey)}</option>`).join('')}
      </select>
      ${renderFieldAudioBlockHTML(field, opts)}
      ${renderFieldImageBlockHTML(field, opts)}
      ${mediaNotes.length ? `<p class="profile-edit-hint" style="margin-top:6px;">${mediaNotes.join(' · ')}</p>` : ''}
    </div>
  `;
}

// Renderiza a lista completa de Fields de um editorState nativo + botão de
// "adicionar campo". Puramente descritivo -- wireFieldEditorList() precisa
// rodar depois de inserir este HTML no DOM pra mutação de verdade acontecer.
function renderFieldEditorListHTML(editorState, opts){
  opts = opts || {};
  const fields = editorState.fields || [];
  return `
    <div data-field-editor-list>
      ${fields.length ? fields.map((f, i) => renderFieldEditorHTML(f, i, opts)).join('') : `<p class="profile-edit-hint">${t('fieldEditor.list.empty')}</p>`}
    </div>
    ${opts.allowAdd !== false ? `<button type="button" class="admin-select-link" data-field-add data-touch44>${t('fieldEditor.list.add')}</button>` : ''}
  `;
}

// ---------- Mutadores puros (Field state -- nunca tocam CardInstance/FSRS/
// nunca chamam rede) ----------

// Fase 6D.8 -- os Fields que são satélite de pinyin de outro Field (alvo
// de ALGUM field.pinyinFieldId na mesma Note) nunca contam como candidato
// a "campo sem papel ainda" -- mesmo critério que contentFieldIndices()
// (motor, shared/flashcard-model.js) já usa pra nunca tratar um satélite
// de pinyin como um slot de conteúdo próprio. Achado real durante a Fase
// 6D.8: transitionToMultipleChoice()/transitionToTypeAnswer() (6D.4a/6D.4b)
// nunca excluíam o satélite ao escolher `unroled[cursor]` -- inofensivo
// enquanto nenhum estado convertido de legado carregava um satélite de
// pinyin antes de trocar de Card Type, mas quebrava de verdade nesse
// cenário real (ex: converter um Normal zh com front_pinyin, depois trocar
// pra "Digite a resposta" -- o Field de pinyin virava `answer` por engano,
// perdendo a tradução real). Corrigido aqui, reutilizado pelos 2
// transitionTo*, nunca duplicado.
function fieldIsPinyinSatellite(field, fields){
  return fields.some(f => f.pinyinFieldId === field.id);
}

// Idioma inicial de um campo novo (só um ponto de partida; a pessoa troca
// no seletor). Pedido da autora: o 1º campo começa no idioma estudado e o
// 2º em português. Pergunta (role 'prompt') = idioma estudado; resposta e
// opções erradas = português. Sem idioma conhecido do site, fica em branco.
function defaultLangForNewField(editorState, role){
  const studyLang = (typeof STUDY_LANG_FOR_APP_KEY !== 'undefined' && editorState) ? STUDY_LANG_FOR_APP_KEY[editorState.languageAppKey] : null;
  if (!studyLang) return null;
  if (role === 'prompt') return studyLang;
  if (role === 'answer' || role === 'distractor') return 'pt-BR';
  const fields = (editorState.fields || []).filter(f => !fieldIsPinyinSatellite(f, editorState.fields));
  return fields.length === 0 ? studyLang : 'pt-BR';
}

// Cria um Field NOVO (id gerado por createFieldState, Fase 6D.1) e o
// adiciona ao FIM de editorState.fields. `fields` continua sendo só a
// ordem estrutural/editorial -- nunca interpretado como frente/verso por
// este módulo.
function addFieldToEditorState(editorState, overrides){
  const o = Object.assign({}, overrides || {});
  if (o.lang === undefined){
    const lang = defaultLangForNewField(editorState, o.role);
    if (lang) o.lang = lang;
  }
  const field = createFieldState(o);
  editorState.fields = editorState.fields.concat([field]);
  return field;
}

// Remove um Field pelo ID -- nunca por índice (índice não é identidade,
// restrição 4 da Fase 6D.3). Os Fields restantes preservam seus próprios
// ids/conteúdo/lang/role/audio/image/pinyinFieldId intactos.
function removeFieldFromEditorState(editorState, fieldId){
  editorState.fields = editorState.fields.filter(f => f.id !== fieldId);
}

// Atualiza SÓ os campos passados em `patch` de um Field já existente,
// casando por id -- NUNCA cria um Field novo, NUNCA gera um id novo pro
// Field editado. Campos de `patch` não mencionados (audio/image/role/
// pinyinFieldId quando o patch só mexe em content/lang, por exemplo)
// continuam exatamente como estavam -- é isso que garante que editar
// texto/idioma nunca apaga áudio/imagem/pinyinFieldId já vinculados
// (restrições 8/9/10 da Fase 6D.3).
function updateFieldInEditorState(editorState, fieldId, patch){
  editorState.fields = editorState.fields.map(f => {
    if (f.id !== fieldId) return f;
    const next = Object.assign({}, f, patch);
    if (patch && patch.content !== undefined) next.content = normalizeFieldContent(patch.content);
    return next;
  });
}

// Clonagem DELIBERADA de um Field -- o único caso em que um ID NOVO é
// esperado (restrição 4). Copia lang/role/content/audio/image do
// original, mas NUNCA copia pinyinFieldId -- um pinyinFieldId apontaria
// pro Field ORIGINAL, não faria sentido no clone (e criaria uma referência
// cruzada entre dois Fields que o usuário não pediu).
function cloneFieldIntoEditorState(editorState, fieldId){
  const original = (editorState.fields || []).find(f => f.id === fieldId);
  if (!original) return null;
  const clone = createFieldState({
    lang: original.lang,
    role: original.role,
    content: { value: original.content && typeof original.content.value === 'string' ? original.content.value : '' },
    audio: original.audio,
    image: original.image,
    pinyinFieldId: null,
  });
  editorState.fields = editorState.fields.concat([clone]);
  return clone;
}

// ---------- Wiring: liga o DOM (data-field-*) aos mutadores acima ----------
// `onChange(kind, fieldId)` é chamado depois de QUALQUER mutação --
// `kind` é 'content'/'lang'/'remove'/'add'. Quem integra decide o que
// fazer: mutação de texto/idioma não precisa de re-render (o próprio
// input/select já reflete a mudança, e re-renderizar apagaria o que a
// pessoa está digitando -- mesma disciplina de
// updateFlashcardsSelectionDependentUI(), ver "UX-fix 5" no CLAUDE.md);
// add/remove SIM precisam de re-render (a lista de linhas mudou).
// `opts` (novo, Fase 7e -- ver CLAUDE.md) é opcional, repassado pra
// wireFieldAudioBlockFor() (uploadFn/deleteFn) -- nenhum dos 4 wirings
// pré-existentes (content/lang/remove/add) precisou de `opts`, só o de
// áudio, adicionado ao final.
function wireFieldEditorList(container, editorState, onChange, opts){
  if (!container) return;
  container.querySelectorAll('[data-field-content]').forEach(el => {
    el.addEventListener('input', () => {
      updateFieldInEditorState(editorState, el.dataset.fieldContent, { content: { value: el.value } });
      if (onChange) onChange('content', el.dataset.fieldContent);
    });
  });
  container.querySelectorAll('[data-field-lang]').forEach(el => {
    el.addEventListener('change', () => {
      updateFieldInEditorState(editorState, el.dataset.fieldLang, { lang: el.value || null });
      if (onChange) onChange('lang', el.dataset.fieldLang);
    });
  });
  container.querySelectorAll('[data-field-remove]').forEach(el => {
    el.addEventListener('click', () => {
      const fieldId = el.dataset.fieldRemove;
      // Fase 7g -- libera (cancela + tira do registro) qualquer gravação
      // em andamento/pendente deste Field ANTES de removê-lo -- nunca
      // deixa um microfone ligado órfão referenciando um Field que não
      // existe mais no editorState.
      if (typeof releaseFieldAudioRecorder === 'function') releaseFieldAudioRecorder(fieldId);
      // Fase 7h.2 -- limpa também o registro de "geração" de áudio deste
      // Field (removido de verdade, nunca mais vai casar com nenhum
      // resultado tardio de qualquer origem).
      clearFieldAudioOpGeneration(fieldId);
      removeFieldFromEditorState(editorState, fieldId);
      if (onChange) onChange('remove', fieldId);
    });
  });
  const addBtn = container.querySelector('[data-field-add]');
  if (addBtn){
    addBtn.addEventListener('click', () => {
      const field = addFieldToEditorState(editorState, {});
      if (onChange) onChange('add', field.id);
    });
  }
  // Fase 7e -- liga o editor de áudio de CADA Field mostrado neste
  // container VIA renderFieldEditorHTML (escopado a `[data-field-editor]
  // [data-field-audio-field]`, de propósito -- o Field de FRASE do Cloze
  // tem seu próprio bloco de áudio, injetado direto por
  // renderClozeEditorHTML() FORA de qualquer `.field-editor-row`, e é
  // wireado explicitamente por wireClozeEditor(); sem este escopo, os
  // dois wirings casariam o MESMO bloco e duplicariam os listeners de
  // upload/remoção nele).
  container.querySelectorAll('[data-field-editor] [data-field-audio-field]').forEach(block => {
    wireFieldAudioBlockFor(container, editorState, block.dataset.fieldAudioField, onChange, opts);
  });
  container.querySelectorAll('[data-field-editor] [data-field-image-field]').forEach(block => {
    wireFieldImageBlockFor(block, editorState, block.dataset.fieldImageField, onChange, opts);
  });
}

// Helper de integração reutilizado pelos dois editores (admin/my-flashcards)
// -- re-renderiza SÓ a caixa de Fields nativos (nunca o form inteiro) e
// rewire, quando a MUDANÇA foi estrutural (add/remove, ou 'structure' --
// Fase 7e, emitido por um upload/remoção de áudio concluído); edição de
// texto/idioma já está refletida no próprio DOM sem precisar de nada
// extra. `boxEl` é o container que recebe renderFieldEditorListHTML();
// `opts` é repassado pra renderFieldEditorHTML (namePrefix/label/
// removable/allowAdd) E pra wireFieldEditorList (uploadFn/deleteFn,
// Fase 7e).
function refreshNativeFieldsBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderFieldEditorListHTML(editorState, opts);
  wireFieldEditorList(boxEl, editorState, (kind) => {
    if (kind === 'add' || kind === 'remove' || kind === 'structure') refreshNativeFieldsBox(boxEl, editorState, opts);
  }, opts);
}

// ===== shared/flashcard-native-persistence.js =====
// ---------- Persistência nativa do editor -- Fase 6D.6 da reestruturação
// Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Único arquivo que liga Editor State (6D.1-6D.5) -> validação ->
// Supabase. Nenhum outro ponto do editor monta `fields`/`card_generation_mode`
// à mão -- shared/teacher-flashcards.js/shared/own-flashcards.js só
// recebem o payload já pronto por este arquivo
// (nativeContentColumnsFromEditorState) e fazem o MESMO INSERT/UPDATE de
// sempre, com as colunas nativas misturadas no MESMO objeto que já grava
// teacher_id/student_id/owner_id/language_app_key/status -- atomicidade
// vem de ser 1 ÚNICA chamada supabase-js (1 statement SQL), nunca 2
// chamadas separadas pra fields e card_generation_mode (Seção 12).
//
// LEGACY ABERTO != AUTOMATICAMENTE MIGRADO (regra central desta fase,
// Seção 6) -- nada neste arquivo é chamado sozinho. Um cartão legado só
// vira nativo quando shared/admin-flashcards.js/shared/my-flashcards.js
// decidem explicitamente chamar nativeNoteEditorStateFromLegacyRow() (ação
// do usuário -- "Usar o novo editor de campos") E o usuário confirma
// salvando o formulário nativo resultante. Ler+cancelar nunca grava nada.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- depois de
// shared/flashcard-cloze-editor.js, antes de shared/teacher-flashcards.js):
//   - shared/flashcard-editor-state.js (noteEditorStateToRow,
//     isNativeNoteEditorState, createNativeNoteEditorState, createFieldState)
//   - shared/flashcard-model.js (validateNativeNoteRow, contentFieldIndices,
//     isNoteFieldsPresent, isCardGenerationModePresent, STUDY_LANG_FOR_APP_KEY,
//     isStudyLanguageField -- Fase 6D.8, ver abaixo)
//   - shared/flashcard-mc-editor.js       (validateNativeMultipleChoiceStructure)
//   - shared/flashcard-typeanswer-editor.js (validateNativeTypeAnswerStructure)
//   - shared/flashcard-cloze-editor.js    (validateNativeClozeStructure)

// ---------- Fase 6D.8 -- classificação do modelo de uma linha (Seção 15) ----------
//
// Nome explícito pro padrão que já era usado implicitamente em 4 pontos
// (shared/admin-flashcards.js/shared/my-flashcards.js: decidir se um
// cartão já carregado é nativo, legado, ou um estado híbrido nunca
// esperado). O CHECK constraint da migration 045 (fields/card_generation_mode
// sempre pareados) já torna 'invalid' estruturalmente impossível numa linha
// real vinda do Supabase -- mas esta função existe mesmo assim como ponto
// único, auditável, de checagem defensiva no cliente (Seção 15 pede
// explicitamente que o front-end NUNCA aceite silenciosamente um estado
// híbrido como se fosse nativo válido) -- nunca reimplementa
// validateNativeNoteRow(), só decide qual dos 3 buckets uma linha cai antes
// de qualquer decisão de UI (mostrar form legado vs. nativo).
function classifyFlashcardRowModel(row){
  const hasFields = isNoteFieldsPresent(row);
  const hasMode = isCardGenerationModePresent(row);
  if (hasFields && hasMode) return 'native';
  if (!hasFields && !hasMode) return 'legacy';
  return 'invalid';
}

// ---------- CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- decisão de revision no save
// do editor nativo, único ponto, reutilizado por admin-flashcards.js e
// my-flashcards.js (nunca duplicado) ----------
//
// Cobre os 2 cenários que chegam ao mesmo botão "Salvar":
// 1. Edição nativa->nativa (row já era native): compara o editorState
//    atual contra `createNativeNoteEditorStateFromRow(row)` (reconstrução
//    do que está gravado) -- já era assim desde a Fase 6D.6, sem mudança.
// 2. Conversão Legacy->Native ACABADA DE ACONTECER nesta sessão de edição:
//    ANTES desta fase, `revision` incrementava incondicionalmente aqui --
//    sempre resetando FSRS, mesmo quando a professora/aluna só clicou
//    "Usar o novo editor" e salvou sem tocar em nada. Agora compara contra
//    `conversionBaseline` (um clone do editorState capturado no instante
//    da conversão, antes de qualquer edição -- ver
//    ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline/
//    MY_FLASHCARDS_STATE.editingNativeConversionBaseline) com o MESMO
//    `noteEditorStateRequiresNewRevision()` já usado no caso 1 -- nunca
//    uma segunda implementação de comparação.
//
// EXCEÇÃO CONFIRMADA (achado de auditoria desta fase, documentado em vez
// de corrigido silenciosamente): Cloze nunca entra nesse caminho
// "preservado" -- o motor NATIVO (interpretNativeNoteFromRow, shared/
// flashcard-model.js) sempre sufixa o id do CardInstance com "-{markId}"
// (mesmo pra 1 marca só, ex: "t500-c1"), enquanto o Cloze LEGADO de marca
// única (interpretNoteFromRow, ramo "___") usa o id SEM sufixo ("t500").
// flashcardIdForRow() nunca muda (só depende de row.id/revision), mas o
// id de CardInstance final muda de qualquer jeito por causa dessa
// diferença estrutural entre os 2 caminhos de interpretação -- preservar
// `revision` sozinho NÃO preserva o histórico de revisão de um Cloze
// convertido. Resolver isso exigiria mudar o esquema de id do Cloze
// nativo (usado por TODO cartão Cloze nativo, não só conversão) -- fora
// do escopo desta fase (proibido tocar em FSRS/CardInstance/renderer
// aqui, ver CLAUDE.md Seção 23). Por isso Cloze SEMPRE incrementa
// revision na conversão (idêntico ao comportamento que já existia antes
// desta fase) -- a mensagem "progresso reiniciado" (já derivada de
// `nextRevision > (c.revision||0)` nos 2 arquivos de UI) continua batendo
// com a realidade em vez de prometer uma preservação que a arquitetura
// atual não entrega.
function nextRevisionForNativeSave(c, editorState, conversionBaseline){
  const current = c.revision || 0;
  const wasNative = classifyFlashcardRowModel(c) === 'native';
  if (wasNative){
    const original = createNativeNoteEditorStateFromRow(c);
    return noteEditorStateRequiresNewRevision(original, editorState) ? current + 1 : current;
  }
  const baselineWasCloze = !!conversionBaseline && conversionBaseline.cardGenerationMode === 'cloze';
  if (conversionBaseline && !baselineWasCloze && !noteEditorStateRequiresNewRevision(conversionBaseline, editorState)){
    return current;
  }
  return current + 1;
}

// ---------- Fase 6D.8 -- preflight de conversão (Seção 6/8/18) ----------
//
// Chamado ANTES de nativeNoteEditorStateFromLegacyRow(), só pra bloquear os
// 2 casos em que o MAPEAMENTO em si é genuinamente indeterminável -- nunca
// pra exigir conteúdo completo (isso já é responsabilidade de
// validateNoteEditorStateForSave(), rodada dentro do editor nativo depois
// da conversão, com a MESMA disciplina de "a UI pode apresentar os dados
// existentes pra correção manual" que a Seção 18 já autoriza). A distinção
// importa: um cartão MC sem 3ª opção errada, ou um Cloze sem tradução
// ainda, são casos de CONTEÚDO INCOMPLETO -- convertem normalmente, o
// usuário vê os campos já preenchidos e corrige o que falta antes de
// salvar. Os 2 casos abaixo são diferentes: não há ONDE colocar a
// informação, então converter de qualquer jeito produziria uma Nota nativa
// que PARECE válida mas está errada (exatamente o que a Seção 18 proíbe).
//
// 1. Cloze sem exatamente 1 "___" na frase -- sem isso, não dá pra saber
//    ONDE a lacuna fica. Achado real (não hipotético): o código de
//    conversão antigo usava `sentence.replace('___', markup)`, que
//    SILENCIOSAMENTE não faz nada se "___" não existir -- o Field
//    resultante teria a frase crua, zero marcas {{cN::...}}, e só seria
//    pego por acaso pela validação genérica "pelo menos 1 marca" (mensagem
//    que não explica a causa real: a frase nunca teve onde marcar).
// 2. Múltipla escolha sem resposta certa (back_trans vazio) -- o schema
//    legado é inequívoco sobre QUEM é a resposta certa (sempre back_trans,
//    nunca ambíguo entre choices[]), mas se essa coluna estiver vazia não
//    há nenhuma resposta certa pra promover a `role:'answer'` -- bloquear
//    em vez de criar um Field de resposta vazio que passaria despercebido
//    até o clique em Salvar.
// Etapa 3 (lote C): mensagem no idioma do site quando t() existe; sem ele (testes Node), o português de sempre.
// Plural (Etapa 4): `pt` pode ser { one, other }; com params.n numérico a forma sai por n === 1 (tp no catálogo).
function nativePersistenceText(key, pt, params){
  const plural = params && typeof params.n === 'number';
  if (plural && typeof tp === 'function'){
    const v = tp(key, params.n === 1 ? 1 : 2, params);
    if (v && v !== key) return v;
  } else if (typeof t === 'function'){
    const v = t(key, params);
    if (v && v !== key) return v;
  }
  const s = (pt && typeof pt === 'object') ? (plural && params.n === 1 ? pt.one : pt.other) : pt;
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? String(params[k]) : m));
}
function legacyFlashcardConversionPreflight(row){
  const isCloze = !!row.cloze_sentence;
  if (isCloze){
    const blankMatches = (row.cloze_sentence.match(/___/g) || []).length;
    if (blankMatches !== 1){
      return { ok: false, error: blankMatches === 0
        ? nativePersistenceText('noteConvert.err.noBlank', 'Esta frase de completar não tem nenhum "___" marcando a lacuna, então não dá para saber onde a resposta entra. Corrija a frase pelo formulário de sempre antes de usar o editor novo.')
        : nativePersistenceText('noteConvert.err.manyBlanks', 'Esta frase de completar tem mais de um "___". O formulário legado só suporta 1 lacuna por cartão, então não dá para determinar automaticamente qual delas vira a marca nativa. Corrija a frase pelo formulário de sempre antes de usar o editor novo.') };
    }
    return { ok: true };
  }
  const isMC = !!(row.choices && row.choices.length);
  if (isMC && !(row.back_trans || '').trim()){
    return { ok: false, error: nativePersistenceText('noteConvert.err.mcNoAnswer', 'Este cartão de múltipla escolha não tem uma resposta certa definida (verso vazio), então não dá para determinar qual é a resposta certa. Preencha o verso pelo formulário de sempre antes de usar o editor novo.') };
  }
  return { ok: true };
}

// ---------- Validação central (dispatcher único, reutilizado por
// shared/admin-flashcards.js e shared/my-flashcards.js, e pelos testes) ----------
//
// Reaproveita, sem duplicar, os validadores já construídos por Card Type
// nas Fases 6D.4a/6D.4b/6D.5 -- este arquivo NUNCA reimplementa a lógica
// de cardinalidade/estrutura, só decide qual validador chamar.
// normal/normal_reversed nunca ganharam validador próprio em nenhuma fase
// anterior (nunca precisaram -- 6D.2/6D.3 só editam Fields soltos, sem
// exigir conteúdo preenchido pra "testar livremente") -- validados aqui
// direto, com a MESMA disciplina das outras 3: validateNativeNoteRow
// estrutural (via noteEditorStateToRow, o mesmo transform usado pra
// persistir) + checagem de conteúdo não-vazio que a engine nunca fez.
function validateNoteEditorStateForSave(editorState){
  if (!isNativeNoteEditorState(editorState)){
    return { ok: false, error: 'Estado não é nativo -- nada a validar aqui.' };
  }
  // Fase I (Tags): limites de tag valem pra QUALQUER Card Type, no mesmo
  // ponto central de validação de save (nunca truncam em silêncio).
  const tagCheck = validateNoteTags(editorState.tags);
  if (!tagCheck.ok) return { ok: false, error: tagCheck.error };
  const mode = editorState.cardGenerationMode;
  if (mode === 'multiple_choice') return validateNativeMultipleChoiceStructure(editorState);
  if (mode === 'type_answer') return validateNativeTypeAnswerStructure(editorState);
  if (mode === 'cloze') return validateNativeClozeStructure(editorState);
  if (mode === 'normal' || mode === 'normal_reversed'){
    const row = noteEditorStateToRow(editorState);
    const structural = validateNativeNoteRow(row);
    if (!structural.ok) return structural;
    const slots = contentFieldIndices(editorState.fields || []);
    const isEmptyField = (f) => !f || !((f.content && f.content.value) || '').trim();
    if (isEmptyField(editorState.fields[slots[0]]) || isEmptyField(editorState.fields[slots[1]])){
      return { ok: false, error: nativePersistenceText('noteEditor.err.emptySides', 'Os dois campos de conteúdo (frente/verso) precisam ter texto.') };
    }
    return { ok: true };
  }
  return { ok: false, error: `Card Type desconhecido: "${mode}".` };
}

// Textos de preenchimento gravados em back_trans quando o Field correspondente
// está vazio. O DADO continua em português (é o que já está no banco); só a
// EXIBIÇÃO troca pelo texto da chave no idioma do site (Etapa 3, c4).
const LEGACY_MIRROR_PLACEHOLDERS = {
  multipleChoice: '(múltipla escolha)',
  cloze: '(completar a frase)',
  noTranslation: '(sem tradução)',
};

// Etapa 3 (c4, decisão da dona, 2026-10-19): texto "frente → verso" de uma
// linha crua (own_flashcards/teacher_flashcards) para as listas Meus cartões e
// "Cartões criados". Só exibição: a frente e o verso continuam vindo da linha
// (em pt-BR o resultado é exatamente o de antes); quando o verso é um dos
// textos de preenchimento acima, mostra a tradução da chave
// `flashcards.mirror.<tipo>` (em pt-BR a chave devolve o mesmo texto).
function flashcardRowDisplayTexts(row){
  const front = (row && row.front) || '';
  const back = (row && row.back_trans) || '';
  const kind = Object.keys(LEGACY_MIRROR_PLACEHOLDERS).find(k => LEGACY_MIRROR_PLACEHOLDERS[k] === back.trim());
  if (!kind || typeof t !== 'function') return { front, back };
  const shown = t('flashcards.mirror.' + kind);
  return { front, back: (shown && shown !== 'flashcards.mirror.' + kind) ? shown : back };
}

// ---------- Mirror legado (write-only, nunca lido de volta) ----------
//
// `back_trans` continua `not null` em teacher_flashcards/own_flashcards
// (nunca relaxado -- 6D.6 não altera schema, Seção 28/migration 026) --
// alguma coisa PRECISA ocupar essa coluna pra um INSERT nativo passar.
// `front` é mirrorado por consistência de leitura na lista "Cartões
// ativos" (flashcardCardRowHTML, shared/admin-flashcards.js) e no export
// Anki, que continuam lendo a linha crua sem nenhuma mudança nesta fase
// (Seção 26 -- não tocar legado desnecessariamente).
//
// NUNCA um segundo caminho de LEITURA de conteúdo: interpretNoteFromRow()
// (shared/flashcard-model.js) checa fields/card_generation_mode ANTES de
// qualquer lógica legada e nunca cai no ramo que lê front/back_trans/
// choices/cloze_sentence quando fields está presente (confirmado por
// leitura do motor antes de escrever este arquivo) -- este mirror é
// genuinamente write-only/decorativo pro motor, só serve às telas que
// ainda leem a linha crua (lista do admin), nunca é usado por
// resolveCardContentView()/renderReviewView() pra um cartão nativo.
function deriveLegacyMirrorFromNoteEditorState(editorState){
  const fields = editorState.fields || [];
  const mode = editorState.cardGenerationMode;
  const textOf = (f) => (f && f.content && f.content.value) ? f.content.value.trim() : '';
  if (mode === 'multiple_choice'){
    const prompt = fields.find(f => f.role === 'prompt');
    const answer = fields.find(f => f.role === 'answer');
    return { front: textOf(prompt) || null, back_trans: textOf(answer) || LEGACY_MIRROR_PLACEHOLDERS.multipleChoice };
  }
  const slots = contentFieldIndices(fields);
  if (mode === 'cloze'){
    // slots[0] carrega a sintaxe {{cN::...}} -- front fica vazio (mesmo
    // convênio do cloze legado, que nunca exibe front em nenhuma tela de
    // revisão); back_trans mostra a tradução (slots[1]), mesmo papel que
    // já tinha no cloze legado (texto revelado depois de responder).
    return { front: null, back_trans: textOf(fields[slots[1]]) || LEGACY_MIRROR_PLACEHOLDERS.cloze };
  }
  // normal/normal_reversed/type_answer -- par posicional direto.
  return {
    front: textOf(fields[slots[0]]) || null,
    back_trans: textOf(fields[slots[1]]) || LEGACY_MIRROR_PLACEHOLDERS.noTranslation,
  };
}

// Colunas de CONTEÚDO nativo -- nunca inclui identidade (teacher_id/
// student_id/owner_id/language_app_key/status), que cada chamador decide
// por fora (a professora pode escolher vários alunos com idiomas
// diferentes; a aluna sempre usa APP_KEY -- não é responsabilidade deste
// módulo, que só sabe de Note/Field). Chamado só DEPOIS de
// validateNoteEditorStateForSave() já ter confirmado `ok:true` -- este
// transform nunca valida nada sozinho.
function nativeContentColumnsFromEditorState(editorState){
  const row = noteEditorStateToRow(editorState);
  const mirror = deriveLegacyMirrorFromNoteEditorState(editorState);
  return {
    fields: row.fields,
    card_generation_mode: row.card_generation_mode,
    note: row.note,
    // Tags (Fase 7j fechamento, ver CLAUDE.md) -- propriedade nativa da
    // Note (migration 048), já normalizada por createNativeNoteEditorState()
    // -- este transform só repassa, nunca renormaliza/reimplementa.
    tags: row.tags,
    front: mirror.front,
    back_trans: mirror.back_trans,
    // Colunas legadas explicitamente NUNCA usadas pelo caminho nativo --
    // gravadas como null pra nunca ficarem com lixo de uma edição legada
    // anterior (ex: converter um cartão que já foi múltipla escolha
    // legada pro editor novo não pode deixar `choices` velho por trás --
    // um fantasma que interpretNoteFromRow() ignora, mas que confundiria
    // quem olhasse a linha crua/exportasse os dados).
    front_pinyin: null,
    choices: null,
    cloze_sentence: null,
    cloze_answer: null,
    cloze_answer_pinyin: null,
    front_is_target_language: true,
    // image_url/audio_url NÃO tocados aqui (chave ausente) -- Seção 15:
    // mídia nativa vive só em field.audio/field.image, e o caminho
    // nativo do motor (interpretNativeNoteFromRow) nunca lê image_url/
    // audio_url da linha (note.image é sempre null no ramo nativo,
    // confirmado por leitura antes de escrever este arquivo) -- gravar/
    // zerar essas 2 colunas não teria nenhum efeito funcional pro
    // cartão nativo, então este objeto nem as menciona (o chamador só
    // sobrescreve uma coluna quando ela está explicitamente presente no
    // patch, mesmo padrão defensivo já usado por updateFlashcardContent/
    // updateOwnFlashcardContent pra imageUrl/audioUrl === undefined).
  };
}

// ---------- Fase 7e (upload de áudio por Field, ver CLAUDE.md, Seção 14) ----------
//
// Compensação BEST-EFFORT de atomicidade Storage<->DB: um upload de
// áudio bem-sucedido NESTA sessão de edição (`editorState.
// __freshMediaUploads`, populado por wireFieldAudioBlockFor -- shared/
// flashcard-field-editor.js -- a cada upload concluído) nunca é
// referenciado por nenhuma linha real enquanto a Note ainda não foi
// salva. Se o INSERT/UPDATE que salvaria essa Note falhar logo em
// seguida, o objeto no Storage vira um órfão garantido -- seguro
// removê-lo (nenhuma outra linha pode estar apontando pra ele ainda,
// diferente de "substituir"/"remover" um áudio JÁ SALVO, que nunca é
// deletado fisicamente -- ver justificativa completa em
// wireFieldAudioBlockFor). Best-effort/nunca lança -- uma falha ao
// tentar limpar o órfão não pode mascarar o erro de save já em
// andamento, que é o que a tela de fato mostra pra professora/aluna.
async function compensateFreshMediaUploads(editorState){
  const uploads = (editorState && editorState.__freshMediaUploads) || [];
  if (editorState) editorState.__freshMediaUploads = [];
  await Promise.all(uploads.map(u => {
    if (!u || typeof u.deleteFn !== 'function' || !u.path) return Promise.resolve();
    return Promise.resolve(u.deleteFn(u.path)).catch(() => {});
  }));
}

// Depois de um SAVE bem-sucedido, os uploads desta sessão passam a estar
// legitimamente referenciados pela linha persistida -- nunca devem ser
// deletados, mesmo que uma edição FUTURA (de outra sessão, outro cartão)
// falhe depois. Só limpa a lista, sem tocar o Storage.
function clearFreshMediaUploads(editorState){
  if (editorState) editorState.__freshMediaUploads = [];
}

// ---------- Legacy -> Native (conversão explícita, nunca automática) ----------
//
// Seção 7/21 (ver CLAUDE.md) -- quando a professora/aluna pede
// EXPLICITAMENTE pra editar um cartão LEGADO com o editor novo, o
// conteúdo já existente é preservado -- nunca uma tela em branco forçando
// redigitar tudo. Mesma leitura de shape que interpretNoteFromRow() já
// faz no ramo legado (shared/flashcard-model.js) pra decidir qual Card
// Type um cartão legado representa -- só que aqui constrói um EDITOR
// STATE (pra revisão/edição antes de salvar), nunca grava nada sozinho:
// é chamada só quando o usuário clica em "Usar o novo editor de campos",
// e o resultado só vira linha real no banco se ele confirmar clicando
// Salvar no formulário nativo que aparece em seguida.
// Fase 6D.8 (Seção 4/9/10) -- anexa audio_url/image_url legados ao Field
// certo, na MESMA heurística que interpretNoteFromRow() (motor, ramo
// legado) já usa pra interpretar esse dado histórico: o campo cujo `lang`
// é o idioma ESTUDADO (isStudyLanguageField). Nunca inventa um lado --
// se `targetField` não existir (nunca deveria acontecer, os 2 branches
// abaixo sempre montam um Field de idioma estudado antes de chamar isto),
// simplesmente não anexa nada, sem lançar erro.
//
// Ressalva IMPORTANTE sobre imagem (documentada aqui, não escondida): o
// pipeline de LEITURA nativo (resolveCardField()/buildEngineCardsFromRow(),
// shared/flashcard-model.js) só resolve imagem no nível da NOTE
// (note.image), nunca a partir de field.image -- gap arquitetural já
// identificado na auditoria da Fase 6D ("Fase 6D -- EDITOR: auditoria",
// seção 6) e explicitamente fora do escopo desta fase (Seção 26 proíbe
// estender resolveCardField()/renderers aqui). Por isso: field.image É
// preenchido (a URL nunca é descartada -- fica visível no indicador
// textual do Field editor, Fase 6D.3, e pronta pra quando um projeto
// futuro estender o pipeline de leitura), mas a imagem NÃO vai aparecer
// de fato na tela de Revisão depois da conversão até essa extensão
// existir -- limitação conhecida, não um bug desta fase, sinalizada de
// volta pro usuário no próprio fluxo de conversão (ver Seção 27/relatório).
function attachLegacyMediaToFields(fields, row, languageAppKey){
  const targetField = fields.find(f => isStudyLanguageField(f, languageAppKey));
  if (!targetField) return;
  // Fase 7b (ver CLAUDE.md) -- discriminador canônico de Field.audio é
  // `type`, não `source` (ver shared/flashcard-model.js) -- nada em
  // produção jamais leu `.source`, então esta troca não tem efeito
  // funcional sobre dado já persistido (resolveFieldAudioUrl() só olha
  // `.url`), só alinha toda escrita nova ao contrato único.
  if (row.audio_url) targetField.audio = { url: row.audio_url, type: 'upload' };
  if (row.image_url) targetField.image = { url: row.image_url };
}

function nativeNoteEditorStateFromLegacyRow(row){
  const isCloze = !!row.cloze_sentence;
  const isMC = !isCloze && !!(row.choices && row.choices.length);
  const isZh = LanguageRegistry.isCjk(row.language_app_key);
  const studyLang = STUDY_LANG_FOR_APP_KEY[row.language_app_key] || null;
  const base = {
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key,
    origin: row.origin || null,
    privateNote: row.note || null,
    // Fase I (Tags): tags que a linha Legacy já tinha (ex.: vindas do Anki)
    // acompanham a conversão -- nunca somem só porque a tela antiga não as conhecia.
    tags: row.tags,
  };

  if (isMC){
    // Seção 6 -- legado nunca é ambíguo sobre quem é a resposta certa
    // (sempre back_trans, nunca choices[]) -- mapeamento 1:1 direto, sem
    // adivinhação. front_is_target_language decide só o IDIOMA de cada
    // Field (nunca a posição/papel -- prompt continua sempre o Field do
    // "front" legado, answer sempre o de "back_trans"), mesma leitura já
    // usada pelo branch normal abaixo e pelo motor legado
    // (shared/flashcard-model.js:497-511) -- nunca vira um mecanismo de
    // direção nativo (Seção 4/5): depois de convertido, os 2 Fields só
    // têm `lang`, nunca um flag de direção salvo.
    const frontIsTarget = row.front_is_target_language !== false;
    const promptLang = isZh ? 'zh' : (frontIsTarget ? studyLang : 'pt-BR');
    const answerLang = isZh ? 'pt-BR' : (frontIsTarget ? 'pt-BR' : studyLang);
    const promptField = createFieldState({ role: 'prompt', lang: promptLang, content: { value: row.front || '' } });
    const answerField = createFieldState({ role: 'answer', lang: answerLang, content: { value: row.back_trans || '' } });
    const distractorFields = (row.choices || []).slice(0, 3).map(c => createFieldState({ role: 'distractor', content: { value: c || '' } }));
    const fields = [promptField, answerField].concat(distractorFields);
    // Seção 6 -- ZH também preserva pinyin do prompt (front_pinyin já era
    // um campo genérico, mostrado pro modo MC no formulário legado --
    // conferido em shared/admin-flashcards.js antes de escrever isto,
    // nunca presumido). Field satélite, nunca conta como 4ª opção.
    if (isZh && row.front_pinyin){
      const pinyinField = createFieldState({ lang: 'zh-pinyin', content: { value: row.front_pinyin } });
      promptField.pinyinFieldId = pinyinField.id;
      fields.splice(1, 0, pinyinField);
    }
    attachLegacyMediaToFields(fields, row, row.language_app_key);
    return createNativeNoteEditorState(Object.assign({}, base, {
      cardGenerationMode: 'multiple_choice',
      fields,
    }));
  }

  if (isCloze){
    // legacyFlashcardConversionPreflight() já garantiu, ANTES desta função
    // ser chamada, que cloze_sentence tem EXATAMENTE 1 "___" -- o
    // `.replace()` abaixo nunca mais é um no-op silencioso (Seção 6/18).
    const pinyinSuffix = (isZh && row.cloze_answer_pinyin) ? `|${row.cloze_answer_pinyin}` : '';
    const markedSentence = row.cloze_sentence.replace('___', `{{c1::${row.cloze_answer || ''}${pinyinSuffix}}}`);
    const textField = createFieldState({ lang: isZh ? 'zh' : studyLang, content: { value: markedSentence } });
    const translationField = createFieldState({ lang: 'pt-BR', content: { value: row.back_trans || '' } });
    const fields = [textField, translationField];
    attachLegacyMediaToFields(fields, row, row.language_app_key);
    return createNativeNoteEditorState(Object.assign({}, base, {
      cardGenerationMode: 'cloze',
      fields,
    }));
  }

  // normal -- caso mais comum. Preserva o par hanzi/pinyin como 2 Fields
  // relacionados (frontField.pinyinFieldId -> pinyinField.id) quando o
  // cartão legado é de mandarim e tem front_pinyin -- mesmo shape que
  // contentFieldIndices() já sabe pular (o Field de pinyin nunca conta
  // como um 3º slot de conteúdo). fr/pt: front_is_target_language decide
  // qual dos 2 Fields é o idioma estudado -- interpretado só AQUI, na
  // conversão (Seção 4/5), nunca persistido como mecanismo nativo: depois
  // de convertido, a direção do cartão vem só de `lang`/posição de cada
  // Field, igual a qualquer outro cartão nativo criado do zero pelo
  // editor -- mesma leitura exata do motor legado
  // (shared/flashcard-model.js:497-511), nunca reinventada aqui.
  let frontField, backField;
  if (isZh){
    frontField = createFieldState({ lang: 'zh', content: { value: row.front || '' } });
    backField = createFieldState({ lang: 'pt-BR', content: { value: row.back_trans || '' } });
  } else {
    const frontIsTarget = row.front_is_target_language !== false;
    frontField = createFieldState({ lang: frontIsTarget ? studyLang : 'pt-BR', content: { value: row.front || '' } });
    backField = createFieldState({ lang: frontIsTarget ? 'pt-BR' : studyLang, content: { value: row.back_trans || '' } });
  }
  let pinyinField = null;
  if (isZh && row.front_pinyin){
    pinyinField = createFieldState({ lang: 'zh-pinyin', content: { value: row.front_pinyin } });
    frontField.pinyinFieldId = pinyinField.id;
  }
  const fields = pinyinField ? [frontField, pinyinField, backField] : [frontField, backField];
  attachLegacyMediaToFields(fields, row, row.language_app_key);
  return createNativeNoteEditorState(Object.assign({}, base, {
    cardGenerationMode: 'normal',
    fields,
  }));
}

// ---------- CONSOLIDAÇÃO-6 (ver CLAUDE.md) -- import de cartão externo
// vira criação NATIVA, nunca Legacy ----------
//
// 2 telas criam cartões NOVOS a partir de um payload externo, historicamente
// no formato antigo (front/backTrans/note/frontPinyin/frontIsTargetLanguage
// -- nunca choices/clozeSentence/mídia, nenhum dos 2 formatos jamais
// carregou isso): o export/import .json/link entre alunas
// (shared/my-flashcards.js, confirmAndImportMyFlashcards) e a importação de
// cartão do perfil público de outra conta (shared/public-profile.js,
// importSelectedPublicFlashcards). Antes desta fase, os 2 chamavam
// createOwnFlashcard() SEM `nativeState` -- iam direto pro branch Legacy de
// INSERT, criando uma linha sem fields/card_generation_mode, fora do
// princípio "todo cartão novo é Native" que o resto do app já segue desde
// CONSOLIDAÇÃO-1.
//
// Reaproveita 100% nativeNoteEditorStateFromLegacyRow() (a MESMA função que
// já converte um cartão Legacy JÁ EXISTENTE quando a professora/aluna clica
// "Usar o novo editor") -- nunca uma 2ª implementação do mapeamento
// front/back->Field. `id:null`/`revision:0` deixam explícito que isto é uma
// CRIAÇÃO nova (nunca aponta pra uma linha existente); `origin:'self'`
// sempre -- os 2 chamadores só criam na PRÓPRIA conta de quem importa
// (own_flashcards), nunca em teacher_flashcards. Como o payload nunca tem
// choices/cloze_sentence, o resultado é sempre um Note `cardGenerationMode:
// 'normal'` de 2 Fields (+ satélite de pinyin quando aplicável) -- mesmo
// resultado visual de sempre (frente/verso simples), só que gravado no
// modelo nativo.
// Fase I (Tags): a origem (arquivo/link/perfil público) é externa -> respeita
// os limites (20/50) aqui e registra em `__droppedTags` o que ficou de fora,
// pra quem importa AVISAR (nunca perda silenciosa). `__droppedTags` não é
// persistido (noteEditorStateToRow ignora chaves desconhecidas).
function summarizeDroppedImportTags(states, opts){
  let all = (states || []).reduce((acc, s) => acc.concat((s && s.__droppedTags) || []), []);
  // Cópia pelo perfil público: a atribuição vem do servidor, então tag de sistema no payload não é "perda".
  if (opts && opts.ignoreSystem) all = all.filter(d => d.reason !== 'system_tag');
  const sys = all.filter(d => d.reason === 'system_tag').length;
  const lim = all.length - sys;
  const parts = [];
  if (lim) parts.push(nativePersistenceText('import.tagsDropped.limit', { one: '{n} tag foi ignorada por passar do limite ({max} tags por cartão, {len} caracteres por tag).', other: '{n} tags foram ignoradas por passar do limite ({max} tags por cartão, {len} caracteres por tag).' }, { n: lim, max: TAG_MAX_PER_NOTE, len: TAG_MAX_LENGTH }));
  if (sys) parts.push(nativePersistenceText('import.tagsDropped.system', { one: '{n} tag de sistema (atribuição de autoria) não é importada por arquivo/link: só uma cópia feita pelo app a cria.', other: '{n} tags de sistema (atribuição de autoria) não são importadas por arquivo/link: só uma cópia feita pelo app a cria.' }, { n: sys }));
  return parts.join(' ');
}

function nativeNoteEditorStateFromImportPayload(payload, languageAppKey){
  const part = partitionNoteTagsByLimits(payload.tags);
  const state = nativeNoteEditorStateFromLegacyRow({
    id: null,
    revision: 0,
    language_app_key: languageAppKey,
    origin: 'self',
    note: payload.note || null,
    front: payload.front || '',
    back_trans: payload.backTrans || '',
    front_pinyin: payload.frontPinyin || null,
    front_is_target_language: payload.frontIsTargetLanguage,
    // Fase I (Tags): a cópia carrega as tags da Note (valores, sem vínculo vivo com o original).
    tags: part.tags,
    choices: null,
    cloze_sentence: null,
    cloze_answer: null,
    cloze_answer_pinyin: null,
    image_url: null,
    audio_url: null,
  });
  if (part.dropped.length) state.__droppedTags = part.dropped;
  return state;
}

// ===== shared/flashcard-cloze-editor.js =====
// ---------- Editor nativo de Cloze ("Completar a frase") -- Fase 6D.5 da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI ESPECÍFICA de Cloze, construída EM CIMA do Field editor
// genérico da Fase 6D.3 (shared/flashcard-field-editor.js, reutilizado só
// pro Field de TRADUÇÃO -- o Field de FRASE tem seu próprio editor visual,
// já que precisa de seleção real de texto e marcação inline).
//
// Modelo nativo (restrição 1 da instrução): Cloze usa EXATAMENTE 1 Field
// de conteúdo textual (a frase com as marcas) -- nunca `cloze_sentence`/
// `cloze_answer`/`clozeAnswers[]`/`clozeSelections[]` como estrutura
// paralela. A representação canônica CONTINUA sendo a sintaxe já existente
// do motor (`{{cN::resposta}}`/`{{cN::resposta|compareAnswer}}`,
// CLOZE_MARK_RE/parseClozeMarks/splitClozeMarkRaw/renderClozeText, shared/
// flashcard-model.js, 100% reutilizados aqui, nunca duplicados) -- só que
// `Field.content.value` (a única fonte de verdade persistível) É essa
// string canônica o tempo todo. O que este arquivo adiciona é uma camada
// de UI que nunca expõe essa sintaxe ao usuário: uma representação
// intermediária em memória ("segmentos", ver abaixo) que serve só pra
// desenhar/editar visualmente, sempre round-tripada de volta pra a MESMA
// string canônica.
//
// ACHADO IMPORTANTE, verificado ANTES de codar (não presumido): o motor
// (validateNativeNoteRow, ramo `else` que cobre normal/normal_reversed/
// type_answer/cloze) já exige >=2 "slots" de conteúdo (contentFieldIndices)
// pra QUALQUER um desses 4 modos, cloze incluído -- não só 1. Isso
// significa que Cloze nativo precisa de um 2º Field (a TRADUÇÃO, mostrada
// à aluna depois de responder, resolveClozeCardView() -> translationFieldIndex)
// além do Field de frase -- exatamente o par posicional que
// interpretNativeNoteFromRow() já espera (slots[0]=texto com marcas,
// slots[1]=tradução), o MESMO mecanismo que `normal` já usa pro par
// frente/verso. "Exatamente 1 Field de conteúdo textual" (a frase com as
// lacunas) continua verdadeiro -- só existe TAMBÉM um 2º Field de
// conteúdo (tradução) que a UI trata com o Field editor genérico, sem
// nenhuma marcação especial. Nenhuma mudança foi feita no motor por causa
// disso (restrição 19) -- confirmado por `git status`/`git diff` no fim
// da entrega.
//
// Depende de (mesma posição de shared/flashcard-mc-editor.js/flashcard-
// typeanswer-editor.js -- antes de shared/admin-flashcards.js/
// shared/my-flashcards.js):
//   - shared/flashcard-model.js       (CLOZE_MARK_RE, splitClozeMarkRaw,
//                                        parseClozeMarks, contentFieldIndices,
//                                        validateNativeNoteRow, CARD_GENERATION_MODES
//                                        -- todos REUTILIZADOS, nunca duplicados)
//   - shared/flashcard-editor-state.js (noteEditorStateToRow, createNativeNoteEditorState)
//   - shared/flashcard-field-editor.js (renderFieldEditorHTML, wireFieldEditorList,
//                                        addFieldToEditorState, removeFieldFromEditorState,
//                                        updateFieldInEditorState, refreshNativeFieldsBox)
//   - shared/flashcard-mc-editor.js    (refreshNativeCardTypeBox -- dispatcher
//                                        estendido aqui embaixo com o branch cloze)
//   - shared/flashcard-typeanswer-editor.js (idem, branch type_answer preservado)
//   - escapeHTML (fr/zh app.js)

const CLOZE_EDITOR_MARK_ATTR = 'data-cloze-mark-id';
const CLOZE_EDITOR_COMPARE_ATTR = 'data-cloze-compare';

// Estado efêmero de UI -- "qual lacuna está sendo editada agora" (clique
// numa marca já existente abre um painel inline logo abaixo da frase,
// restrição 6: "permitir editar o texto dentro de uma lacuna", "remover
// uma lacuna"). NUNCA parte de editorState.fields/Field.content -- é
// puramente visual, do mesmo espírito do `localState` efêmero da Fase 6C
// (nunca STATE.review*, nunca CardInstance como armazenamento, restrição
// 14) -- só que aqui, sem uma "sessão" dona como o Review tem, o dono
// natural é o próprio módulo de edição (mesmo módulo que desenha e
// religa a caixa). Reseta sozinho sempre que o markId ativo deixa de
// existir nos segmentos atuais (ex: a lacuna foi removida por outro
// caminho -- Backspace no contenteditable, ver renderClozeEditorHTML).
let CLOZE_EDITOR_ACTIVE_MARK_ID = null;

// ============================================================
// Segmentos -- ponte PURA (sem DOM) entre a string canônica do motor
// ({{cN::resposta}}/{{cN::resposta|compareAnswer}}) e uma representação
// estruturada fácil de desenhar/editar. Nunca uma 2ª fonte de verdade --
// `Field.content.value` (string canônica) é sempre o dado persistido;
// segmentos só existem em memória, enquanto a UI está aberta, e são
// sempre re-derivados/re-serializados a partir dela.
//   segments = [{kind:'text', text} | {kind:'mark', markId, answer, compareAnswer}]
// ============================================================

function parseClozeSegments(text){
  const raw = text || '';
  const segments = [];
  CLOZE_MARK_RE.lastIndex = 0;
  let lastIndex = 0;
  let m;
  while ((m = CLOZE_MARK_RE.exec(raw))){
    if (m.index > lastIndex) segments.push({ kind: 'text', text: raw.slice(lastIndex, m.index) });
    const { answer, compareAnswer } = splitClozeMarkRaw(m[2]);
    segments.push({ kind: 'mark', markId: m[1], answer, compareAnswer });
    lastIndex = CLOZE_MARK_RE.lastIndex;
  }
  if (lastIndex < raw.length) segments.push({ kind: 'text', text: raw.slice(lastIndex) });
  return segments;
}

function serializeClozeSegments(segments){
  return (segments || []).map(seg => {
    if (seg.kind === 'text') return seg.text;
    const raw = (seg.compareAnswer != null && seg.compareAnswer !== '')
      ? `${seg.answer}|${seg.compareAnswer}`
      : seg.answer;
    return `{{${seg.markId}::${raw}}}`;
  }).join('');
}

// Merge de segmentos 'text' consecutivos -- mantém a lista tidy depois de
// qualquer mutação estrutural (nunca afeta o round-trip pra string
// canônica, só evita segmentos vazios/fragmentados acumulando).
function coalesceClozeSegments(segments){
  const out = [];
  (segments || []).forEach(seg => {
    if (seg.kind === 'text' && seg.text === '') return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === 'text' && seg.kind === 'text'){
      prev.text += seg.text;
    } else {
      out.push(Object.assign({}, seg));
    }
  });
  return out;
}

// Próximo número de lacuna -- SEMPRE max(existente)+1, NUNCA reaproveita
// um "buraco" deixado por uma marca removida (restrição 5: "não gerar IDs
// aleatórios... não depender da posição visual como identidade"). Decisão
// documentada explicitamente porque a instrução deixou em aberto qual das
// duas leituras de "próximo número disponível" usar -- max+1 evita que 2
// marcas diferentes, criadas em momentos diferentes da edição, alguma vez
// colidam no mesmo id só porque uma anterior foi removida no meio.
function nextClozeMarkId(segments){
  let max = 0;
  (segments || []).forEach(seg => {
    if (seg.kind !== 'mark') return;
    const n = parseInt(String(seg.markId).slice(1), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return `c${max + 1}`;
}

// Detecta chaves duplas soltas (sintaxe malformada/parcialmente aberta)
// que sobraram como texto puro -- toda marca BEM formada já foi extraída
// pelo parseClozeSegments acima (reaproveita a MESMA regex do motor,
// nunca uma cópia); se ainda sobra um "{{"/"}}" solto num segmento de
// texto, é sinal de sintaxe que o parser não fechou (restrição 13:
// "sintaxe inválida é rejeitada", "nenhuma sintaxe parcialmente aberta").
function hasMalformedClozeSyntax(text){
  const segments = parseClozeSegments(text);
  return segments.some(seg => seg.kind === 'text' && /\{\{|\}\}/.test(seg.text));
}

// ---------- Mutações puras sobre segmentos (testáveis sem DOM) ----------

// Cria uma lacuna nova a partir de um intervalo de OFFSETS LÓGICOS --
// posição no texto "visível" (soma de seg.text.length pra segmentos de
// texto + seg.answer.length pra marcas já existentes -- nunca offsets na
// string canônica, que tem comprimento diferente por causa da sintaxe
// {{cN::...}}). Isso é o que a camada de DOM (domRangeToLogicalOffsets,
// mais abaixo) converte a partir de uma Selection/Range real do
// navegador -- aqui a lógica é 100% pura, testável em Node sem DOM.
//
// Regras determinísticas (restrição 8, "prefira regras conservadoras"):
//   - startOffset === endOffset (seleção vazia)              -> bloqueia
//   - texto selecionado só espaço em branco                  -> bloqueia
//   - intervalo intersecta QUALQUER marca já existente, seja  -> bloqueia
//     parcialmente sobreposto, contendo a marca inteira, ou
//     estando inteiramente dentro dela -- nenhum desses 3 casos
//     produz sintaxe válida sem inventar suporte a aninhamento
//     (explicitamente fora do MVP, restrição 8).
function insertClozeMarkAtLogicalOffsets(segments, startOffset, endOffset, compareAnswer){
  const s = Math.min(startOffset, endOffset);
  const e = Math.max(startOffset, endOffset);
  if (s === e) return { ok: false, reason: 'empty' };

  let pos = 0;
  let selectedText = '';
  for (const seg of segments){
    const len = seg.kind === 'text' ? seg.text.length : seg.answer.length;
    const segStart = pos, segEnd = pos + len;
    const intersects = s < segEnd && e > segStart;
    if (seg.kind === 'mark' && intersects) return { ok: false, reason: 'overlaps-mark' };
    if (seg.kind === 'text' && intersects){
      const cutStart = Math.max(0, s - segStart);
      const cutEnd = Math.min(len, e - segStart);
      selectedText += seg.text.slice(cutStart, cutEnd);
    }
    pos = segEnd;
  }
  if (e > pos) return { ok: false, reason: 'out-of-range' };
  if (!selectedText.trim()) return { ok: false, reason: 'whitespace' };

  const markId = nextClozeMarkId(segments);
  const out = [];
  pos = 0;
  for (const seg of segments){
    const len = seg.kind === 'text' ? seg.text.length : seg.answer.length;
    const segStart = pos, segEnd = pos + len;
    if (seg.kind === 'mark' || segEnd <= s || segStart >= e){
      out.push(seg);
    } else {
      // seg.kind === 'text' e intersecta [s,e) -- corta em até 3 pedaços:
      // antes (texto), a nova marca (só a 1ª vez que cruzamos s..e), depois (texto).
      const before = seg.text.slice(0, Math.max(0, s - segStart));
      const after = seg.text.slice(Math.min(len, e - segStart));
      if (before) out.push({ kind: 'text', text: before });
      out.push({ kind: 'mark', markId, answer: selectedText, compareAnswer: compareAnswer || null });
      if (after) out.push({ kind: 'text', text: after });
      // pula qualquer outro segmento de texto ainda dentro de [s,e) sem
      // duplicar a marca -- na prática só ocorre quando [s,e) cruza mais
      // de 1 segmento de texto consecutivo (não deveria, já que segmentos
      // de texto adjacentes são coalescidos, mas o laço abaixo garante
      // robustez mesmo assim).
      s === e; // no-op, mantém es-lint feliz sobre variáveis não usadas
    }
    pos = segEnd;
  }
  return { ok: true, segments: coalesceClozeSegments(out), markId };
}

// Edita o TEXTO de uma marca já existente, preservando id/compareAnswer.
function updateClozeMarkText(segments, markId, newAnswerText){
  const trimmed = (newAnswerText || '').trim();
  if (!trimmed) return { ok: false, reason: 'empty-answer' };
  let found = false;
  const out = (segments || []).map(seg => {
    if (seg.kind === 'mark' && seg.markId === markId){
      found = true;
      return Object.assign({}, seg, { answer: newAnswerText });
    }
    return seg;
  });
  if (!found) return { ok: false, reason: 'not-found' };
  return { ok: true, segments: out };
}

// Define/limpa o compareAnswer (pinyin no zh) de uma marca já existente --
// NUNCA um Field/pinyinFieldId separado (restrição 9: "o pinyin específico
// de uma cloze pertence à própria marcação... não confundir com
// pinyinFieldId, que continua sendo o mecanismo pra Fields satélite em
// outros Card Types").
function updateClozeMarkCompareAnswer(segments, markId, compareAnswer){
  let found = false;
  const clean = (compareAnswer || '').trim() || null;
  const out = (segments || []).map(seg => {
    if (seg.kind === 'mark' && seg.markId === markId){
      found = true;
      return Object.assign({}, seg, { compareAnswer: clean });
    }
    return seg;
  });
  if (!found) return { ok: false, reason: 'not-found' };
  return { ok: true, segments: out };
}

// Remove uma marca, revertendo o trecho pra texto puro (restrição 6:
// "remover uma lacuna" sem corromper as outras -- ids das marcas restantes
// nunca são renumerados por esta operação, mesmo princípio de
// nextClozeMarkId nunca reaproveitar buraco).
function removeClozeMark(segments, markId){
  let found = false;
  const out = (segments || []).map(seg => {
    if (seg.kind === 'mark' && seg.markId === markId){
      found = true;
      return { kind: 'text', text: seg.answer };
    }
    return seg;
  });
  if (!found) return { ok: false, reason: 'not-found' };
  return { ok: true, segments: coalesceClozeSegments(out) };
}

// Usado só ao SAIR do modo cloze pra outro Card Type (restrição 12: "não
// escreva sintaxe cloze em um Card Type que não a suporta") -- reverte
// TODAS as marcas pro próprio texto (answer), igual a "revelar tudo",
// nunca inventa um valor novo. Reaproveita parseClozeSegments/
// serializeClozeSegments -- nunca uma 3ª forma de andar pela sintaxe.
function stripClozeMarkupToPlainText(text){
  const stripped = parseClozeSegments(text).map(seg => seg.kind === 'mark' ? { kind: 'text', text: seg.answer } : seg);
  return serializeClozeSegments(coalesceClozeSegments(stripped));
}

// ============================================================
// DOM <-> segmentos -- únicas funções de conversão explícita (restrição
// 7 da instrução: "crie uma função explícita de conversão... não
// depender de HTML bruto como fonte de verdade").
// ============================================================

// Segmentos -> HTML. Marcas viram <span> ATÔMICO
// (contenteditable="false") dentro do container contenteditable="true" --
// padrão padrão de editores rich-text pra "tokens inline" (Notion/Gmail
// chips): o navegador trata o span como uma unidade indivisível pra
// seleção/cursor, nunca deixando o usuário digitar sintaxe bruta dentro
// dele. O texto visível da marca é sempre seg.answer -- NUNCA
// {{cN::...}} (restrição 4: "o usuário não deve ver {{c1::...}} como
// texto bruto").
function renderClozeSegmentsHTML(segments){
  return (segments || []).map(seg => {
    if (seg.kind === 'text') return escapeHTML(seg.text);
    const compareAttr = seg.compareAnswer ? ` ${CLOZE_EDITOR_COMPARE_ATTR}="${escapeHTML(seg.compareAnswer)}"` : '';
    return `<span class="cloze-editor-mark" contenteditable="false" ${CLOZE_EDITOR_MARK_ATTR}="${escapeHTML(seg.markId)}"${compareAttr}>${escapeHTML(seg.answer)}</span>`;
  }).join('');
}

// DOM -> segmentos. Percorre os childNodes REAIS do container (nunca
// assume offset simples de string) -- Text node vira segmento de texto,
// <span data-cloze-mark-id> vira segmento de marca (lendo o ATRIBUTO
// data-cloze-compare, nunca o textContent, pro compareAnswer -- que nunca
// aparece visualmente inline). Qualquer outro elemento que o navegador
// injete (ex: <br> ao apertar Enter) tem seu texto visível preservado
// como texto puro -- nunca perde conteúdo silenciosamente.
function domToClozeSegments(containerEl){
  const segments = [];
  containerEl.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE){
      if (node.nodeValue) segments.push({ kind: 'text', text: node.nodeValue });
    } else if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute && node.hasAttribute(CLOZE_EDITOR_MARK_ATTR)){
      segments.push({
        kind: 'mark',
        markId: node.getAttribute(CLOZE_EDITOR_MARK_ATTR),
        answer: node.textContent || '',
        compareAnswer: node.getAttribute(CLOZE_EDITOR_COMPARE_ATTR) || null,
      });
    } else {
      const text = node.textContent || '';
      if (text) segments.push({ kind: 'text', text });
    }
  });
  return coalesceClozeSegments(segments);
}

// Range/Selection real do navegador -> offsets LÓGICOS (mesma unidade de
// insertClozeMarkAtLogicalOffsets acima -- texto visível, marcas contam
// como answer.length). Nunca assume que startContainer/endOffset é um
// offset simples numa string plana -- percorre os childNodes do
// container somando o comprimento visível de cada um até achar o nó/
// offset alvo (restrição 7, "não assumir que a seleção será sempre um
// simples offset em uma string").
function domRangeToLogicalOffsets(containerEl, range){
  function logicalLength(n){
    if (n.nodeType === Node.TEXT_NODE) return n.nodeValue.length;
    return (n.textContent || '').length;
  }
  function offsetOf(targetNode, targetOffset){
    let total = 0;
    let found = false;
    function walk(n){
      if (found) return;
      if (n === targetNode){
        if (n.nodeType === Node.TEXT_NODE){
          total += targetOffset;
        } else {
          for (let i = 0; i < targetOffset && i < n.childNodes.length; i++) total += logicalLength(n.childNodes[i]);
        }
        found = true;
        return;
      }
      if (n.nodeType === Node.TEXT_NODE){
        total += n.nodeValue.length;
        return;
      }
      if (n.nodeType === Node.ELEMENT_NODE && n.hasAttribute && n.hasAttribute(CLOZE_EDITOR_MARK_ATTR)){
        // nó atômico -- se o alvo apontar pra DENTRO dele (não deveria
        // acontecer com contenteditable=false, mas nunca lançamos
        // exceção se acontecer), contamos o nó inteiro e seguimos.
        total += (n.textContent || '').length;
        return;
      }
      n.childNodes.forEach(walk);
    }
    walk(containerEl);
    return total;
  }
  const start = offsetOf(range.startContainer, range.startOffset);
  const end = offsetOf(range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

// ============================================================
// Validação (reutilizável pela 6D.6) -- mesmo padrão de
// validateNativeMultipleChoiceStructure/validateNativeTypeAnswerStructure:
// reaproveita a validação estrutural do motor (noteEditorStateToRow +
// validateNativeNoteRow, que JÁ garante >=2 slots de conteúdo +
// pareamento + ids únicos pra cloze, ver achado no topo do arquivo) e
// adiciona só as checagens de tempo de edição que o motor não faz.
// ============================================================

function validateNativeClozeStructure(editorState){
  if (!editorState || editorState.kind !== 'native'){
    return { ok: false, error: t('clozeEditor.err.notNative') };
  }
  if (editorState.cardGenerationMode !== 'cloze'){
    return { ok: false, error: t('clozeEditor.err.notClozeMode') };
  }

  const row = noteEditorStateToRow(editorState);
  const structural = validateNativeNoteRow(row);
  if (!structural.ok) return structural;

  const fields = editorState.fields || [];
  const slots = contentFieldIndices(fields);
  const textField = fields[slots[0]];
  const translationField = fields[slots[1]];

  if (!textField || !((textField.content && textField.content.value) || '').trim()){
    return { ok: false, error: t('clozeEditor.err.emptySentence') };
  }
  if (!translationField || !((translationField.content && translationField.content.value) || '').trim()){
    return { ok: false, error: t('clozeEditor.err.emptyTranslation') };
  }

  const text = textField.content.value;
  if (hasMalformedClozeSyntax(text)){
    return { ok: false, error: t('clozeEditor.err.malformed') };
  }

  const segments = parseClozeSegments(text);
  const marks = segments.filter(seg => seg.kind === 'mark');
  if (marks.length === 0){
    return { ok: false, error: t('clozeEditor.err.noMarks') };
  }

  const ids = marks.map(m => m.markId);
  if (new Set(ids).size !== ids.length){
    return { ok: false, error: t('clozeEditor.err.duplicateIds') };
  }

  for (const mark of marks){
    if (!mark.answer || !mark.answer.trim()){
      return { ok: false, error: t('clozeEditor.err.emptyMark') };
    }
    if (LanguageRegistry.isCjk(editorState.languageAppKey) && (!mark.compareAnswer || !mark.compareAnswer.trim())){
      return { ok: false, error: t('clozeEditor.err.missingPinyin', { answer: mark.answer }) };
    }
  }

  return { ok: true };
}

// ============================================================
// Transição de/para Cloze
// ============================================================

// normal/multiple_choice/type_answer -> cloze: Cloze é posicional, igual
// a normal/type_answer (contentFieldIndices, slot 0 = frase, slot 1 =
// tradução) -- `role` continua irrelevante pra este Card Type (só
// multiple_choice usa role, Fase 6B). Reaproveita os Fields JÁ
// EXISTENTES, NA MESMA ORDEM em que já estavam -- nunca escolhe um Field
// arbitrariamente sem essa regra determinística documentada (restrição
// 11), nunca inventa conteúdo, nunca cria um Field novo aqui (isso só
// acontece via UI, pelos botões "+ Criar frase"/"+ Criar tradução",
// quando o usuário decide). Funcionalmente idêntica ao ramo genérico
// (`else { cardGenerationMode = newMode }`) que já tratava esse caso
// antes desta subfase -- definida como função própria só pra documentar
// a regra explicitamente, e deixar espaço pra uma regra mais rica no
// futuro sem precisar tocar de novo no ponto de integração.
function transitionToCloze(editorState){
  editorState.cardGenerationMode = 'cloze';
}

// cloze -> qualquer outro tipo: nunca deixa sintaxe {{cN::...}} presa num
// Field que um Card Type diferente vai ler/exibir como texto puro
// (restrição 12). Reverte toda marca pro próprio texto (answer) -- nunca
// inventa/descarta conteúdo, só "revela tudo" de forma determinística,
// reaproveitando o parser/serializer já existentes (nunca uma 3ª forma
// de andar pela sintaxe). Chamada pelo ponto de integração (admin-
// flashcards.js/my-flashcards.js) sempre que o modo ANTERIOR era 'cloze'
// e o modo NOVO não é.
function stripClozeMarksFromEditorState(editorState){
  const fields = editorState.fields || [];
  const slots = contentFieldIndices(fields);
  const textFieldIndex = slots[0];
  if (textFieldIndex === undefined) return;
  const textField = fields[textFieldIndex];
  if (!textField || !textField.content || !textField.content.value) return;
  const plain = stripClozeMarkupToPlainText(textField.content.value);
  updateFieldInEditorState(editorState, textField.id, { content: { value: plain } });
}

// ---------- Ações de criação de Field (restrição 11/2) ----------

function addClozeTextField(editorState){
  return addFieldToEditorState(editorState, {});
}
function addClozeTranslationField(editorState){
  return addFieldToEditorState(editorState, {});
}

// ============================================================
// Render
// ============================================================

function clozeMarkPanelHTML(mark, namePrefix, isMandarim){
  return `
    <div class="cloze-editor-mark-panel" data-cloze-mark-panel="${escapeHTML(mark.markId)}">
      <label class="profile-edit-label" for="${namePrefix}-cloze-edit-answer">${t('clozeEditor.panel.answerLabel')}</label>
      <input type="text" id="${namePrefix}-cloze-edit-answer" class="profile-edit-input" value="${escapeHTML(mark.answer)}" data-cloze-edit-answer>
      ${isMandarim ? `
      <label class="profile-edit-label" for="${namePrefix}-cloze-edit-compare">${t('clozeEditor.panel.compareLabel')}</label>
      <input type="text" id="${namePrefix}-cloze-edit-compare" class="profile-edit-input" value="${escapeHTML(mark.compareAnswer || '')}" data-cloze-edit-compare>
      ` : ''}
      <p class="profile-edit-field-error" data-cloze-edit-error></p>
      <div class="cloze-editor-mark-panel-actions">
        <button type="button" class="btn btn-primary" data-cloze-edit-save>${t('clozeEditor.panel.save')}</button>
        <button type="button" class="admin-select-link" data-cloze-edit-remove>${t('clozeEditor.panel.remove')}</button>
        <button type="button" class="admin-select-link" data-cloze-edit-cancel>${t('clozeEditor.panel.cancel')}</button>
      </div>
    </div>
  `;
}

function renderClozeEditorHTML(editorState, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'cloze-editor';
  const isMandarim = LanguageRegistry.isCjk(editorState.languageAppKey);
  const fields = editorState.fields || [];
  const slots = contentFieldIndices(fields);
  const textField = fields[slots[0]] || null;
  const translationField = fields[slots[1]] || null;
  const otherFields = slots.slice(2).map(i => fields[i]);

  // Uma marca ativa que não existe mais nos segmentos atuais (removida
  // por outro caminho, ex: Backspace no contenteditable) nunca deixa o
  // painel de edição preso apontando pro nada.
  const segments = textField ? parseClozeSegments((textField.content && textField.content.value) || '') : [];
  const activeMark = segments.find(seg => seg.kind === 'mark' && seg.markId === CLOZE_EDITOR_ACTIVE_MARK_ID) || null;
  if (!activeMark) CLOZE_EDITOR_ACTIVE_MARK_ID = null;

  // Fase 7e (ver CLAUDE.md) -- o Field de FRASE nunca passa por
  // renderFieldEditorHTML() (tem seu próprio editor visual, seleção de
  // texto pra marcar lacunas) -- então o bloco de áudio precisa ser
  // chamado direto aqui, pro áudio da frase inteira (ex: a professora
  // gravou a pronúncia da frase completa) continuar disponível mesmo no
  // modo Cloze. wireClozeEditor() liga este bloco explicitamente (ver
  // abaixo), nunca via wireFieldEditorList (que não conhece este Field).
  const textHTML = textField
    ? `
      <div class="cloze-editor-toolbar">
        <button type="button" class="admin-select-link" data-cloze-mark-btn>${t('clozeEditor.markBtn')}</button>
      </div>
      <div class="cloze-editor-text" contenteditable="true" data-cloze-field-id="${escapeHTML(textField.id)}">${renderClozeSegmentsHTML(segments)}</div>
      <p class="profile-edit-field-error" data-cloze-mark-error></p>
      ${activeMark ? clozeMarkPanelHTML(activeMark, namePrefix, isMandarim) : ''}
      ${renderFieldAudioBlockHTML(textField, opts)}
    `
    : `<p class="profile-edit-hint">${t('clozeEditor.noSentence')}</p><button type="button" class="admin-select-link" data-cloze-add-text>${t('clozeEditor.addSentence')}</button>`;

  const translationHTML = translationField
    ? renderFieldEditorHTML(translationField, 0, { namePrefix, label: t('clozeEditor.translationLabel'), removable: false })
    : `<p class="profile-edit-hint">${t('clozeEditor.noTranslation')}</p><button type="button" class="admin-select-link" data-cloze-add-translation>${t('clozeEditor.addTranslation')}</button>`;

  const otherFieldsHTML = otherFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">${t('clozeEditor.othersTitle')}</div>
    <p class="profile-edit-hint">${t('clozeEditor.othersHint')}</p>
    ${otherFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: t('clozeEditor.noRoleField', { n: i + 1 }), removable: true })).join('')}
  ` : '';

  const validation = validateNativeClozeStructure(editorState);
  const validationHTML = validation.ok
    ? `<p class="profile-edit-hint" style="margin-top:10px; color:var(--jade);">${t('clozeEditor.valid')}</p>`
    : `<p class="profile-edit-error" style="margin-top:10px;">${escapeHTML(validation.error)}</p>`;

  return `
    <div data-cloze-editor>
      <div class="section-label" style="margin:0 0 4px;">${t('clozeEditor.sentenceTitle')}</div>
      <p class="profile-edit-hint">${t('clozeEditor.sentenceHint')}</p>
      ${textHTML}
      <div class="section-label" style="margin:14px 0 4px;">${t('clozeEditor.translationTitle')}</div>
      ${translationHTML}
      ${otherFieldsHTML}
      ${validationHTML}
    </div>
  `;
}

// ============================================================
// Wiring
// ============================================================

// `opts` (Fase 7e -- ver CLAUDE.md) repassado pra wireFieldEditorList
// (Tradução/Outros campos) e chamado direto pra wireFieldAudioBlockFor
// (Field de frase, que não passa por wireFieldEditorList -- ver
// renderClozeEditorHTML acima).
function wireClozeEditor(container, editorState, onChange, opts){
  if (!container) return;

  // Reaproveita o wiring de conteúdo/idioma do Field editor genérico
  // (6D.3) pro campo de Tradução e pros "Outros campos" -- nunca
  // reimplementa (kind 'content'/'lang' nunca re-renderiza, mesma
  // disciplina anti-UX-fix-5 de todo o resto desta feature).
  wireFieldEditorList(container, editorState, (kind, fieldId) => {
    if (onChange) onChange(kind, fieldId);
  }, opts);

  // Fase 7e -- áudio do Field de FRASE, wireado direto (nunca via
  // wireFieldEditorList, que só conhece Fields renderizados por
  // renderFieldEditorHTML -- a frase tem seu próprio editor visual).
  // Identificado por EXCLUSÃO (nunca dentro de `[data-field-editor]`,
  // diferente do bloco de áudio da Tradução/"Outros campos" acima) --
  // robusto a qualquer reordenação futura do template, nunca "o
  // primeiro bloco da tela" por posição.
  const textFieldBlock = [...container.querySelectorAll('[data-field-audio-field]')].find(el => !el.closest('[data-field-editor]'));
  if (textFieldBlock){
    wireFieldAudioBlockFor(container, editorState, textFieldBlock.dataset.fieldAudioField, (kind, fieldId) => {
      if (onChange) onChange(kind, fieldId);
    }, opts);
  }

  const addTextBtn = container.querySelector('[data-cloze-add-text]');
  if (addTextBtn) addTextBtn.addEventListener('click', () => {
    addClozeTextField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addTranslationBtn = container.querySelector('[data-cloze-add-translation]');
  if (addTranslationBtn) addTranslationBtn.addEventListener('click', () => {
    addClozeTranslationField(editorState);
    if (onChange) onChange('structure', null);
  });

  const textEl = container.querySelector('.cloze-editor-text');
  if (textEl){
    const fieldId = textEl.getAttribute('data-cloze-field-id');

    // Digitar texto normal (fora de uma marca) nunca re-renderiza -- só
    // re-deriva os segmentos do DOM real (única fonte de verdade
    // enquanto o foco está aqui) e serializa de volta pra
    // Field.content.value. O navegador mantém o cursor sozinho porque
    // NUNCA reescrevemos o innerHTML em resposta a este evento (mesma
    // disciplina anti-UX-fix-5, agora aplicada a um contenteditable em
    // vez de <input>/<textarea>).
    textEl.addEventListener('input', () => {
      const segments = domToClozeSegments(textEl);
      updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(segments) } });
      if (onChange) onChange('content', fieldId);
    });

    // Clique numa marca já existente -- abre o painel de edição inline
    // (restrição 6). Clique fora de qualquer marca não faz nada aqui
    // (a seleção normal do navegador continua funcionando pro botão
    // "Marcar seleção como lacuna" abaixo).
    textEl.addEventListener('click', (e) => {
      const markEl = e.target.closest && e.target.closest(`[${CLOZE_EDITOR_MARK_ATTR}]`);
      if (!markEl) return;
      e.preventDefault();
      CLOZE_EDITOR_ACTIVE_MARK_ID = markEl.getAttribute(CLOZE_EDITOR_MARK_ATTR);
      if (onChange) onChange('structure', fieldId);
    });

    const markBtn = container.querySelector('[data-cloze-mark-btn]');
    if (markBtn) markBtn.addEventListener('click', () => {
      const errorEl = container.querySelector('[data-cloze-mark-error]');
      if (errorEl) errorEl.textContent = '';
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.rangeCount === 0){
        if (errorEl) errorEl.textContent = t('clozeEditor.sel.selectFirst');
        return;
      }
      const range = sel.getRangeAt(0);
      if (!textEl.contains(range.commonAncestorContainer)){
        if (errorEl) errorEl.textContent = t('clozeEditor.sel.outside');
        return;
      }
      const segments = domToClozeSegments(textEl);
      const { start, end } = domRangeToLogicalOffsets(textEl, range);
      const result = insertClozeMarkAtLogicalOffsets(segments, start, end, null);
      if (!result.ok){
        const messages = {
          empty: t('clozeEditor.sel.selectFirst'),
          whitespace: t('clozeEditor.sel.whitespace'),
          'overlaps-mark': t('clozeEditor.sel.overlaps'),
          'out-of-range': t('clozeEditor.sel.outOfRange'),
        };
        if (errorEl) errorEl.textContent = messages[result.reason] || t('clozeEditor.sel.failed');
        return;
      }
      updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(result.segments) } });
      CLOZE_EDITOR_ACTIVE_MARK_ID = result.markId;
      if (onChange) onChange('structure', fieldId);
    });

    const savePanelBtn = container.querySelector('[data-cloze-edit-save]');
    if (savePanelBtn) savePanelBtn.addEventListener('click', () => {
      const markId = CLOZE_EDITOR_ACTIVE_MARK_ID;
      const panelErrorEl = container.querySelector('[data-cloze-edit-error]');
      const answerInput = container.querySelector('[data-cloze-edit-answer]');
      const compareInput = container.querySelector('[data-cloze-edit-compare]');
      let segments = domToClozeSegments(textEl);
      const textResult = updateClozeMarkText(segments, markId, answerInput ? answerInput.value : '');
      if (!textResult.ok){
        if (panelErrorEl) panelErrorEl.textContent = t('clozeEditor.panel.emptyAnswer');
        return;
      }
      segments = textResult.segments;
      if (compareInput){
        const compareResult = updateClozeMarkCompareAnswer(segments, markId, compareInput.value);
        if (compareResult.ok) segments = compareResult.segments;
      }
      updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(segments) } });
      CLOZE_EDITOR_ACTIVE_MARK_ID = null;
      if (onChange) onChange('structure', fieldId);
    });

    const removePanelBtn = container.querySelector('[data-cloze-edit-remove]');
    if (removePanelBtn) removePanelBtn.addEventListener('click', () => {
      const markId = CLOZE_EDITOR_ACTIVE_MARK_ID;
      const segments = domToClozeSegments(textEl);
      const result = removeClozeMark(segments, markId);
      if (result.ok){
        updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(result.segments) } });
      }
      CLOZE_EDITOR_ACTIVE_MARK_ID = null;
      if (onChange) onChange('structure', fieldId);
    });

    const cancelPanelBtn = container.querySelector('[data-cloze-edit-cancel]');
    if (cancelPanelBtn) cancelPanelBtn.addEventListener('click', () => {
      CLOZE_EDITOR_ACTIVE_MARK_ID = null;
      if (onChange) onChange('structure', fieldId);
    });
  }
}

// Helper de integração, mesmo padrão de refreshMultipleChoiceEditorBox/
// refreshTypeAnswerEditorBox -- re-renderiza só quando a mudança é
// 'structure' (add/remove/marcar/editar/remover lacuna -- nunca em
// digitação de texto normal, que já se atualiza sozinha via contenteditable).
function refreshClozeEditorBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderClozeEditorHTML(editorState, opts);
  wireClozeEditor(boxEl, editorState, (kind) => {
    if (kind === 'structure') refreshClozeEditorBox(boxEl, editorState, opts);
  }, opts);
}

// ---------- Extensão do dispatcher por Card Type ----------
// (shared/flashcard-mc-editor.js -> shared/flashcard-typeanswer-editor.js
// -> aqui) -- mesmo padrão das 2 subfases anteriores: a última definição
// carregada vence (ordem de <script> em fr/zh index.html), preservando os
// branches de multiple_choice/type_answer intactos e acrescentando cloze.
function refreshNativeCardTypeBox__sombra5(boxEl, editorState, opts){
  if (editorState && editorState.cardGenerationMode === 'multiple_choice'){
    refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  } else if (editorState && editorState.cardGenerationMode === 'type_answer'){
    refreshTypeAnswerEditorBox(boxEl, editorState, opts);
  } else if (editorState && editorState.cardGenerationMode === 'cloze'){
    refreshClozeEditorBox(boxEl, editorState, opts);
  } else {
    refreshNativeFieldsBox(boxEl, editorState, opts);
  }
}

// ===== shared/flashcard-mc-editor.js =====
// ---------- Editor nativo de Multiple Choice -- Fase 6D.4a da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI ESPECÍFICA de Multiple Choice, construída EM CIMA do Field
// editor genérico da Fase 6D.3 (shared/flashcard-field-editor.js) -- nunca
// reimplementa edição de conteúdo/idioma de Field, só organiza os Fields
// de um Note `multiple_choice` em 3 grupos semânticos (Pergunta/Resposta
// certa/Distratores) e oferece as ações estruturais próprias desse Card
// Type (criar prompt/answer, adicionar/remover/promover distrator).
//
// Substitui conceitualmente o campo flat legado `choices` -- não existe
// NENHUMA estrutura paralela (`choices[]`/`multipleChoiceOptions`/
// `correctChoice`/`promptText`/`answerText`) aqui: a única fonte de
// verdade continua sendo `editorState.fields` (Field state da 6D.1),
// exatamente como o Field editor genérico já trabalha.
//
// Depende de (mesma posição de shared/flashcard-field-editor.js -- antes
// de shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-model.js       (validateNativeNoteRow, CARD_GENERATION_MODES)
//   - shared/flashcard-editor-state.js (noteEditorStateToRow, createNativeNoteEditorState)
//   - shared/flashcard-field-editor.js (renderFieldEditorHTML, wireFieldEditorList,
//                                        addFieldToEditorState, removeFieldFromEditorState,
//                                        updateFieldInEditorState, refreshNativeFieldsBox,
//                                        fieldIsPinyinSatellite -- Fase 6D.8)
//   - escapeHTML (fr/zh app.js)

// Os 3 roles reconhecidos por Multiple Choice -- os únicos que este editor
// atribui/exibe (restrição explícita: "não introduzir outros roles nesta
// subfase"). `role` continua sendo metadado semântico puro -- NUNCA decide
// direção (a engine, shared/flashcard-model.js, já garante isso desde a
// Fase 6B: promptFieldIndex/correctFieldIndex vêm de ÍNDICE, não de role
// interpretado como front/back).
const MC_ROLES = ['prompt', 'answer', 'distractor'];
const MC_MAX_DISTRACTORS = 3;
const MC_MIN_DISTRACTORS = 1;

// ---------- Validação (reutilizável pela 6D.6) ----------
//
// Reaproveita, sem duplicar, a MESMA validação estrutural que o motor já
// roda antes de gerar CardInstances (validateNativeNoteRow, que por sua
// vez chama validateMultipleChoiceFields internamente quando
// card_generation_mode==='multiple_choice') -- nunca uma segunda
// implementação da regra de cardinalidade/pareamento/ids únicos/
// pinyinFieldId. `noteEditorStateToRow()` (Fase 6D.1) já produz o shape
// exato que o motor consome -- é literalmente o mesmo transform que a
// 6D.6 vai usar pra persistir, então esta função já valida contra o
// caminho real, não uma cópia dele.
//
// Duas checagens A MAIS que o motor não faz (porque são preocupação de
// TEMPO DE EDIÇÃO, não de geração de CardInstance -- validateNativeNoteRow
// nunca olhou conteúdo de Field, só estrutura/ids):
//   - "todos os roles reconhecidos" -- um Field com role fora de
//     prompt/answer/distractor (ou sem role nenhuma) deixado numa Note
//     multiple_choice é tratado como AMBÍGUO, não silenciosamente
//     ignorado (isso costuma acontecer ao trocar normal->multiple_choice
//     com 3+ Fields, ver transitionToMultipleChoice abaixo -- o Field
//     "sobrando" fica sem papel e bloqueia a validação até o usuário
//     decidir o que fazer com ele).
//   - "conteúdo válido" -- pergunta/resposta/todo distrator precisam ter
//     texto não-vazio; a engine nunca validou isso (um Field vazio é
//     estruturalmente válido pra ela), mas um cartão de múltipla escolha
//     com uma opção em branco não faz sentido pedagógico nenhum.
function validateNativeMultipleChoiceStructure(editorState){
  if (!editorState || editorState.kind !== 'native'){
    return { ok: false, error: t('mcEditor.err.notNative') };
  }
  if (editorState.cardGenerationMode !== 'multiple_choice'){
    return { ok: false, error: t('mcEditor.err.notMcMode') };
  }

  const row = noteEditorStateToRow(editorState);
  const structural = validateNativeNoteRow(row);
  if (!structural.ok) return structural;

  const fields = editorState.fields || [];
  // Fase 6D.8 -- um satélite de pinyin (alvo de outro field.pinyinFieldId,
  // ex: pinyin do prompt num MC zh convertido de legado) NUNCA precisa de
  // role própria -- ele já está vinculado ao Field dono via pinyinFieldId,
  // exatamente como Normal/Type Answer/Cloze já tratam. Achado real:
  // legacyFlashcardConversionPreflight()/nativeNoteEditorStateFromLegacyRow()
  // (mesma fase) preservam pinyin do prompt de um MC zh legado -- sem esta
  // exceção, essa conversão nunca conseguiria ser salva (bloqueada aqui
  // por um Field que é correto, só sem role, mesmo motivo que
  // fieldIsPinyinSatellite já existe pras transições).
  const unrecognized = fields.filter(f => !MC_ROLES.includes(f.role) && !fieldIsPinyinSatellite(f, fields));
  if (unrecognized.length){
    return { ok: false, error: tp('mcEditor.err.unrecognized', unrecognized.length === 1 ? 1 : 2, { n: unrecognized.length }) };
  }

  const isEmptyField = f => !(f.content && (f.content.value || '').trim());
  if (fields.some(isEmptyField)){
    return { ok: false, error: t('mcEditor.err.emptyField') };
  }

  return { ok: true };
}

// ---------- Transição de outro Card Type pra multiple_choice ----------
//
// Reaproveita, DE FORMA DETERMINÍSTICA, os Fields que já existiam (ex:
// vindos de `normal`) -- nunca inventa conteúdo novo. Só atribui role a
// Fields que AINDA NÃO TÊM NENHUMA role (nunca sobrescreve um role já
// definido -- um Field que já era 'distractor' de uma edição MC anterior
// permanece distractor mesmo se o usuário sair e voltar pro modo). Ordem:
// o primeiro Field sem role vira 'prompt' (se ainda não houver nenhum), o
// segundo vira 'answer' (se ainda não houver nenhum) -- espelha a mesma
// convenção posicional que `normal` já usa (slot 0/slot 1), só que agora
// expressa como role em vez de índice.
//
// NUNCA cria distractors automaticamente -- se não sobrar nenhum Field
// pra virar distrator, a estrutura fica EXPLICITAMENTE incompleta
// (validateNativeMultipleChoiceStructure reporta isso) até o usuário
// adicionar pelo menos 1 via "+ Adicionar distrator".
function transitionToMultipleChoice(editorState){
  editorState.cardGenerationMode = 'multiple_choice';
  const fields = editorState.fields || [];
  const hasPrompt = fields.some(f => f.role === 'prompt');
  const hasAnswer = fields.some(f => f.role === 'answer');
  // Fase 6D.8 -- nunca escolhe um satélite de pinyin como prompt/answer
  // (fieldIsPinyinSatellite, shared/flashcard-field-editor.js).
  const unroled = fields.filter(f => !f.role && !fieldIsPinyinSatellite(f, fields));
  let cursor = 0;
  if (!hasPrompt && unroled[cursor]){
    updateFieldInEditorState(editorState, unroled[cursor].id, { role: 'prompt' });
    cursor++;
  }
  if (!hasAnswer && unroled[cursor]){
    updateFieldInEditorState(editorState, unroled[cursor].id, { role: 'answer' });
  }
}

// ---------- Ações estruturais (restrições 5/7/15) ----------

// Cria o Field de pergunta -- só chamada pela UI quando nenhum já existe
// (ver renderMultipleChoiceEditorHTML: o botão "+ Criar campo de
// pergunta" só é renderizado quando promptField é falsy).
function addMultipleChoicePromptField(editorState){
  return addFieldToEditorState(editorState, { role: 'prompt' });
}
function addMultipleChoiceAnswerField(editorState){
  return addFieldToEditorState(editorState, { role: 'answer' });
}
// Distrator novo -- id novo (restrição 15: "adicionar distractor cria
// novo ID"), nunca reaproveita/renumera Fields existentes.
function addMultipleChoiceDistractorField(editorState){
  return addFieldToEditorState(editorState, { role: 'distractor' });
}
// Remove SÓ o Field pedido -- restrição 15 ("remover distractor remove
// somente aquele Field", "não renumerar IDs") já é a garantia do próprio
// removeFieldFromEditorState (6D.3, remove por id, nunca por índice).
function removeMultipleChoiceDistractorField(editorState, fieldId){
  removeFieldFromEditorState(editorState, fieldId);
}

// Restrição 7 -- "ao trocar answer<->distractor, isso altera apenas a
// semântica do Field... não deve criar/deletar CardInstances." Promove um
// distrator a resposta certa, rebaixando a resposta atual (se existir) a
// distrator -- os DOIS Fields preservam seus próprios ids/conteúdo/lang/
// audio/image/pinyinFieldId intactos, só `role` muda. Se ainda não houver
// nenhuma resposta certa, funciona como "usar este distrator como
// resposta" direto, sem rebaixar nada.
function promoteDistractorToAnswer(editorState, distractorFieldId){
  const currentAnswer = (editorState.fields || []).find(f => f.role === 'answer');
  if (currentAnswer && currentAnswer.id !== distractorFieldId){
    updateFieldInEditorState(editorState, currentAnswer.id, { role: 'distractor' });
  }
  updateFieldInEditorState(editorState, distractorFieldId, { role: 'answer' });
}

// ---------- Render ----------

function renderMultipleChoiceEditorHTML(editorState, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'mc-editor';
  const fields = editorState.fields || [];
  const promptField = fields.find(f => f.role === 'prompt');
  const answerField = fields.find(f => f.role === 'answer');
  const distractorFields = fields.filter(f => f.role === 'distractor');
  // Fields que sobraram de outro Card Type (ex: um 3º Field zh de pinyin
  // ao trocar normal->multiple_choice) -- nunca escondidos silenciosamente
  // (isso faria a mensagem de validação parecer incompreensível): mostrados
  // numa seção própria, com remoção via o botão GENÉRICO do Field editor
  // (data-field-remove, já wireado por wireFieldEditorList dentro de
  // wireMultipleChoiceEditor abaixo).
  const otherFields = fields.filter(f => !MC_ROLES.includes(f.role));
  const validation = validateNativeMultipleChoiceStructure(editorState);

  const promptHTML = promptField
    ? renderFieldEditorHTML(promptField, 0, { namePrefix, label: t('mcEditor.promptLabel'), removable: false })
    : `<p class="profile-edit-hint">${t('mcEditor.noPrompt')}</p><button type="button" class="admin-select-link" data-mc-add-prompt>${t('mcEditor.addPrompt')}</button>`;

  const answerHTML = answerField
    ? renderFieldEditorHTML(answerField, 0, { namePrefix, label: t('mcEditor.answerLabel'), removable: false })
    : `<p class="profile-edit-hint">${t('mcEditor.noAnswer')}</p><button type="button" class="admin-select-link" data-mc-add-answer>${t('mcEditor.addAnswer')}</button>`;

  const distractorsHTML = distractorFields.length
    ? distractorFields.map((f, i) => `
        ${renderFieldEditorHTML(f, i, { namePrefix, label: t('mcEditor.distractorLabel', { n: i + 1 }), removable: false })}
        <div style="display:flex; gap:14px; margin:-6px 0 10px;">
          <button type="button" class="admin-select-link" data-mc-promote-distractor="${f.id}">${t('mcEditor.promote')}</button>
          <button type="button" class="admin-select-link" data-mc-remove-distractor="${f.id}">${t('mcEditor.removeDistractor')}</button>
        </div>
      `).join('')
    : `<p class="profile-edit-hint">${t('mcEditor.noDistractors')}</p>`;

  const addDistractorHTML = distractorFields.length < MC_MAX_DISTRACTORS
    ? `<button type="button" class="admin-select-link" data-mc-add-distractor>${t('mcEditor.addDistractor')}</button>`
    : `<p class="profile-edit-hint">${t('mcEditor.maxDistractors', { n: MC_MAX_DISTRACTORS })}</p>`;

  const otherFieldsHTML = otherFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">${t('mcEditor.othersTitle')}</div>
    <p class="profile-edit-hint">${t('mcEditor.othersHint')}</p>
    ${otherFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: t('mcEditor.noRoleField', { n: i + 1 }), removable: true })).join('')}
  ` : '';

  const validationHTML = validation.ok
    ? `<p class="profile-edit-hint" style="margin-top:10px; color:var(--jade);">${t('mcEditor.valid')}</p>`
    : `<p class="profile-edit-error" style="margin-top:10px;">${escapeHTML(validation.error)}</p>`;

  return `
    <div data-mc-editor>
      <div class="section-label" style="margin:0 0 4px;">${t('mcEditor.promptLabel')}</div>
      ${promptHTML}
      <div class="section-label" style="margin:14px 0 4px;">${t('mcEditor.answerLabel')}</div>
      ${answerHTML}
      <div class="section-label" style="margin:14px 0 4px;">${t('mcEditor.distractorsTitle', { n: distractorFields.length, max: MC_MAX_DISTRACTORS })}</div>
      ${distractorsHTML}
      ${addDistractorHTML}
      ${otherFieldsHTML}
      ${validationHTML}
    </div>
  `;
}

// ---------- Wiring ----------
//
// `onChange(kind, fieldId)` -- 'content'/'lang' (reaproveitados do Field
// editor genérico, nunca disparam re-render, mesma disciplina da 6D.3) ou
// 'structure' (add/remove/promote -- disparam re-render, porque o CONJUNTO
// de linhas visíveis ou a mensagem de validação mudou).
// `opts` (novo, Fase 7e -- ver CLAUDE.md) repassado pra wireFieldEditorList,
// que por sua vez repassa pra wireFieldAudioBlockFor (uploadFn/deleteFn) --
// nenhuma outra parte deste wiring precisa dele.
function wireMultipleChoiceEditor(container, editorState, onChange, opts){
  if (!container) return;
  // Reaproveita o wiring de conteúdo/idioma do Field editor genérico (6D.3)
  // pra TODO Field mostrado aqui (prompt/answer/distractors/outros) -- e
  // também o remove genérico (data-field-remove), usado só pelos "outros
  // campos" (prompt/answer nunca têm esse botão, distratores usam o botão
  // próprio data-mc-remove-distractor abaixo).
  wireFieldEditorList(container, editorState, (kind, fieldId) => {
    if (onChange) onChange(kind, fieldId);
  }, opts);

  const addPromptBtn = container.querySelector('[data-mc-add-prompt]');
  if (addPromptBtn) addPromptBtn.addEventListener('click', () => {
    addMultipleChoicePromptField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addAnswerBtn = container.querySelector('[data-mc-add-answer]');
  if (addAnswerBtn) addAnswerBtn.addEventListener('click', () => {
    addMultipleChoiceAnswerField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addDistractorBtn = container.querySelector('[data-mc-add-distractor]');
  if (addDistractorBtn) addDistractorBtn.addEventListener('click', () => {
    addMultipleChoiceDistractorField(editorState);
    if (onChange) onChange('structure', null);
  });
  container.querySelectorAll('[data-mc-remove-distractor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldId = btn.dataset.mcRemoveDistractor;
      removeMultipleChoiceDistractorField(editorState, fieldId);
      if (onChange) onChange('structure', fieldId);
    });
  });
  container.querySelectorAll('[data-mc-promote-distractor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldId = btn.dataset.mcPromoteDistractor;
      promoteDistractorToAnswer(editorState, fieldId);
      if (onChange) onChange('structure', fieldId);
    });
  });
}

// Helper de integração, mesmo padrão de refreshNativeFieldsBox (6D.3) --
// re-renderiza só quando a mudança é 'structure' (nunca em edição de
// texto/idioma, pra não apagar o que a professora/aluna está digitando).
function refreshMultipleChoiceEditorBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderMultipleChoiceEditorHTML(editorState, opts);
  wireMultipleChoiceEditor(boxEl, editorState, (kind) => {
    if (kind === 'structure') refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  }, opts);
}

// ---------- Dispatcher por Card Type ----------
//
// Ponto único que os 2 editores (admin-flashcards.js/my-flashcards.js)
// chamam pra desenhar a caixa "Campos nativos" -- decide entre a UI
// estruturada de Multiple Choice (esta subfase) e o Field editor genérico
// da 6D.3 (normal/normal_reversed/type_answer/cloze -- nenhum deles ganhou
// UI própria ainda, restrição 11: "garantir que o novo código não os
// quebra", nada além disso). Vive aqui (não em flashcard-field-editor.js)
// de propósito -- o Field editor genérico continua sem nenhum
// conhecimento de Card Type (restrição 14), é este arquivo MC-específico
// que sabe "pra multiple_choice, use a UI estruturada; pro resto, caia no
// genérico".
function refreshNativeCardTypeBox__sombra6(boxEl, editorState, opts){
  if (editorState && editorState.cardGenerationMode === 'multiple_choice'){
    refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  } else {
    refreshNativeFieldsBox(boxEl, editorState, opts);
  }
}

// ===== shared/flashcard-typeanswer-editor.js =====
// ---------- Editor nativo de Type Answer ("Digite a resposta") -- Fase
// 6D.4b da reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI ESPECÍFICA de Type Answer, construída EM CIMA do Field
// editor genérico da Fase 6D.3 (shared/flashcard-field-editor.js) -- nunca
// reimplementa edição de conteúdo/idioma de Field, só organiza os Fields de
// um Note `type_answer` em 2 grupos semânticos (Pergunta/Resposta esperada)
// e oferece as ações estruturais próprias desse Card Type (criar prompt/
// answer quando ainda não existem).
//
// Mesmo padrão arquitetural da Fase 6D.4a (Multiple Choice,
// shared/flashcard-mc-editor.js) -- reutilizado deliberadamente, não
// reinventado. Diferenças reais em relação a Multiple Choice:
//   - Só 2 roles (`prompt`/`answer`), nunca distractors -- Type Answer é
//     estruturalmente idêntico a `normal` (2 slots de conteúdo), só que o
//     Card Type muda como a aluna responde (digita, em vez de virar o
//     cartão). Por isso `role` aqui é METADADO informativo pro editor --
//     o motor (shared/flashcard-model.js) gera o CardInstance de Type
//     Answer de forma POSICIONAL (promptFieldIndex/answerFieldIndex vêm de
//     contentFieldIndices/slots, o MESMO mecanismo de `normal`), nunca
//     consultando `field.role` pra esse Card Type -- confirmado por
//     leitura do motor antes de codar esta subfase (interpretNativeNoteFromRow,
//     ramo `type_answer`). Marcar os 2 Fields com role:'prompt'/'answer'
//     nesta camada de EDITOR é seguro e não-destrutivo -- não muda em nada
//     como o motor gera o CardInstance (que continua olhando só a posição/
//     índice dos Fields de conteúdo), só dá ao editor um jeito estável de
//     saber "qual Field já é a pergunta, qual já é a resposta" entre
//     re-renders, exatamente como a Fase 6B já trava: "role é apenas
//     semântico; nunca determina direção". Nenhuma mudança foi feita no
//     motor por causa disso -- ver nota de arquitetura no relatório da
//     Fase 6D.4b em CLAUDE.md.
//   - Sem distractors/promote -- não existe 3º papel pra promover, então
//     não há necessidade de nenhuma UX de reatribuição (restrição 4 da
//     6D.4b: "não invente uma nova UX complexa").
//   - Suporte a Field satélite de pinyin (pinyinFieldId) associado ao Field
//     de resposta, pro caso chinês (restrição 5) -- a Fase 6D.3 já decidiu
//     não construir UI de ATRIBUIR pinyin ainda (só preservar o que já
//     existe, reconstruído de uma linha nativa real via
//     createNativeNoteEditorStateFromRow) -- esta subfase segue a mesma
//     decisão: mostra o Field satélite se ele já existir no estado, nunca
//     conta ele como um 3º prompt/answer, mas não introduz um botão novo
//     de "associar pinyin" (fora de escopo, mesmo critério já usado pela
//     6D.3).
//
// Substitui conceitualmente os campos flat legados `front`/`back_trans`/
// `front_pinyin` quando usados no papel de "type answer" -- não existe
// NENHUMA estrutura paralela (`answer`/`expectedAnswer`/`correctAnswer`/
// `typeAnswerAnswer`/`pinyinAnswer`) aqui: a única fonte de verdade
// continua sendo `editorState.fields` (Field state da 6D.1).
//
// Depende de (mesma posição de shared/flashcard-mc-editor.js -- antes de
// shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-model.js       (validateNativeNoteRow, CARD_GENERATION_MODES)
//   - shared/flashcard-editor-state.js (noteEditorStateToRow, createNativeNoteEditorState)
//   - shared/flashcard-field-editor.js (renderFieldEditorHTML, wireFieldEditorList,
//                                        addFieldToEditorState, removeFieldFromEditorState,
//                                        updateFieldInEditorState, refreshNativeFieldsBox,
//                                        fieldIsPinyinSatellite -- Fase 6D.8)
//   - shared/flashcard-mc-editor.js    (refreshNativeCardTypeBox -- dispatcher
//                                        estendido aqui embaixo com o branch type_answer)
//   - escapeHTML (fr/zh app.js)

// Os 2 roles reconhecidos por Type Answer -- os únicos que este editor
// atribui/exibe. `role` continua sendo metadado semântico puro -- NUNCA
// decide direção (ver nota de arquitetura no topo do arquivo).
const TYPE_ANSWER_ROLES = ['prompt', 'answer'];

// ---------- Validação (reutilizável pela 6D.6) ----------
//
// Mesmo padrão de validateNativeMultipleChoiceStructure (6D.4a): reaproveita,
// sem duplicar, a validação estrutural que o motor já roda antes de gerar
// CardInstances (validateNativeNoteRow, via noteEditorStateToRow -- o MESMO
// transform que a 6D.6 vai usar pra persistir). Checagens A MAIS, que o
// motor não faz (tempo de edição, não geração de CardInstance):
//   - self-reference de pinyinFieldId -- validateNativeNoteRow só confirma
//     que o ID referenciado existe NA NOTE (`ids.includes(f.pinyinFieldId)`),
//     que é verdade também quando um Field aponta pra SI MESMO (seu próprio
//     id também está em `ids`) -- então essa checagem é só nossa.
//   - "todos os roles reconhecidos" (excluindo Fields satélite de pinyin,
//     que nunca precisam de role) -- um Field com role fora de
//     prompt/answer (ou sem role nenhuma) que não seja satélite de pinyin
//     de outro Field é tratado como AMBÍGUO, não silenciosamente ignorado.
//   - exatamente 1 prompt, exatamente 1 answer.
//   - "conteúdo válido" -- pergunta e resposta precisam ter texto não-vazio;
//     a engine nunca validou isso (um Field vazio é estruturalmente válido
//     pra ela).
function validateNativeTypeAnswerStructure(editorState){
  if (!editorState || editorState.kind !== 'native'){
    return { ok: false, error: t('taEditor.err.notNative') };
  }
  if (editorState.cardGenerationMode !== 'type_answer'){
    return { ok: false, error: t('taEditor.err.notTaMode') };
  }

  const row = noteEditorStateToRow(editorState);
  const structural = validateNativeNoteRow(row);
  if (!structural.ok) return structural;

  const fields = editorState.fields || [];

  const selfReferencing = fields.filter(f => f.pinyinFieldId != null && f.pinyinFieldId === f.id);
  if (selfReferencing.length){
    return { ok: false, error: t('taEditor.err.selfPinyin') };
  }

  // Fields satélite de pinyin (apontados por pinyinFieldId de outro Field)
  // nunca contam como prompt/answer/campo sem papel -- são complemento de
  // outro Field, não uma pergunta/resposta adicional.
  const pinyinTargetIds = new Set(fields.filter(f => f.pinyinFieldId != null).map(f => f.pinyinFieldId));
  const isPinyinSatellite = f => pinyinTargetIds.has(f.id);
  const roledFields = fields.filter(f => !isPinyinSatellite(f));

  const unrecognized = roledFields.filter(f => f.role !== 'prompt' && f.role !== 'answer');
  if (unrecognized.length){
    return { ok: false, error: tp('taEditor.err.unrecognized', unrecognized.length === 1 ? 1 : 2, { n: unrecognized.length }) };
  }

  const promptFields = roledFields.filter(f => f.role === 'prompt');
  const answerFields = roledFields.filter(f => f.role === 'answer');
  if (promptFields.length === 0) return { ok: false, error: t('taEditor.err.missingPrompt') };
  if (promptFields.length > 1) return { ok: false, error: t('taEditor.err.multiPrompt') };
  if (answerFields.length === 0) return { ok: false, error: t('taEditor.err.missingAnswer') };
  if (answerFields.length > 1) return { ok: false, error: t('taEditor.err.multiAnswer') };

  const isEmptyField = f => !(f.content && (f.content.value || '').trim());
  if (isEmptyField(promptFields[0]) || isEmptyField(answerFields[0])){
    return { ok: false, error: t('taEditor.err.emptyField') };
  }

  return { ok: true };
}

// ---------- Transição de outro Card Type pra type_answer ----------
//
// Mesmo padrão de transitionToMultipleChoice (6D.4a): reaproveita, DE FORMA
// DETERMINÍSTICA, os Fields que já existiam (ex: vindos de `normal`) --
// nunca inventa conteúdo novo, nunca copia o mesmo texto pros dois lados só
// pra "tornar o estado válido". Só atribui role a Fields que AINDA NÃO TÊM
// NENHUMA role (nunca sobrescreve um role já definido). Ordem: o primeiro
// Field sem role vira 'prompt' (se ainda não houver nenhum), o segundo vira
// 'answer' (se ainda não houver nenhum) -- espelha a mesma convenção
// posicional que `normal`/o motor já usam (slot 0/slot 1).
//
// Se não sobrar Field suficiente pra virar prompt/answer, a estrutura fica
// EXPLICITAMENTE incompleta (validateNativeTypeAnswerStructure reporta
// isso) até o usuário adicionar via "+ Criar campo de pergunta"/"+ Criar
// campo de resposta".
function transitionToTypeAnswer(editorState){
  editorState.cardGenerationMode = 'type_answer';
  const fields = editorState.fields || [];
  const hasPrompt = fields.some(f => f.role === 'prompt');
  const hasAnswer = fields.some(f => f.role === 'answer');
  // Fase 6D.8 -- nunca escolhe um satélite de pinyin como prompt/answer
  // (fieldIsPinyinSatellite, shared/flashcard-field-editor.js) -- achado
  // real: converter um Normal zh (front+pinyin+back) e trocar pra "Digite
  // a resposta" atribuía `answer` ao Field de PINYIN em vez da tradução.
  const unroled = fields.filter(f => !f.role && !fieldIsPinyinSatellite(f, fields));
  let cursor = 0;
  if (!hasPrompt && unroled[cursor]){
    updateFieldInEditorState(editorState, unroled[cursor].id, { role: 'prompt' });
    cursor++;
  }
  if (!hasAnswer && unroled[cursor]){
    updateFieldInEditorState(editorState, unroled[cursor].id, { role: 'answer' });
  }
}

// ---------- Ações estruturais ----------
//
// Só criar prompt/answer quando ainda não existem (ver
// renderTypeAnswerEditorHTML: os botões só aparecem quando o Field
// correspondente é falsy). Sem remoção dedicada de prompt/answer -- mesmo
// critério de "não invente uma nova UX complexa" (restrição 4) já aplicado
// por Multiple Choice aos seus próprios prompt/answer (removable:false).
function addTypeAnswerPromptField(editorState){
  return addFieldToEditorState(editorState, { role: 'prompt' });
}
function addTypeAnswerAnswerField(editorState){
  return addFieldToEditorState(editorState, { role: 'answer' });
}

// ---------- Render ----------

function renderTypeAnswerEditorHTML(editorState, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'type-answer-editor';
  const fields = editorState.fields || [];
  const pinyinTargetIds = new Set(fields.filter(f => f.pinyinFieldId != null).map(f => f.pinyinFieldId));
  const isPinyinSatellite = f => pinyinTargetIds.has(f.id);

  const promptField = fields.find(f => f.role === 'prompt' && !isPinyinSatellite(f));
  const answerField = fields.find(f => f.role === 'answer' && !isPinyinSatellite(f));
  const satelliteFields = fields.filter(isPinyinSatellite);
  const otherFields = fields.filter(f => f !== promptField && f !== answerField && !isPinyinSatellite(f));
  const validation = validateNativeTypeAnswerStructure(editorState);

  const promptHTML = promptField
    ? renderFieldEditorHTML(promptField, 0, { namePrefix, label: t('taEditor.promptLabel'), removable: false })
    : `<p class="profile-edit-hint">${t('taEditor.noPrompt')}</p><button type="button" class="admin-select-link" data-ta-add-prompt>${t('taEditor.addPrompt')}</button>`;

  const answerHTML = answerField
    ? renderFieldEditorHTML(answerField, 0, { namePrefix, label: t('taEditor.answerLabel'), removable: false })
    : `<p class="profile-edit-hint">${t('taEditor.noAnswer')}</p><button type="button" class="admin-select-link" data-ta-add-answer>${t('taEditor.addAnswer')}</button>`;

  // Field satélite de pinyin (pinyinFieldId apontando pra outro Field --
  // hoje só chega aqui reconstruído de uma linha nativa já existente, ver
  // comentário de arquitetura no topo -- esta subfase não constrói UI pra
  // ASSOCIAR um novo pinyin, só preserva/exibe o que já existir).
  const satelliteHTML = satelliteFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">${t('taEditor.pinyinTitle')}</div>
    <p class="profile-edit-hint">${t('taEditor.pinyinHint')}</p>
    ${satelliteFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: t('taEditor.pinyinLabel', { n: i + 1 }), removable: true })).join('')}
  ` : '';

  const otherFieldsHTML = otherFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">${t('taEditor.othersTitle')}</div>
    <p class="profile-edit-hint">${t('taEditor.othersHint')}</p>
    ${otherFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: t('taEditor.noRoleField', { n: i + 1 }), removable: true })).join('')}
  ` : '';

  const validationHTML = validation.ok
    ? `<p class="profile-edit-hint" style="margin-top:10px; color:var(--jade);">${t('taEditor.valid')}</p>`
    : `<p class="profile-edit-error" style="margin-top:10px;">${escapeHTML(validation.error)}</p>`;

  return `
    <div data-type-answer-editor>
      <div class="section-label" style="margin:0 0 4px;">${t('taEditor.promptLabel')}</div>
      ${promptHTML}
      <div class="section-label" style="margin:14px 0 4px;">${t('taEditor.answerLabel')}</div>
      ${answerHTML}
      ${satelliteHTML}
      ${otherFieldsHTML}
      ${validationHTML}
    </div>
  `;
}

// ---------- Wiring ----------
//
// `onChange(kind, fieldId)` -- 'content'/'lang' (reaproveitados do Field
// editor genérico, nunca disparam re-render) ou 'structure' (criar prompt/
// answer -- dispara re-render, porque o CONJUNTO de linhas visíveis ou a
// mensagem de validação mudou).
// `opts` (Fase 7e -- ver CLAUDE.md) repassado pra wireFieldEditorList
// (uploadFn/deleteFn), mesmo padrão de wireMultipleChoiceEditor.
function wireTypeAnswerEditor(container, editorState, onChange, opts){
  if (!container) return;
  wireFieldEditorList(container, editorState, (kind, fieldId) => {
    if (onChange) onChange(kind, fieldId);
  }, opts);

  const addPromptBtn = container.querySelector('[data-ta-add-prompt]');
  if (addPromptBtn) addPromptBtn.addEventListener('click', () => {
    addTypeAnswerPromptField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addAnswerBtn = container.querySelector('[data-ta-add-answer]');
  if (addAnswerBtn) addAnswerBtn.addEventListener('click', () => {
    addTypeAnswerAnswerField(editorState);
    if (onChange) onChange('structure', null);
  });
}

// Helper de integração, mesmo padrão de refreshMultipleChoiceEditorBox
// (6D.4a) -- re-renderiza só quando a mudança é 'structure' (nunca em
// edição de texto/idioma, pra não apagar o que a professora/aluna está
// digitando).
function refreshTypeAnswerEditorBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderTypeAnswerEditorHTML(editorState, opts);
  wireTypeAnswerEditor(boxEl, editorState, (kind) => {
    if (kind === 'structure') refreshTypeAnswerEditorBox(boxEl, editorState, opts);
  }, opts);
}

// ---------- Extensão do dispatcher por Card Type (shared/flashcard-mc-editor.js) ----------
//
// refreshNativeCardTypeBox() (Fase 6D.4a) é o ponto único que os 2 editores
// chamam pra desenhar a caixa "Campos nativos". Esta subfase adiciona o
// branch de `type_answer` SEM remover o branch de `multiple_choice` já
// existente -- reatribuir a função inteira aqui (em vez de editar o
// arquivo da 6D.4a) mantém cada subfase no seu próprio arquivo, mas ainda
// assim um ÚNICO dispatcher/nome de função em tempo de execução (a última
// definição de `function refreshNativeCardTypeBox` vence, e como este
// arquivo carrega DEPOIS de flashcard-mc-editor.js -- ver ordem de
// <script> em fr/zh index.html -- é esta versão, que já inclui os dois
// branches, que os 2 editores acabam chamando).
function refreshNativeCardTypeBox(boxEl, editorState, opts){
  if (editorState && editorState.cardGenerationMode === 'multiple_choice'){
    refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  } else if (editorState && editorState.cardGenerationMode === 'type_answer'){
    refreshTypeAnswerEditorBox(boxEl, editorState, opts);
  } else {
    refreshNativeFieldsBox(boxEl, editorState, opts);
  }
}

// ===== shared/review-bank-model.js =====
// Banco de Revisão da professora -- modelo PURO (sem DOM, sem rede). Testado em tests/banco-revisao/test_model.js.
// Item -> cartão nativo (Note/Fields) reaproveitando o editor de estado do motor; regras de geração automática;
// agendamento e seleção do Récap; estatísticas; markdown do Manual.
// Depende (globais, carregados antes): createNativeNoteEditorState, addFieldToEditorState,
// validateNoteEditorStateForSave, nativeContentColumnsFromEditorState (motor de flashcards) e escapeHTML.

const RB_ITEM_TYPES = ['vocabulario', 'estrutura', 'verbo', 'erro', 'pronuncia'];
const RB_STATUSES = ['pendente', 'aprovado', 'cortado'];
const RB_OUTCOMES = ['acertou', 'ajuda', 'errou'];
const RB_LANG_SHORT = { frances: 'fr', mandarim: 'zh', portugues: 'pt' };
const RB_LANG_LABEL_KEY = { frances: 'rb.lang.frances', mandarim: 'rb.lang.mandarim', portugues: 'rb.lang.portugues' };
// Motivos do erro, por tipo de item (os mesmos do Banco antigo, que os dados importados já usam).
const RB_REASONS_BY_TYPE = {
  vocabulario: ['nao_lembrou', 'em_parte', 'confundiu', 'genero'],
  verbo: ['nao_lembrou', 'conjugacao', 'tempo', 'auxiliar'],
  estrutura: ['nao_lembrou', 'ordem', 'preposicao', 'concordancia'],
  erro: ['repetiu', 'corrigiu_parte'],
  pronuncia: ['som', 'tonico'],
};
const RB_REASONS = [...new Set(Object.values(RB_REASONS_BY_TYPE).flat())];
// Dias até a próxima vez, por nível do item (0..9). Errou volta ao nível 0 (amanhã).
const RB_INTERVALS = [1, 3, 7, 14, 30, 60, 90, 120, 180, 270];
const RB_RECAP_SIZE = 8;
// Instrução do cartão "Corrija a frase" na língua de referência do aluno.
const RB_FIX_PROMPT = { pt: 'Corrija:', en: 'Fix it:', fr: 'Corrigez :' };

function rbStr(v){ return String(v == null ? '' : v).trim(); }

function rbNormalizeItem(raw){
  const r = raw || {};
  return {
    item_type: RB_ITEM_TYPES.includes(r.item_type) ? r.item_type : 'vocabulario',
    question: rbStr(r.question),
    answer: rbStr(r.answer),
    wrong_form: rbStr(r.wrong_form),
    gap_word: rbStr(r.gap_word),
    explanation: rbStr(r.explanation),
    check_note: rbStr(r.check_note),
    class_date: /^\d{4}-\d{2}-\d{2}$/.test(rbStr(r.class_date)) ? rbStr(r.class_date) : null,
    sensitive: r.sensitive === true,
  };
}

// Campos que faltam para o item virar cartão (códigos, a tela traduz).
function rbItemIssues(item){
  const i = rbNormalizeItem(item), out = [];
  if (!i.question) out.push('question');
  if (!i.answer) out.push('answer');
  if (i.item_type === 'erro' && !i.wrong_form) out.push('wrong_form');
  return out;
}

function rbHasPendingProposal(item){
  return !!(item && item.proposal && typeof item.proposal === 'object' && Object.keys(item.proposal).length);
}

// Aluno do Banco com destino para os cartões: uma conta vinculada ou uma Turma (096: cada membro recebe a sua cópia).
function rbHasTarget(student){ return !!(student && (student.linked_student_id || student.classroom_id)); }

// Geração automática: o item vira cartão direto quando não tem "Para conferir", tem os campos completos
// e o aluno está vinculado a uma conta ou a uma Turma. Mandarim fica de fora (precisa de pinyin: o cartão é criado à mão).
function rbReadyForAuto(item, student, settings){
  if (settings && settings.auto_generate === false) return { ok: false, reason: 'auto_off' };
  if (!rbHasTarget(student)) return { ok: false, reason: 'not_linked' };
  if (student.status === 'arquivado') return { ok: false, reason: 'archived' };
  if (student.language_app_key === 'mandarim') return { ok: false, reason: 'needs_pinyin' };
  if (!item || item.status !== 'pendente') return { ok: false, reason: 'not_pending' };
  if (item.sensitive) return { ok: false, reason: 'sensitive' };
  if (rbStr(item.check_note)) return { ok: false, reason: 'has_doubt' };
  if (rbHasPendingProposal(item)) return { ok: false, reason: 'has_proposal' };
  if (rbItemIssues(item).length) return { ok: false, reason: 'incomplete' };
  return { ok: true, reason: null };
}

// Item que deve virar cartão agora (usado pela tela "Gerar cartões" e pela rotina da madrugada): pendente que passa
// na geração automática, ou aprovado sem cartão ainda (aluno vinculado, não sensível, campos completos, não mandarim).
function rbReadyToDeliver(item, student, settings){
  if (!item || !student) return false;
  if (item.status === 'pendente') return rbReadyForAuto(item, student, settings).ok;
  return item.status === 'aprovado' && !item.teacher_flashcard_id && !item.sensitive && rbHasTarget(student)
    && !rbItemIssues(item).length && student.language_app_key !== 'mandarim';
}

// Primeira forma de `gap_word` (aceita "a / b") que aparece na frase; devolve a frase com {{c1::...}} ou null.
function rbMakeCloze(sentence, gapWord){
  const s = rbStr(sentence), alts = rbStr(gapWord).split('/').map(x => x.trim()).filter(Boolean);
  for (const alt of alts){
    const idx = s.toLowerCase().indexOf(alt.toLowerCase());
    if (idx >= 0) return s.slice(0, idx) + '{{c1::' + s.slice(idx, idx + alt.length) + '}}' + s.slice(idx + alt.length);
  }
  return null;
}

// Tipo de cartão do item: erro = digitar a forma certa; frase com lacuna (estrutura/verbo) = completar; resto = ver resposta.
function rbCardMode(item){
  const i = rbNormalizeItem(item);
  if (i.item_type === 'erro') return 'type_answer';
  if ((i.item_type === 'estrutura' || i.item_type === 'verbo') && i.gap_word){
    const first = i.answer.split(' / ')[0];
    if (first.split(/\s+/).length >= 3 && rbMakeCloze(first, i.gap_word)) return 'cloze';
  }
  return 'normal';
}

function rbItemTags(item){
  const i = rbNormalizeItem(item), tags = ['banco-de-revisao', 'tipo-' + i.item_type];
  if (i.class_date) tags.push('aula-' + i.class_date);
  return tags;
}

// Item + aluno do Banco -> colunas nativas para a RPC approve_review_bank_item. Nunca grava: só monta e valida.
function rbBuildCard(item, student){
  const i = rbNormalizeItem(item);
  const issues = rbItemIssues(i);
  if (issues.length) return { ok: false, error: 'Faltam campos: ' + issues.join(', ') };
  if (student.language_app_key === 'mandarim') return { ok: false, error: 'Cartão de mandarim precisa de pinyin: crie pelo formulário de cartões.' };
  const target = RB_LANG_SHORT[student.language_app_key], ref = student.reference_language || 'pt';
  const mode = rbCardMode(i);
  const st = createNativeNoteEditorState({ cardGenerationMode: mode, languageAppKey: student.language_app_key, origin: 'teacher', tags: rbItemTags(i) });
  st.privateNote = i.explanation || null;
  const add = (value, lang, role) => addFieldToEditorState(st, { content: { value }, lang, role: role || null });
  if (mode === 'type_answer'){
    add(RB_FIX_PROMPT[ref] + ' ' + i.wrong_form + (i.question ? '\n(' + i.question + ')' : ''), ref, 'prompt');
    add(i.answer, target, 'answer');
  } else if (mode === 'cloze'){
    add(rbMakeCloze(i.answer.split(' / ')[0], i.gap_word), target);
    add(i.question, ref);
  } else {
    add(i.question, ref);
    add(i.answer, target);
  }
  const check = validateNoteEditorStateForSave(st);
  if (!check.ok) return { ok: false, error: check.error };
  const cols = nativeContentColumnsFromEditorState(st);
  return { ok: true, mode, front: cols.front, back_trans: cols.back_trans, fields: cols.fields, tags: cols.tags, note: cols.note };
}

// ---------- Agendamento (da professora, para montar o Récap; o FSRS do aluno é outro) ----------
function rbAddDays(dateStr, n){
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
function rbNextSchedule(level, outcome, today){
  const lv = Math.max(0, Math.min(9, Number(level) || 0));
  if (outcome === 'acertou'){ const nl = Math.min(9, lv + 1); return { level: nl, due_date: rbAddDays(today, RB_INTERVALS[nl]) }; }
  if (outcome === 'ajuda') return { level: lv, due_date: rbAddDays(today, RB_INTERVALS[lv]) };
  return { level: 0, due_date: rbAddDays(today, RB_INTERVALS[0]) };
}

// ---------- Agendamento único (FSRS): o Modo aula e o estudo em casa usam o MESMO estado de memória ----------
// Nota 0..3 (Errei, Difícil, Bom, Fácil) = escala da Revisão do site (applyMemoryGrade em shared/fsrs.js).
function rbGradeOutcome(grade){ return grade === 0 ? 'errou' : (grade === 1 ? 'ajuda' : 'acertou'); }
function rbOutcomeGrade(outcome){ return outcome === 'errou' ? 0 : (outcome === 'ajuda' ? 1 : 2); }

function rbLocalDateStr(ms){
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Estado FSRS do item como "cartão" do motor. Item antigo (só nível da escada, sem fsrs) é convertido uma vez:
// nunca revisado = novo; revisado = em revisão, com estabilidade do degrau anterior da escada.
function rbItemFsrsCard(item){
  const f = item && item.fsrs;
  if (f && typeof f === 'object' && f.state && f.state !== 'new') return Object.assign({}, f);
  const lv = Math.max(0, Math.min(9, Number(item && item.level) || 0));
  if (item && item.last_review_date && (lv > 0 || item.last_result)){
    const last = Date.parse(item.last_review_date + 'T12:00:00');
    if (item.last_result === 'errou' || lv === 0) return { state: 'relearning', stability: 1, difficulty: 7, lastReview: last, due: last + 86400000, reps: 1, lapses: 1, fsrsReps: 1, fsrsLapses: 1, interval: 1 };
    const st = RB_INTERVALS[Math.max(0, lv - 1)];
    return { state: 'review', stability: st, difficulty: 5, lastReview: last, due: last + RB_INTERVALS[lv - 1] * 86400000, reps: lv, lapses: 0, fsrsReps: lv, fsrsLapses: 0, interval: st };
  }
  return { state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0 };
}

// Aplica a nota e devolve o que gravar no item: { fsrs, due_date, level, outcome }. Usa applyMemoryGrade/previewNext
// do shared/fsrs.js (carregado antes na página; nos testes, passe `engine`).
function rbApplyGrade(item, grade, nowMs, engine){
  const E = engine || { applyMemoryGrade: (typeof applyMemoryGrade === 'function' ? applyMemoryGrade : null) };
  const now = nowMs || Date.now(), outcome = rbGradeOutcome(grade);
  const card = rbItemFsrsCard(item);
  E.applyMemoryGrade(card, grade, now);
  const lv = Math.max(0, Math.min(9, Number(item && item.level) || 0));
  const level = outcome === 'acertou' ? Math.min(9, lv + 1) : (outcome === 'ajuda' ? lv : 0);
  const fsrs = {};
  ['stability', 'difficulty', 'state', 'lastReview', 'due', 'reps', 'lapses', 'interval', 'fsrsReps', 'fsrsLapses'].forEach(k => { if (card[k] !== undefined) fsrs[k] = card[k]; });
  return { fsrs, due_date: rbLocalDateStr(card.due), level, outcome };
}

// Intervalo (em dias) que cada botão daria, para o rótulo "Bom · 4 dias".
function rbGradePreviews(item, nowMs, engine){
  const E = engine || { previewNextIntervalDays: (typeof previewNextIntervalDays === 'function' ? previewNextIntervalDays : null) };
  const card = rbItemFsrsCard(item), now = nowMs || Date.now();
  return [0, 1, 2, 3].map(g => E.previewNextIntervalDays(card, g, now));
}

// Récap: até `size` itens aprovados vencidos até `lessonDate` (ou nunca revistos). Errados por último resultado primeiro,
// depois os mais atrasados, depois os de nível mais baixo e os mais recentes.
const RB_RECAP_COOLDOWN_DAYS = 3;
function rbSelectRecap(items, lessonDate, size){
  const n = size || RB_RECAP_SIZE;
  // Agendamento único (112): due_date vem do FSRS, seja da aula ou do estudo em casa. Quem foi revisto nos últimos
  // RB_RECAP_COOLDOWN_DAYS dias (em casa ou na aula) descansa, a não ser que tenha errado: o que o aluno acabou de
  // estudar sozinho não volta na aula seguinte.
  const cool = rbAddDays(lessonDate, -RB_RECAP_COOLDOWN_DAYS);
  const due = (items || []).filter(i => i.status === 'aprovado' && (!i.due_date || i.due_date <= lessonDate)
    && !(i.last_review_date && i.last_review_date > cool && i.last_result !== 'errou'));
  due.sort((a, b) =>
    ((b.last_result === 'errou') - (a.last_result === 'errou')) ||
    String(a.due_date || '0000').localeCompare(String(b.due_date || '0000')) ||
    ((a.level || 0) - (b.level || 0)) ||
    String(b.class_date || '').localeCompare(String(a.class_date || '')));
  return due.slice(0, n);
}

// Texto da pergunta no Modo aula/PDF. `labels` = { say, fix, pronounce } já traduzidos pela tela.
function rbPromptText(item, labels){
  const i = rbNormalizeItem(item), L = labels || {};
  if (i.item_type === 'erro') return { prefix: L.fix || 'Corrija:', text: i.wrong_form, wrong: true, hint: i.question };
  if (i.item_type === 'pronuncia') return { prefix: '', text: i.question, wrong: false, hint: '' };
  return { prefix: L.say || 'Como se diz:', text: i.question, wrong: false, hint: '' };
}

// ---------- Estatísticas ----------
function rbPercent(a, b){ return b ? Math.round(a * 100 / b) : null; }
function rbStatsFromReviews(reviews){
  const list = reviews || [];
  const total = list.length, ok = list.filter(r => r.outcome === 'acertou').length, help = list.filter(r => r.outcome === 'ajuda').length;
  const wrong = list.filter(r => r.outcome === 'errou');
  const days = [...new Set(list.map(r => r.review_date))].sort();
  const count = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const byDay = days.slice(-10).map(d => {
    const rs = list.filter(r => r.review_date === d), a = rs.filter(r => r.outcome === 'acertou').length, h = rs.filter(r => r.outcome === 'ajuda').length;
    return { date: d, pct: rbPercent(a, rs.length) || 0, ok: a, help: h, wrong: rs.length - a - h };
  });
  const home = list.filter(r => r.via === 'casa').length;
  return { total, inClass: total - home, atHome: home, days: days.length, okPct: rbPercent(ok, total), helpPct: rbPercent(help, total), wrongPct: rbPercent(wrong.length, total), byDay, byReason: count(wrong, r => r.reason) };
}

// Uma linha da Visão geral por aluno do Banco.
function rbOverviewRow(student, items, reviews, recap, today){
  const lim = rbAddDays(today, -30);
  const r30 = (reviews || []).filter(r => r.review_date >= lim);
  const ok = r30.filter(r => r.outcome === 'acertou').length, wrong = r30.filter(r => r.outcome === 'errou');
  const reasons = {}; wrong.forEach(r => { if (r.reason) reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  const last = student.last_entry_read || '';
  const days = last ? Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(last + 'T12:00:00Z')) / 864e5) : null;
  const lessons = (student.lesson_dates || []).filter(d => d >= today).sort();
  const lastRecapUsed = (reviews || []).filter(r => r.mode === 'recap').map(r => r.review_date).sort().pop() || '';
  return {
    id: student.id, name: student.name, language: student.language_app_key, archived: student.status === 'arquivado', linked: rbHasTarget(student),
    nextLesson: lessons[0] || '', hasAgenda: (student.lesson_dates || []).length > 0,
    pending: (items || []).filter(i => i.status === 'pendente').length, approved: (items || []).filter(i => i.status === 'aprovado').length,
    lastEntry: last, daysSinceEntry: days, recapGenerated: recap ? recap.class_date : '', recapUsed: lastRecapUsed,
    n30: r30.length, home30: r30.filter(r => r.via === 'casa').length, accuracy: rbPercent(ok, r30.length), errors30: wrong.length, topReason: topReason ? topReason[0] : '',
  };
}

// ---------- Markdown mínimo do Manual (tudo escapado; sem HTML cru) ----------
function rbInlineMd(s){
  let h = escapeHTML(s);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return h;
}
function rbMarkdownToHTML(md){
  const lines = String(md || '').replace(/\r/g, '').split('\n'), out = [];
  let i = 0;
  while (i < lines.length){
    const ln = lines[i];
    if (/^```/.test(ln)){ const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push('<pre><code>' + escapeHTML(buf.join('\n')) + '</code></pre>'); continue; }
    const hd = /^(#{1,3})\s+(.*)$/.exec(ln);
    if (hd){ out.push(`<h${hd[1].length + 1}>${rbInlineMd(hd[2])}</h${hd[1].length + 1}>`); i++; continue; }
    if (/^\s*([-*])\s+/.test(ln)){ const buf = []; while (i < lines.length && /^\s*([-*])\s+/.test(lines[i])) buf.push('<li>' + rbInlineMd(lines[i++].replace(/^\s*[-*]\s+/, '')) + '</li>'); out.push('<ul>' + buf.join('') + '</ul>'); continue; }
    if (/^\s*\d+\.\s+/.test(ln)){ const buf = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) buf.push('<li>' + rbInlineMd(lines[i++].replace(/^\s*\d+\.\s+/, '')) + '</li>'); out.push('<ol>' + buf.join('') + '</ol>'); continue; }
    if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])){
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(ln); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push('<div class="rb-md-table"><table><thead><tr>' + head.map(c => '<th>' + rbInlineMd(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + rbInlineMd(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*---+\s*$/.test(ln)){ out.push('<hr>'); i++; continue; }
    if (!ln.trim()){ i++; continue; }
    const buf = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + buf.map(rbInlineMd).join('<br>') + '</p>');
  }
  return out.join('\n');
}

// ===== shared/review-bank-import.js =====
// Importação dos dados do Banco de Revisão antigo (artifact) para o banco do site. A professora escolhe um arquivo
// .json (formato abaixo) em Banco de Revisão > Alunos > "Importar dados do Banco antigo". Grava como ela mesma (RLS):
// alunos do Banco, itens, recaps, respostas e (opcional) o manual. Idempotente: alunos e itens têm `import_key`
// (insere só o que falta, sem sobrescrever o que já existe); respostas importadas são apagadas e regravadas por aluno.
// Nada é entregue a ninguém: itens aprovados de alunos vinculados só viram cartão pelo botão "Gerar cartões".
//
// Formato (version 1), sem e-mails nem códigos de acesso:
// { "version": 1, "manual": "markdown", "students": [ { "key", "name", "language": "frances|portugues|mandarim",
//   "reference": "pt|en|fr", "status": "ativo|arquivado", "notebookId", "agenda": [], "lessonDates": ["AAAA-MM-DD"],
//   "lastEntryRead", "since", "items": [ { "key", "type", "q", "a", "wrong", "gap", "note", "doubt", "status",
//   "date", "level", "due", "last", "lastResult", "proposal", "sensitive" } ], "recaps": [ { "date", "items": ["key"] } ],
//   "reviews": [ { "item", "outcome", "reason", "mode", "date", "ts" } ] } ] }
// Depende de shared/review-bank-model.js (RB_ITEM_TYPES, RB_STATUSES, RB_OUTCOMES, RB_REASONS) e de shared/review-bank.js (RB, rbFetchAll).

const RBI_LANGS = ['frances', 'portugues', 'mandarim'];
const RBI_REFS = ['pt', 'en', 'fr'];
const RBI_MODES = ['recap', 'ultima', 'erros'];
const RBI_MAX_TEXT = 4000;
const RBI_DATE = /^\d{4}-\d{2}-\d{2}$/;

function rbiText(v){ const s = String(v == null ? '' : v).replace(/\r/g, '').trim(); return s.length > RBI_MAX_TEXT ? s.slice(0, RBI_MAX_TEXT) : s; }
function rbiDate(v){ const s = rbiText(v); return RBI_DATE.test(s) ? s : null; }

// Valida e normaliza o arquivo. Devolve { ok, error?, data?, summary?, warnings }.
function rbiParse(text){
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: 'json' }; }
  if (!raw || raw.version !== 1 || !Array.isArray(raw.students)) return { ok: false, error: 'format' };
  const warnings = [];
  const students = [];
  const seenStudents = new Set();
  raw.students.forEach((s, si) => {
    const key = rbiText(s && s.key), name = rbiText(s && s.name);
    if (!key || !name){ warnings.push({ code: 'student_skipped', n: si + 1 }); return; }
    if (seenStudents.has(key)){ warnings.push({ code: 'student_dup', key }); return; }
    seenStudents.add(key);
    const language = RBI_LANGS.includes(s.language) ? s.language : null;
    if (!language){ warnings.push({ code: 'student_lang', key }); return; }
    const items = [], itemKeys = new Set();
    (Array.isArray(s.items) ? s.items : []).forEach(it => {
      const ik = rbiText(it && it.key), q = rbiText(it && it.q), a = rbiText(it && it.a);
      if (!ik || !q || !a || itemKeys.has(ik)){ warnings.push({ code: 'item_skipped', key, item: ik || '?' }); return; }
      itemKeys.add(ik);
      const type = RB_ITEM_TYPES.includes(it.type) ? it.type : 'vocabulario';
      const level = Number.isInteger(it.level) ? Math.max(0, Math.min(9, it.level)) : 0;
      const proposal = it.proposal && typeof it.proposal === 'object' && !Array.isArray(it.proposal) && Object.keys(it.proposal).length ? it.proposal : null;
      items.push({
        import_key: ik, item_type: type, question: q, answer: a, wrong_form: type === 'erro' ? (rbiText(it.wrong) || null) : null,
        gap_word: rbiText(it.gap) || null, explanation: rbiText(it.note) || null, check_note: rbiText(it.doubt) || null,
        status: RB_STATUSES.includes(it.status) ? it.status : 'pendente', class_date: rbiDate(it.date), level,
        due_date: rbiDate(it.due), last_review_date: rbiDate(it.last), last_result: RB_OUTCOMES.includes(it.lastResult) ? it.lastResult : null, proposal, sensitive: it.sensitive === true,
      });
    });
    const recaps = [];
    (Array.isArray(s.recaps) ? s.recaps : []).forEach(r => {
      const d = rbiDate(r && r.date); if (!d) return;
      recaps.push({ class_date: d, keys: (Array.isArray(r.items) ? r.items : []).map(rbiText).filter(k => itemKeys.has(k)) });
    });
    const reviews = [];
    (Array.isArray(s.reviews) ? s.reviews : []).forEach(r => {
      const k = rbiText(r && r.item), d = rbiDate(r && r.date);
      if (!itemKeys.has(k) || !d || !RB_OUTCOMES.includes(r.outcome)) return;
      const ts = r.ts ? new Date(r.ts) : null;
      reviews.push({ item_key: k, outcome: r.outcome, reason: RB_REASONS.includes(rbiText(r.reason)) ? rbiText(r.reason) : (rbiText(r.reason) || null), mode: RBI_MODES.includes(r.mode) ? r.mode : null, review_date: d, created_at: ts && !isNaN(ts) ? ts.toISOString() : d + 'T12:00:00Z' });
    });
    students.push({
      import_key: key, name, language_app_key: language, reference_language: RBI_REFS.includes(s.reference) ? s.reference : 'pt', status: s.status === 'arquivado' ? 'arquivado' : 'ativo',
      notebook_id: rbiText(s.notebookId) || null, agenda_names: (Array.isArray(s.agenda) ? s.agenda : []).map(rbiText).filter(Boolean),
      lesson_dates: (Array.isArray(s.lessonDates) ? s.lessonDates : []).map(rbiDate).filter(Boolean), last_entry_read: rbiDate(s.lastEntryRead), started_on: rbiDate(s.since),
      items, recaps, reviews,
    });
  });
  if (!students.length) return { ok: false, error: 'empty' };
  const sum = (f) => students.reduce((a, s) => a + f(s), 0);
  return {
    ok: true, warnings, data: { students, manual: rbiText(raw.manual) },
    summary: { students: students.length, items: sum(s => s.items.length), pending: sum(s => s.items.filter(i => i.status === 'pendente').length), approved: sum(s => s.items.filter(i => i.status === 'aprovado').length), cut: sum(s => s.items.filter(i => i.status === 'cortado').length), recaps: sum(s => s.recaps.length), reviews: sum(s => s.reviews.length), manual: !!rbiText(raw.manual) },
  };
}

const rbiChunks = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

// Grava tudo. `onProgress(texto)` mostra o andamento. Devolve { ok, counts } ou { ok:false, error }.
async function rbiRun(data, opts, onProgress){
  const say = (m) => { if (typeof onProgress === 'function') onProgress(m); };
  const counts = { students: 0, items: 0, recaps: 0, reviews: 0 };
  try {
    for (const s of data.students){
      say(rbt('imp.progress', { name: s.name }));
      const base = { teacher_id: CURRENT_USER.id, name: s.name, language_app_key: s.language_app_key, reference_language: s.reference_language, status: s.status, notebook_id: s.notebook_id, agenda_names: s.agenda_names, lesson_dates: s.lesson_dates, last_entry_read: s.last_entry_read, started_on: s.started_on, import_key: s.import_key, updated_at: new Date().toISOString() };
      // `ignoreDuplicates`: quem já existe no site NÃO é sobrescrito (importar de novo nunca desfaz o que você mexeu aqui).
      const { error: e1 } = await supabaseClient.from('review_bank_students').upsert(base, { onConflict: 'teacher_id,import_key', ignoreDuplicates: true });
      if (e1) throw e1;
      const { data: found, error: e1b } = await supabaseClient.from('review_bank_students').select('*').eq('import_key', s.import_key);
      if (e1b) throw e1b;
      const stu = (found || [])[0];
      if (!stu) throw new Error('student');
      counts.students++;
      for (const part of rbiChunks(s.items, 150)){
        const rows = part.map(i => Object.assign({ teacher_id: CURRENT_USER.id, bank_student_id: stu.id, language_app_key: stu.language_app_key, student_id: stu.linked_student_id || null }, i));
        const { error: e2 } = await supabaseClient.from('review_bank_items').upsert(rows, { onConflict: 'bank_student_id,import_key', ignoreDuplicates: true });
        if (e2) throw e2;
        counts.items += part.length;
      }
      const idByKey = {};
      (await rbFetchAll(() => supabaseClient.from('review_bank_items').select('id,import_key').eq('bank_student_id', stu.id).order('id'))).forEach(r => { if (r.import_key) idByKey[r.import_key] = r.id; });
      for (const r of s.recaps){
        const { error } = await supabaseClient.from('review_bank_recaps').upsert({ teacher_id: CURRENT_USER.id, bank_student_id: stu.id, language_app_key: stu.language_app_key, class_date: r.class_date, item_ids: r.keys.map(k => idByKey[k]).filter(Boolean), student_id: stu.linked_student_id || null }, { onConflict: 'bank_student_id,class_date', ignoreDuplicates: true });
        if (error) throw error;
        counts.recaps++;
      }
      // respostas importadas são regravadas (idempotente); nunca mexe nas respostas do Modo aula do site
      const { error: eDel } = await supabaseClient.from('review_bank_reviews').delete().eq('bank_student_id', stu.id).eq('source', 'importado');
      if (eDel) throw eDel;
      for (const part of rbiChunks(s.reviews, 300)){
        const rows = part.filter(r => idByKey[r.item_key]).map(r => ({ item_id: idByKey[r.item_key], teacher_id: CURRENT_USER.id, bank_student_id: stu.id, student_id: null, language_app_key: stu.language_app_key, outcome: r.outcome, reason: r.reason, source: 'importado', mode: r.mode, review_date: r.review_date, created_at: r.created_at, applied_at: r.created_at }));
        if (!rows.length) continue;
        const { error } = await supabaseClient.from('review_bank_reviews').insert(rows);
        if (error) throw error;
        counts.reviews += rows.length;
      }
    }
    if (data.manual && opts && opts.replaceManual){
      const { error } = await supabaseClient.from('review_bank_settings').upsert({ teacher_id: CURRENT_USER.id, auto_generate: RB.settings.auto_generate !== false, manual_markdown: data.manual, updated_at: new Date().toISOString() }, { onConflict: 'teacher_id' });
      if (error) throw error;
      RB.settings.manual_markdown = data.manual;
    }
    return { ok: true, counts };
  } catch (e){
    return { ok: false, error: (e && e.message) || String(e), counts };
  }
}

export { rbBuildCard, rbReadyToDeliver, rbReadyForAuto, rbSelectRecap, rbItemIssues, rbNormalizeItem, rbiParse, RB_RECAP_SIZE, RB_STATUSES, RB_ITEM_TYPES };
