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

  // true: o idioma do site da conta escolhe o curso (appKey@idiomaDoSite). Com false a página lê/grava SEMPRE o curso legado
  // (appKey@pt-BR), igual a antes da E3.
  var COURSE_PROGRESS_PER_SITE_LANGUAGE = true;
  // Ligada para todos por decisão da dona (2026-10-12). Chave de emergência/teste: localStorage['courses-per-site-language'] = '0'
  // desliga só naquele navegador (usada pelos testes do comportamento antigo).
  function isPerSiteLanguage(){
    try { if (root.localStorage && root.localStorage.getItem('courses-per-site-language') === '0') return false; } catch (e) {}
    return COURSE_PROGRESS_PER_SITE_LANGUAGE;
  }
  function setPerSiteLanguage(v){ COURSE_PROGRESS_PER_SITE_LANGUAGE = !!v; }

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
    var per = perSiteLanguage === undefined ? isPerSiteLanguage() : perSiteLanguage;
    return LR().courseIdOf(appKey, per && uiLang ? uiLang : 'pt-BR');
  }

  // Chave do bloco desta página dentro de uma linha de `progress.data`.
  function courseStorageKeyFor(appKey, uiLang, progressData, perSiteLanguage){
    var courses = progressData && progressData._meta && progressData._meta.courses;
    return courseStorageKey(activeCourseId(appKey, uiLang, perSiteLanguage), courses);
  }

  function isLegacyCourse(appKey, siteLang){ return LR().usesLegacyStorage(appKey, siteLang || 'pt-BR'); }

  // Bloco de um curso dentro de uma linha de progress.data (sem rede). Sem curso próprio gravado, cai no bloco legado só quando
  // o curso é o legado; um curso novo sem bloco devolve undefined (nunca empresta o progresso do outro curso).
  function blockFor(progressData, appKey, siteLang){
    if (!progressData) return undefined;
    var key = courseStorageKey(LR().courseIdOf(appKey, siteLang || 'pt-BR'), progressData._meta && progressData._meta.courses);
    return progressData[key];
  }

  // Registro de cursos que a conta já iniciou (progress.data._meta.courses). Só acrescenta: nunca muda um registro existente.
  // `hasBlock` = o bloco já existia (conta antiga no curso legado): startedAt fica null (a data real não é conhecida).
  function registerCourse(courses, courseId, storageKey, hasBlock, nowIso){
    var out = Object.assign({}, courses || {});
    if (!out[courseId]) out[courseId] = { storageKey: storageKey, startedAt: hasBlock ? null : nowIso };
    return out;
  }

  // XP da semana de um IDIOMA estudado = soma dos blocos de todos os cursos dele naquela semana. weekly_xp tem chave
  // (conta, semana, idioma estudado); gravar só o bloco atual faria frances@pt-BR e frances@en se sobrescreverem.
  function weeklyXpForLanguage(progressData, appKey, currentBlockKey, currentPeriodXp){
    var week = currentPeriodXp && currentPeriodXp.weekStart;
    if (!week) return null;
    var total = Number(currentPeriodXp.amount) || 0;
    Object.keys(progressData || {}).forEach(function(k){
      if (k === currentBlockKey || k.charAt(0) === '_') return;
      var base = k.indexOf('@') > 0 ? k.slice(0, k.indexOf('@')) : k;
      if (base !== appKey) return;
      var b = progressData[k], px = b && b.periodXp;
      if (px && px.weekStart === week) total += Number(px.amount) || 0;
    });
    return total;
  }

  var api = { COURSE_PROGRESS_PER_SITE_LANGUAGE: COURSE_PROGRESS_PER_SITE_LANGUAGE, isPerSiteLanguage: isPerSiteLanguage, setPerSiteLanguage: setPerSiteLanguage, isLegacyCourse: isLegacyCourse, blockFor: blockFor, registerCourse: registerCourse, weeklyXpForLanguage: weeklyXpForLanguage, courseStorageKey: courseStorageKey, activeCourseId: activeCourseId, courseStorageKeyFor: courseStorageKeyFor };
  root.CourseStorage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
