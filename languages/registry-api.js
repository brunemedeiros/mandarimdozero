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
    // Idioma do texto de TRADUÇÃO da base do curso (campo `t` do content.js, lado da tradução no Field da trilha):
    // o 1º idioma de site do curso ('pt-BR' no fr e no zh; 'en' no pt, que só tem site em inglês). Melhoria 3 da revisão
    // de arquitetura (2026-10-26): antes o código comum fixava 'pt-BR' para todo idioma.
    baseTranslationLangOf: function(appKey){ const s = pick(appKey, 'siteLanguages'); return (s && s[0]) || null; },
    // Locale de voz/idioma completo do idioma estudado ('fr-FR', 'zh-CN', 'pt-BR'), pelo idioma do Field ('fr', 'zh', 'pt').
    localeOfFieldLang: function(fieldLang){ const l = list.find(x => x.fieldLang === fieldLang); return l ? l.locale : null; },
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
