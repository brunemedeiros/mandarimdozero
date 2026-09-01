// ---------- Seletor de idioma no topbar (compartilhado) ----------
// A bandeira do topbar deixa de ser um link fixo pro "site irmão" e vira um
// seletor de verdade: mostra o idioma atual, e ao clicar abre um menu com os
// outros idiomas disponíveis. Trocar de idioma NÃO faz logout -- a sessão do
// Supabase é a mesma origem/navegador, então a próxima página já abre
// logada, sem passar pela tela de login de novo.
//
// Depende de (todos carregados antes deste arquivo):
//   - languages/index.js        (AVAILABLE_LANGUAGES, LAST_LANGUAGE_KEY)
//   - shared/utils.js           (localStorageSafeSet, sessionStorageSafeSet)
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER, GUEST_MODE_FLAG)
//   - shared/language-pref.js   (setCurrentLearningLanguage)
//   - shared/toast.js           (showToast)
//   - languages/<lang>/app.js   (LANG_ID) -- por isso este script vem por
//     último no <body>, depois de app.js.

function renderLanguageSwitcher(){
  const btn = document.getElementById('lang-switcher-btn');
  const dropdown = document.getElementById('lang-switcher-dropdown');
  if (!btn || !dropdown) return;

  const current = AVAILABLE_LANGUAGES.find(l => l.id === LANG_ID);
  btn.textContent = current ? current.flagEmoji : '🌐';
  btn.setAttribute('aria-label', current ? `Idioma atual: ${current.name}. Clique para trocar de idioma.` : 'Trocar idioma');

  const others = AVAILABLE_LANGUAGES.filter(l => l.enabled && l.id !== LANG_ID);
  dropdown.innerHTML = `
    <div class="lang-switcher-label">Você está estudando</div>
    <div class="lang-switcher-current">${current ? current.flagEmoji : ''} ${current ? current.name : ''}</div>
    ${others.length ? `
      <div class="lang-switcher-sep"></div>
      <div class="lang-switcher-label">Aprender outro idioma</div>
      ${others.map(l => `<button type="button" class="lang-switcher-item" data-lang="${l.id}" aria-label="Trocar para ${l.name}">${l.flagEmoji} ${l.name}</button>`).join('')}
    ` : ''}
  `;

  dropdown.querySelectorAll('.lang-switcher-item').forEach(item => {
    item.addEventListener('click', () => switchLanguage(item.dataset.lang));
  });

  function closeDropdown(){
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !dropdown.classList.contains('open');
    dropdown.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });
  document.addEventListener('click', closeDropdown);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });
}

async function switchLanguage(newLangId){
  const target = AVAILABLE_LANGUAGES.find(l => l.id === newLangId);
  if (!target || !target.enabled || newLangId === LANG_ID) return;

  localStorageSafeSet(LAST_LANGUAGE_KEY, newLangId);

  if (CURRENT_USER){
    try{
      await setCurrentLearningLanguage(CURRENT_USER.id, newLangId);
    }catch(e){
      showToast(`⚠ Não deu pra salvar a troca de idioma agora, mas você já vai entrar em ${target.name}.`);
    }
  } else if (CURRENT_USER === false){
    // Modo convidado: sem conta pra persistir no Supabase. Mantém o modo
    // convidado ativo pra próxima página não pedir login de novo (mesma
    // sessionStorage, mesma aba/origem sobrevive à navegação).
    sessionStorageSafeSet(GUEST_MODE_FLAG, '1');
  }

  window.location.href = `../${newLangId}/index.html`;
}

renderLanguageSwitcher();
