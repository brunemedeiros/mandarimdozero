// E3 / C5: "Meus cursos" (Configurações) e a troca de curso. Só aparece com CourseStorage.isPerSiteLanguage() ligado.
// Curso = idioma estudado x idioma do site. Trocar de curso grava o idioma do site na conta e RECARREGA a página (o STATE é montado no
// carregamento; cada curso tem o próprio progresso). Sequência de dias e conquistas da conta continuam as mesmas (C2 e C4).
// Depende de LanguageRegistry, CourseStorage, t() e (para gravar) setUiLang/persistUiLanguageToAccount/flushAccountUiLanguage/saveState.

// Lista dos cursos que a pessoa pode abrir (puro). `admin` = admin ou professora: só eles veem rascunho (P4).
function listAvailableCourses(currentAppKey, currentSiteLang, admin){
  const out = [];
  LanguageRegistry.enabled().forEach(l => {
    (l.siteLanguages || []).forEach(site => {
      const st = LanguageRegistry.courseStatus(l.appKey, site);
      const status = (st && st.status) || 'publicado';
      if (status === 'rascunho' && !admin) return;
      out.push({ appKey: l.appKey, siteLang: site, courseId: LanguageRegistry.courseIdOf(l.appKey, site), status,
        path: l.path, current: l.appKey === currentAppKey && site === currentSiteLang });
    });
  });
  return out;
}

function courseDisplayName(appKey, siteLang){
  const l = LanguageRegistry.byAppKey(appKey);
  const n = l && l.names && (l.names[getUiLang()] || l.names['pt-BR']);
  const lang = n ? n.short : (l ? l.name : appKey);
  return t('courses.name', { language: lang, site: t('courses.siteLang.' + siteLang) });
}

// Troca de curso: salva o curso atual (na chave dele), grava o idioma do site na conta, abre a página do idioma estudado e recarrega.
async function switchCourse(appKey, siteLang){
  try { if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && progressLoadedOk) await saveState(); } catch (e) {}
  try { if (typeof setUiLang === 'function') await setUiLang(siteLang); } catch (e) {}
  try {
    if (typeof persistUiLanguageToAccount === 'function') persistUiLanguageToAccount(siteLang);
    if (typeof flushAccountUiLanguage === 'function') await flushAccountUiLanguage();
  } catch (e) {}
  const l = LanguageRegistry.byAppKey(appKey);
  const here = (typeof APP_KEY !== 'undefined') ? APP_KEY : null;
  if (l && appKey !== here) window.location.href = '../' + l.path;
  else window.location.reload();
}

function confirmSwitchCourse(appKey, siteLang){
  const modal = document.getElementById('ui-language-confirm-modal');
  const body = document.getElementById('ui-language-confirm-body');
  const yes = document.getElementById('ui-language-confirm-yes');
  const no = document.getElementById('ui-language-confirm-no');
  const text = t('courses.confirm.body', { course: courseDisplayName(appKey, siteLang) });
  if (!modal || !body || !yes || !no){ switchCourse(appKey, siteLang); return; }
  body.textContent = text;
  const done = (ok) => {
    modal.style.display = 'none';
    yes.onclick = null; no.onclick = null;
    if (ok) switchCourse(appKey, siteLang);
  };
  yes.onclick = () => done(true);
  no.onclick = () => done(false);
  modal.style.display = 'flex';
}

function renderMyCourses(){
  const box = document.getElementById('my-courses');
  if (!box) return;
  if (!CourseStorage.isPerSiteLanguage()){ box.style.display = 'none'; box.innerHTML = ''; return; }
  const admin = typeof isAdminUser === 'function' && isAdminUser();
  const site = (typeof pageSiteLanguage === 'function' && typeof progressLoadedOk !== 'undefined' && progressLoadedOk) ? pageSiteLanguage(null) : getUiLang();
  const items = listAvailableCourses(APP_KEY, site, admin);
  box.style.display = '';
  box.innerHTML = `<div class="pref-row-title">${escapeHTML(t('courses.title'))}</div>
    <div class="pref-row-sub">${escapeHTML(t('courses.sub'))}</div>
    <div class="my-courses-list">${items.map(c => `<button type="button" class="btn ${c.current ? 'btn-primary' : 'btn-secondary'} my-course" data-app="${escapeHTML(c.appKey)}" data-site="${escapeHTML(c.siteLang)}" ${c.current ? 'aria-current="true"' : ''}>
      ${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}${c.status === 'beta' ? ` <span class="my-course-tag">${escapeHTML(t('courses.beta'))}</span>` : ''}${c.current ? ` <span class="my-course-tag">${escapeHTML(t('courses.current'))}</span>` : ''}</button>`).join('')}</div>`;
  box.querySelectorAll('button.my-course:not([aria-current])').forEach(b => {
    b.addEventListener('click', () => confirmSwitchCourse(b.dataset.app, b.dataset.site));
  });
}
try {
  window.addEventListener('i18n:change', renderMyCourses);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderMyCourses); else renderMyCourses();
} catch (e) {}
