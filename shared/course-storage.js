// E3 / C1 (docs/i18n/auditoria-e3-progresso-por-curso.md): em que CHAVE de `progress.data` mora o progresso de um curso.
//
// courseId = "<appKey>@<idiomaDoSite>". Os dois cursos que já existem (frances@pt-BR, mandarim@pt-BR) continuam nas chaves
// de hoje (data.frances, data.mandarim); cursos novos usam o próprio courseId como chave (data["frances@en"]). Um registro em
// `_meta.courses[courseId].storageKey` tem prioridade (é o que a E3 grava quando um curso novo é iniciado). A regra "pt-BR usa a
// chave sem sufixo" NÃO é deduzida aqui: vem do registro de idiomas (campo legacyStorage).
//
// Depende de LanguageRegistry (languages/registry.js). Funções puras, sem DOM nem rede.
(function(root){
  'use strict';

  // Enquanto false, a página lê/grava SEMPRE o curso legado (appKey@pt-BR), qualquer que seja o idioma do site:
  // comportamento idêntico ao de antes da E3. O passo C5 liga isto junto com a tela "Meus cursos".
  var COURSE_PROGRESS_PER_SITE_LANGUAGE = false;

  // `LanguageRegistry` é um const de script clássico (não vira propriedade de window): referência solta, resolvida na chamada.
  var LR = function(){ return LanguageRegistry; };

  // Chave de armazenamento de um curso. `courses` = progress.data._meta.courses (pode faltar).
  function courseStorageKey(courseId, courses){
    var reg = courses && courses[courseId];
    if (reg && typeof reg.storageKey === 'string' && reg.storageKey) return reg.storageKey;
    var p = LR().parseCourseId(courseId);
    if (p && LR().usesLegacyStorage(p.appKey, p.siteLang)) return p.appKey;
    return courseId;
  }

  // Curso que a página aberta representa. Com a flag desligada é sempre o curso legado (pt-BR).
  function activeCourseId(appKey, uiLang, perSiteLanguage){
    var per = perSiteLanguage === undefined ? COURSE_PROGRESS_PER_SITE_LANGUAGE : perSiteLanguage;
    return LR().courseIdOf(appKey, per && uiLang ? uiLang : 'pt-BR');
  }

  // Chave do bloco desta página dentro de uma linha de `progress.data`.
  function courseStorageKeyFor(appKey, uiLang, progressData, perSiteLanguage){
    var courses = progressData && progressData._meta && progressData._meta.courses;
    return courseStorageKey(activeCourseId(appKey, uiLang, perSiteLanguage), courses);
  }

  var api = { COURSE_PROGRESS_PER_SITE_LANGUAGE: COURSE_PROGRESS_PER_SITE_LANGUAGE, courseStorageKey: courseStorageKey, activeCourseId: activeCourseId, courseStorageKeyFor: courseStorageKeyFor };
  root.CourseStorage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
