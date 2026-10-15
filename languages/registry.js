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
