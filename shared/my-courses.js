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
// Idiomas do site que existem no registro (união dos `siteLanguages`), na ordem do registro. Hoje pt-BR e en.
function courseSiteLanguages(){
  const out = [];
  LanguageRegistry.enabled().forEach(l => (l.siteLanguages || []).forEach(x => { if (out.indexOf(x) < 0) out.push(x); }));
  return out;
}

// "Eu falo ...": até 3 idiomas do site, botões lado a lado; com mais, uma lista (como o "I speak English" do Duolingo).
function speakControlHTML(site){
  const sites = courseSiteLanguages();
  const label = escapeHTML(t('courseMenu.speakLabel'));
  if (sites.length <= 3){
    return `<div class="add-course-speak" role="group" aria-label="${label}">${sites.map(x => `<button type="button" data-site="${x}" aria-pressed="${x === site}">${escapeHTML(t('courseMenu.speak.' + x))}</button>`).join('')}</div>`;
  }
  return `<select class="review-settings-select add-course-speak" aria-label="${label}">${sites.map(x => `<option value="${x}"${x === site ? ' selected' : ''}>${escapeHTML(t('courseMenu.speak.' + x))}</option>`).join('')}</select>`;
}

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

// opts.started: true = curso já começado (menu da bandeira, ✓ em Adicionar curso); false = curso novo;
// sem valor (troca pelo seletor de idioma do site) = texto neutro. Os botões e o título são da janela de troca
// de idioma do site e voltam ao texto antigo ao fechar.
function confirmSwitchCourse(appKey, siteLang, opts){
  ensureCourseMenuStyles();
  const modal = document.getElementById('ui-language-confirm-modal');
  const body = document.getElementById('ui-language-confirm-body');
  const yes = document.getElementById('ui-language-confirm-yes');
  const no = document.getElementById('ui-language-confirm-no');
  const title = modal && modal.querySelector('h3');
  if (!modal || !body || !yes || !no){ switchCourse(appKey, siteLang); return; }
  const started = opts && typeof opts.started === 'boolean' ? opts.started : null;
  const course = courseDisplayName(appKey, siteLang);
  const oldTitle = title ? title.textContent : null;
  if (title) title.textContent = started === true ? t('courses.confirm.backTitle', { course }) : started === false ? t('courses.confirm.newTitle') : t('courses.confirm.title');
  const oldYes = yes.textContent, oldNo = no.textContent;
  yes.textContent = started === false ? t('courses.confirm.start', { course }) : t('courses.confirm.go', { course });
  no.textContent = t('courses.confirm.stay');
  const intro = started === true ? t('courses.confirm.backIntro') : started === false ? t('courses.confirm.newIntro') : t('courses.confirm.intro');
  const lead = started === true ? t('courses.confirm.backP', { course }) : started === false ? t('courses.confirm.newP', { course }) : t('courses.confirm.p1');
  body.innerHTML = `<div class="course-confirm">
    <p class="course-confirm-intro">${escapeHTML(intro)}</p>
    <p class="course-confirm-head">${courseFlag(appKey)}<span>${escapeHTML(course)}</span></p>
    ${started === false ? `<p class="jp-tagline">${escapeHTML(t('courses.confirm.tagline'))}</p>` : ''}
    <p class="course-confirm-p">${escapeHTML(lead)}</p>
    <div class="jp-blocos">
      <p class="jp-bloco jp-tom-verde"><span class="jp-icone" aria-hidden="true">✅</span><span><b>${escapeHTML(t('courses.confirm.safeTitle'))}</b><span>${escapeHTML(t('courses.confirm.safeText'))}</span></span></p>
      <p class="jp-bloco jp-tom-ouro course-confirm-keep"><span class="jp-icone" aria-hidden="true">🔥</span><span><b>${escapeHTML(t('courses.confirm.keepTitle'))}</b><span>${escapeHTML(t('courses.confirm.p3'))}</span></span></p>
    </div>
  </div>`;
  if (typeof window.EmojiIcons !== 'undefined') window.EmojiIcons.scan(body);
  const done = (ok) => {
    modal.style.display = 'none';
    yes.onclick = null; no.onclick = null;
    if (title && oldTitle !== null) title.textContent = oldTitle;
    yes.textContent = oldYes; no.textContent = oldNo;
    if (ok) switchCourse(appKey, siteLang);
  };
  const closeBtn = document.getElementById('ui-language-confirm-close');
  yes.onclick = () => done(true);
  no.onclick = () => done(false);
  if (closeBtn) closeBtn.onclick = () => done(false);
  modal.onclick = (e) => { if (e.target === modal) done(false); };
  modal.style.display = 'flex';
}

// A troca de curso mora só no menu da bandeira (topo). Com os cursos por idioma do site ligados, Configurações não tem seletor de idioma
// do site nem lista de cursos: esconde os dois (o seletor antigo só volta com a chave de emergência).
function renderMyCourses(){
  const box = document.getElementById('my-courses');
  if (box){ box.style.display = 'none'; box.innerHTML = ''; }
  const sel = document.getElementById('ui-language-select');
  const row = sel && sel.closest('.pref-row');
  if (row) row.style.display = CourseStorage.isPerSiteLanguage() ? 'none' : '';
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

function courseFlag(appKey){ const l = LanguageRegistry.byAppKey(appKey); return l ? `<span class="course-flag" aria-hidden="true">${l.flagSvg}</span>` : ''; }

// Último progresso lido da conta: reabrir o menu já mostra os cursos sem piscar só o atual.
let courseMenuRaw = null;
async function paintCourseMenu(btn, dropdown){
  ensureCourseMenuStyles();
  const render = (raw) => {
    const items = startedCourses(raw);
    dropdown.innerHTML = `<div class="lang-switcher-label">${escapeHTML(t('courseMenu.title'))}</div>
      ${items.map(c => `<button type="button" class="lang-switcher-item course-menu-item${c.current ? ' is-current' : ''}" data-app="${escapeHTML(c.appKey)}" data-site="${escapeHTML(c.siteLang)}"${c.current ? ' aria-current="true"' : ''}>${courseFlag(c.appKey)}<span class="course-name">${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}</span>${c.current ? '<span class="course-menu-check" aria-hidden="true">✓</span>' : ''}</button>`).join('')}
      <div class="lang-switcher-sep"></div>
      <button type="button" class="lang-switcher-item course-menu-add"><span class="course-menu-plus" aria-hidden="true">+</span><span class="course-name">${escapeHTML(t('courseMenu.add'))}</span></button>`;
    dropdown.querySelectorAll('.course-menu-item:not(.is-current)').forEach(b => b.addEventListener('click', () => confirmSwitchCourse(b.dataset.app, b.dataset.site, { started: true })));
    const add = dropdown.querySelector('.course-menu-add');
    if (add) add.addEventListener('click', () => { dropdown.classList.remove('open'); openAddCourse(); });
  };
  render(courseMenuRaw);
  try {
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof fetchOtherLanguagesRaw === 'function'){ courseMenuRaw = await fetchOtherLanguagesRaw(); render(courseMenuRaw); }
  } catch (e) {}
}

function ensureCourseMenuStyles(){
  if (document.getElementById('course-menu-styles')) return;
  const st = document.createElement('style'); st.id = 'course-menu-styles';
  // Só tokens do site (fr e zh têm os mesmos nomes, valores diferentes). A bandeira é a peça de destaque; o resto fica quieto.
  st.textContent = `.course-flag{ display:inline-flex; flex:0 0 auto; width:30px; height:30px; border-radius:50%; overflow:hidden; border:1px solid var(--paper-line); background:var(--paper); align-items:center; justify-content:center; }
.course-flag svg{ width:42px; height:30px; flex:0 0 auto; border-radius:0; }
.course-menu-item{ min-height:44px; }
.course-menu-item span.course-name{ flex:1; font-weight:800; }
.course-menu-item.is-current{ background: var(--paper); box-shadow: inset 3px 0 0 var(--seal-red); }
.course-menu-check{ font-weight:800; color: var(--jade); }
.course-menu-add{ margin-top:2px; min-height:44px; border:1.5px dashed var(--paper-line) !important; justify-content:flex-start; }
.course-menu-add:hover{ border-color: var(--seal-red) !important; }
.course-menu-plus{ display:inline-flex; width:30px; height:30px; align-items:center; justify-content:center; border-radius:50%; background: var(--paper); border:1px solid var(--paper-line); font-weight:800; line-height:1; color: var(--ink-soft); font-size:18px; }
.add-course-modal{ max-width:640px; width:calc(100% - 24px); max-height:90vh; overflow:auto; }
.add-course-speak{ display:inline-flex; gap:4px; padding:4px; background: var(--paper); border:1px solid var(--paper-line); border-radius:999px; }
.add-course-speak button{ font:inherit; font-weight:800; font-size:14px; min-height:44px; padding:0 16px; border:0; border-radius:999px; background:transparent; color: var(--ink-soft); cursor:pointer; }
.add-course-speak button[aria-pressed="true"]{ background: var(--brand-fill); color: var(--on-brand-fill); }
.add-course-speak button:focus-visible, .add-course-card:focus-visible{ outline:2px solid var(--seal-red); outline-offset:2px; }
.add-course-group{ margin:18px 0 0; font-size:14px; font-weight:800; color: var(--ink-soft); }
.add-course-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:12px; margin-top:12px; }
.add-course-card{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 10px 14px; border:1px solid var(--paper-line); border-radius: var(--radius); background: var(--paper-warm); color: var(--ink); cursor:pointer; position:relative; font-family:var(--font-body); font-weight:800; font-size:16px; min-height:44px; }
.add-course-card:hover{ border-color: var(--seal-red); box-shadow: var(--shadow-lift); }
.add-course-card[aria-current]{ border-color: var(--seal-red); box-shadow: 0 0 0 2px var(--seal-red) inset; }
.add-course-card .course-flag{ width:72px; height:72px; }
.add-course-card .course-flag svg{ width:104px; height:72px; }
.add-course-tag{ font-size:12px; font-weight:700; padding:1px 10px; border-radius:999px; border:1px solid var(--paper-line); background: var(--paper); color: var(--ink-soft); }
.add-course-done{ position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:50%; background: var(--success-fill); color: var(--on-success-fill); font-size:13px; display:flex; align-items:center; justify-content:center; }
.course-confirm{ display:flex; flex-direction:column; gap:12px; }
.course-confirm p{ margin:0; }
.course-confirm-intro{ font-size:14px; font-weight:700; color: var(--ink-soft); }
.course-confirm-head{ display:flex; align-items:center; gap:12px; font-weight:900; font-size:26px; line-height:1.15; color: var(--ink); }
.course-confirm-head .course-flag{ width:52px; height:52px; }
.course-confirm-head .course-flag svg{ width:78px; height:52px; }
.course-confirm-p{ font-size:16px; line-height:1.55; color: var(--ink); max-width:46ch; }
.course-confirm-keep{ margin-top:2px !important; padding:10px 14px; border-radius: var(--radius); background: var(--paper); border:1px solid var(--paper-line); font-size:14.5px; font-weight:700; line-height:1.45; color: var(--ink); }
@media (prefers-reduced-motion: no-preference){ .add-course-card{ transition: box-shadow .15s ease, border-color .15s ease; } }`;
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
  const sites = courseSiteLanguages();
  let site = sites.indexOf(startSite) >= 0 ? startSite : sites[0];
  const paint = async () => {
    let raw = null;
    try { if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof fetchOtherLanguagesRaw === 'function') raw = await fetchOtherLanguagesRaw(); } catch (e) {}
    const items = listAvailableCourses(APP_KEY, startSite, admin).filter(c => c.siteLang === site);
    ov.innerHTML = `<div class="app-modal add-course-modal" role="dialog" aria-modal="true" aria-labelledby="add-course-title">
      <div class="app-modal-header add-course-head"><h3 id="add-course-title" style="margin:0;">${escapeHTML(t('courseMenu.add'))}</h3>
        <button type="button" class="app-modal-close" id="add-course-close" aria-label="${escapeHTML(t('settings.uiLanguage.confirm.cancel'))}">✕</button></div>
      <div class="app-modal-body">
        <div class="add-course-head">${speakControlHTML(site)}</div>
        <h4 class="add-course-group">${escapeHTML(t('courses.group.' + site))}</h4>
        <div class="add-course-grid">${items.map(c => { const done = raw && CourseStorage.blockFor(raw, c.appKey, c.siteLang); return `<button type="button" class="add-course-card" data-app="${escapeHTML(c.appKey)}" data-site="${escapeHTML(c.siteLang)}"${done || c.current ? ' data-started="1"' : ''}${c.current ? ' aria-current="true"' : ''}>
          ${done || c.current ? '<span class="add-course-done" aria-hidden="true">✓</span>' : ''}${courseFlag(c.appKey)}<span>${escapeHTML(courseDisplayName(c.appKey, c.siteLang))}</span>${c.status === 'beta' ? `<span class="add-course-tag">${escapeHTML(t('courses.beta'))}</span>` : ''}</button>`; }).join('')}</div>
      </div></div>`;
    ov.querySelector('#add-course-close').addEventListener('click', () => { ov.style.display = 'none'; });
    ov.querySelectorAll('.add-course-speak button').forEach(b => b.addEventListener('click', () => { site = b.dataset.site; paint(); }));
    const speakSel = ov.querySelector('select.add-course-speak'); if (speakSel) speakSel.addEventListener('change', () => { site = speakSel.value; paint(); });
    ov.querySelectorAll('.add-course-card:not([aria-current])').forEach(b => b.addEventListener('click', () => { ov.style.display = 'none'; confirmSwitchCourse(b.dataset.app, b.dataset.site, { started: b.dataset.started === '1' }); }));
    ov.querySelector('.add-course-card[aria-current]') && ov.querySelector('.add-course-card[aria-current]').addEventListener('click', () => { ov.style.display = 'none'; });
  };
  ov.style.display = 'flex';
  paint();
}
