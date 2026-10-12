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

// Nome do curso = nome do idioma estudado na língua do curso: Francês (pt-BR), French (en), Chinês, Chinese.
function courseDisplayName(appKey, siteLang){
  return LanguageRegistry.shortName(appKey, siteLang) || appKey;
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
  if (l && appKey !== here){
    // outro idioma estudado: mesma contabilidade do seletor de idioma (último idioma e idioma atual da conta)
    try { if (typeof localStorageSafeSet === 'function' && typeof LAST_LANGUAGE_KEY !== 'undefined') localStorageSafeSet(LAST_LANGUAGE_KEY, l.id); } catch (e) {}
    try { if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof setCurrentLearningLanguage === 'function') await setCurrentLearningLanguage(CURRENT_USER.id, l.id); } catch (e) {}
  }
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
    ${['pt-BR', 'en'].map(site => { const grp = items.filter(c => c.siteLang === site); if (!grp.length) return ''; return `<div class="my-courses-group-title">${escapeHTML(t('courses.group.' + site))}</div>
    <div class="my-courses-list">${grp.map(c => `<button type="button" class="btn ${c.current ? 'btn-primary' : 'btn-secondary'} my-course" data-app="${escapeHTML(c.appKey)}" data-site="${escapeHTML(c.siteLang)}" ${c.current ? 'aria-current="true"' : ''}>
      ${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}${c.status === 'beta' ? ` <span class="my-course-tag">${escapeHTML(t('courses.beta'))}</span>` : ''}${c.current ? ` <span class="my-course-tag">${escapeHTML(t('courses.current'))}</span>` : ''}</button>`).join('')}</div>`; }).join('')}`;
  box.querySelectorAll('button.my-course:not([aria-current])').forEach(b => {
    b.addEventListener('click', () => confirmSwitchCourse(b.dataset.app, b.dataset.site));
  });
}
// C6: portão do primeiro acesso. Depois de "Eu falo..." (idioma do site), a pessoa escolhe o curso entre os disponíveis para esse idioma.
// Conta nova: sem progresso a perder, então não salva nada antes de recarregar/abrir a outra página. Só roda com a flag ligada.
function showFirstCoursePick(lang, modal){
  const box = document.getElementById('ui-language-first-courses');
  if (!box || !modal) return false;
  const items = listAvailableCourses(APP_KEY, lang, false).filter(c => c.siteLang === lang);
  if (items.length < 2) return false;
  items.sort((a, b) => (b.appKey === APP_KEY) - (a.appKey === APP_KEY));
  const body = modal.querySelector('.app-modal-body');
  const head = modal.querySelector('.app-modal-header h3');
  if (head) head.textContent = t('courses.first.title');
  if (body) Array.from(body.children).forEach(ch => { if (ch !== box) ch.style.display = 'none'; });
  box.style.display = '';
  box.innerHTML = `<p style="margin:0 0 4px;">${escapeHTML(t('courses.first.sub'))}</p>
    <div class="my-courses-list" style="margin-top:12px;">${items.map((c, i) => `<button type="button" class="btn ${i === 0 ? 'btn-primary' : 'btn-secondary'} my-course" data-app="${escapeHTML(c.appKey)}">${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}${c.status === 'beta' ? ` <span class="my-course-tag">${escapeHTML(t('courses.beta'))}</span>` : ''}</button>`).join('')}</div>`;
  box.querySelectorAll('button.my-course').forEach(b => b.addEventListener('click', async () => {
    try { if (typeof flushAccountUiLanguage === 'function') await flushAccountUiLanguage(); } catch (e) {}
    const l = LanguageRegistry.byAppKey(b.dataset.app);
    const pinned = (typeof pageCourseSiteLang !== 'undefined') ? pageCourseSiteLang : null;
    if (l && b.dataset.app !== APP_KEY) window.location.href = '../' + l.path;
    else if (pinned !== lang) window.location.reload();
    else modal.style.display = 'none';
  }));
  return true;
}

try {
  window.addEventListener('i18n:change', renderMyCourses);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderMyCourses); else renderMyCourses();
} catch (e) {}

// ---------- Menu da bandeira (estilo Duolingo) e tela "Adicionar curso" ----------
// Cursos que a conta já iniciou: o atual sempre, mais os que têm bloco de progresso (legado ou por idioma do site).
function startedCourses(raw){
  const site = (typeof pageSiteLanguage === 'function' && typeof progressLoadedOk !== 'undefined' && progressLoadedOk) ? pageSiteLanguage(null) : getUiLang();
  const all = listAvailableCourses(APP_KEY, site, false);
  const started = all.filter(c => c.current || (raw && CourseStorage.blockFor(raw, c.appKey, c.siteLang)));
  started.sort((a, b) => (b.current - a.current));
  return started;
}

function courseFlag(appKey){ const l = LanguageRegistry.byAppKey(appKey); return l ? l.flagSvg : ''; }

async function paintCourseMenu(btn, dropdown){
  const render = (raw) => {
    const items = startedCourses(raw);
    dropdown.innerHTML = `<div class="lang-switcher-label">${escapeHTML(t('courseMenu.title'))}</div>
      ${items.map(c => `<button type="button" class="lang-switcher-item course-menu-item${c.current ? ' is-current' : ''}" data-app="${escapeHTML(c.appKey)}" data-site="${escapeHTML(c.siteLang)}"${c.current ? ' aria-current="true"' : ''}>${courseFlag(c.appKey)} <span>${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}</span>${c.current ? '<span class="course-menu-check" aria-hidden="true">✓</span>' : ''}</button>`).join('')}
      <div class="lang-switcher-sep"></div>
      <button type="button" class="lang-switcher-item course-menu-add"><span class="course-menu-plus" aria-hidden="true">+</span> <span>${escapeHTML(t('courseMenu.add'))}</span></button>`;
    dropdown.querySelectorAll('.course-menu-item:not(.is-current)').forEach(b => b.addEventListener('click', () => confirmSwitchCourse(b.dataset.app, b.dataset.site)));
    const add = dropdown.querySelector('.course-menu-add');
    if (add) add.addEventListener('click', () => { dropdown.classList.remove('open'); openAddCourse(); });
  };
  render(null);
  try {
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof fetchOtherLanguagesRaw === 'function') render(await fetchOtherLanguagesRaw());
  } catch (e) {}
}

function ensureCourseMenuStyles(){
  if (document.getElementById('course-menu-styles')) return;
  const st = document.createElement('style'); st.id = 'course-menu-styles';
  st.textContent = `.course-menu-item span:first-of-type{ flex:1; }
.course-menu-item.is-current{ background: var(--paper); }
.course-menu-check{ font-weight:800; color: var(--ink); }
.course-menu-plus{ display:inline-flex; width:20px; height:20px; align-items:center; justify-content:center; border:2px solid var(--ink-soft); border-radius:6px; font-weight:800; line-height:1; color: var(--ink-soft); }
.add-course-modal{ max-width:640px; width:calc(100% - 24px); max-height:90vh; overflow:auto; }
.add-course-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.add-course-speak{ min-height:44px; }
.add-course-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:12px; margin-top:14px; }
.add-course-card{ display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 10px; border:1px solid var(--paper-line); border-radius:14px; background: var(--paper-warm); color: var(--ink); cursor:pointer; position:relative; font-family:var(--font-body); font-weight:800; min-height:44px; }
.add-course-card:hover{ border-color: var(--imperial-gold); }
.add-course-card svg{ width:64px; height:auto; border-radius:4px; }
.add-course-card .add-course-tag{ font-size:11px; font-weight:700; opacity:.8; text-transform:uppercase; }
.add-course-card .add-course-done{ position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:6px; background: var(--ink); color: var(--paper); font-size:13px; display:flex; align-items:center; justify-content:center; }`;
  document.head.appendChild(st);
}

// Tela "Adicionar curso": "Eu falo ..." escolhe o idioma do site e a grade mostra os cursos disponíveis para quem fala aquele idioma.
function openAddCourse(){
  ensureCourseMenuStyles();
  let ov = document.getElementById('add-course-overlay');
  if (!ov){
    ov = document.createElement('div'); ov.id = 'add-course-overlay'; ov.className = 'app-modal-overlay'; ov.style.display = 'none';
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.style.display = 'none'; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ov.style.display = 'none'; });
    document.body.appendChild(ov);
  }
  const admin = typeof isAdminUser === 'function' && isAdminUser();
  const startSite = (typeof pageSiteLanguage === 'function' && typeof progressLoadedOk !== 'undefined' && progressLoadedOk) ? pageSiteLanguage(null) : getUiLang();
  let site = startSite === 'en' ? 'en' : 'pt-BR';
  const paint = async () => {
    let raw = null;
    try { if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof fetchOtherLanguagesRaw === 'function') raw = await fetchOtherLanguagesRaw(); } catch (e) {}
    const items = listAvailableCourses(APP_KEY, startSite, admin).filter(c => c.siteLang === site);
    ov.innerHTML = `<div class="app-modal add-course-modal" role="dialog" aria-modal="true" aria-labelledby="add-course-title">
      <div class="app-modal-header add-course-head"><h3 id="add-course-title" style="margin:0;">${escapeHTML(t('courseMenu.add'))}</h3>
        <button type="button" class="app-modal-close" id="add-course-close" aria-label="${escapeHTML(t('settings.uiLanguage.confirm.cancel'))}">✕</button></div>
      <div class="app-modal-body">
        <div class="add-course-head"><strong>${escapeHTML(t('courses.group.' + site))}</strong>
          <select class="review-settings-select add-course-speak" id="add-course-speak" aria-label="${escapeHTML(t('courseMenu.speakLabel'))}">
            ${['pt-BR', 'en'].map(x => `<option value="${x}"${x === site ? ' selected' : ''}>${escapeHTML(t('courseMenu.speak.' + x))}</option>`).join('')}</select></div>
        <div class="add-course-grid">${items.map(c => { const done = raw && CourseStorage.blockFor(raw, c.appKey, c.siteLang); return `<button type="button" class="add-course-card" data-app="${escapeHTML(c.appKey)}" data-site="${escapeHTML(c.siteLang)}"${c.current ? ' aria-current="true"' : ''}>
          ${done || c.current ? '<span class="add-course-done" aria-hidden="true">✓</span>' : ''}${courseFlag(c.appKey)}<span>${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}</span>${c.status === 'beta' ? `<span class="add-course-tag">${escapeHTML(t('courses.beta'))}</span>` : ''}</button>`; }).join('')}</div>
      </div></div>`;
    ov.querySelector('#add-course-close').addEventListener('click', () => { ov.style.display = 'none'; });
    ov.querySelector('#add-course-speak').addEventListener('change', (e) => { site = e.target.value; paint(); });
    ov.querySelectorAll('.add-course-card:not([aria-current])').forEach(b => b.addEventListener('click', () => { ov.style.display = 'none'; confirmSwitchCourse(b.dataset.app, b.dataset.site); }));
    ov.querySelector('.add-course-card[aria-current]') && ov.querySelector('.add-course-card[aria-current]').addEventListener('click', () => { ov.style.display = 'none'; });
  };
  ov.style.display = 'flex';
  paint();
}
