// Escolher o @ uma única vez, no primeiro acesso (migration 111, decisão da autora em 2026-10-17).
// Quem tem o @ aleatório da 060 (u + 10 hex) e ainda não escolheu vê uma janela que não fecha: nome + @ (sugerido a
// partir do nome, editável), com o aviso de que o @ só pode ser escolhido agora. Contas antigas (@ do e-mail) não veem.
// O @ aceita letras minúsculas, números e ponto entre eles, 3 a 24 caracteres (a regra completa fica no servidor,
// _username_problem: inclui a tag de autoria dos decks). Grátis x Premium: tudo grátis.
// Carregado depois de shared/profile.js; chamado por onUserLoggedIn (shared/auth.js).

const UCHOICE_RE = /^[a-z0-9]+(\.[a-z0-9]+)*$/;

// "Raíssa  Lima!" -> "raissa.lima" (sem acento, minúsculas, palavras unidas por ponto)
function uchoiceSlug(text){
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.\s]+/g, ' ')
    .trim()
    .replace(/[\s.]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24)
    .replace(/\.+$/, '');
}

// O que a pessoa digita no campo do @: minúsculas, sem acento, só letras/números/ponto (sem mexer na posição do ponto)
function uchoiceCleanInput(text){
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^@+/, '')
    .replace(/[^a-z0-9.]/g, '').slice(0, 24);
}

function uchoiceLocalProblem(u){
  if (!u || u.length < 3 || u.length > 24 || !UCHOICE_RE.test(u)) return 'invalid';
  return null;
}

async function uchoiceCheck(u){
  const local = uchoiceLocalProblem(u);
  if (local) return local;
  const { data, error } = await supabaseClient.rpc('check_username', { p_username: u });
  if (error) return 'error';
  return data || 'error';
}

// Primeira sugestão livre a partir do nome: raissa.lima, raissalima, raissa.lima2...
async function uchoiceSuggest(name){
  const base = uchoiceSlug(name);
  if (!base || base.length < 3) return '';
  const tries = [base, base.replace(/\./g, '')];
  for (let i = 2; i <= 9; i++) tries.push((base.length > 22 ? base.slice(0, 22) : base) + i);
  for (const c of [...new Set(tries)]){
    if ((await uchoiceCheck(c)) === 'ok') return c;
  }
  return base;
}

function uchoiceStatusText(code){
  if (code === 'ok') return { cls: 'ok', text: t('uchoice.status.ok') };
  if (code === 'taken') return { cls: 'bad', text: t('uchoice.status.taken') };
  if (code === 'reserved') return { cls: 'bad', text: t('uchoice.status.reserved') };
  if (code === 'invalid') return { cls: 'bad', text: t('uchoice.status.invalid') };
  if (code === 'checking') return { cls: '', text: t('uchoice.status.checking') };
  return { cls: 'bad', text: t('uchoice.status.error') };
}

let uchoiceOpen = false;

async function maybeAskUsernameChoice(){
  if (uchoiceOpen || !CURRENT_USER || typeof supabaseClient === 'undefined') return;
  const { data, error } = await supabaseClient.rpc('my_username_choice_pending');
  if (error || data !== true) return; // sem a 111 no banco, ou já escolheu: nada aparece
  // espera outras janelas (idioma do site, "Eu falo...") fecharem, para não empilhar
  const otherOpen = () => [...document.querySelectorAll('.app-modal-overlay:not(.uchoice-overlay)')].some(o => o.getClientRects().length > 0);
  for (let i = 0; i < 120 && otherOpen(); i++){
    await new Promise(r => setTimeout(r, 500));
  }
  if (uchoiceOpen) return;
  openUsernameChoice();
}

async function openUsernameChoice(){
  uchoiceOpen = true;
  const p = (typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE) || {};
  const startName = (p.display_name || CURRENT_USER?.user_metadata?.full_name || '').trim();
  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay uchoice-overlay';
  overlay.id = 'username-choice-modal';
  overlay.innerHTML = `
    <div class="app-modal uchoice-card" role="dialog" aria-modal="true" aria-labelledby="uchoice-title">
      <div class="uchoice-body">
        <h3 id="uchoice-title" class="uchoice-title">${t('uchoice.title')}</h3>
        <p class="uchoice-sub">${t('uchoice.sub')}</p>
        <label class="uchoice-label" for="uchoice-name">${t('uchoice.nameLabel')}</label>
        <input type="text" id="uchoice-name" class="profile-edit-input uchoice-input" maxlength="60" autocomplete="name" value="${escapeHTML(startName)}" placeholder="${escapeHTML(t('uchoice.namePlaceholder'))}">
        <label class="uchoice-label" for="uchoice-user">${t('uchoice.userLabel')}</label>
        <div class="uchoice-user-wrap"><span class="uchoice-at" aria-hidden="true">@</span>
          <input type="text" id="uchoice-user" class="profile-edit-input uchoice-input uchoice-user" maxlength="24" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="email" aria-describedby="uchoice-status uchoice-rules">
        </div>
        <p class="uchoice-status" id="uchoice-status" role="status" aria-live="polite"></p>
        <p class="uchoice-rules" id="uchoice-rules">${t('uchoice.rules')}</p>
        <p class="uchoice-warn">${t('uchoice.warn')}</p>
        <p class="profile-edit-error uchoice-error" role="alert"></p>
        <button type="button" class="btn btn-primary btn-block" id="uchoice-save">${t('uchoice.save')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const nameEl = overlay.querySelector('#uchoice-name');
  const userEl = overlay.querySelector('#uchoice-user');
  const statusEl = overlay.querySelector('#uchoice-status');
  const errEl = overlay.querySelector('.uchoice-error');
  const saveBtn = overlay.querySelector('#uchoice-save');
  let touchedUser = false, seq = 0, timer = null;

  const setStatus = (code) => {
    const s = uchoiceStatusText(code);
    statusEl.textContent = s.text;
    statusEl.className = 'uchoice-status' + (s.cls ? ' is-' + s.cls : '');
  };
  const runCheck = () => {
    clearTimeout(timer);
    const u = userEl.value;
    if (!u){ statusEl.textContent = ''; return; }
    const local = uchoiceLocalProblem(u);
    if (local){ setStatus(local); return; }
    setStatus('checking');
    const my = ++seq;
    timer = setTimeout(async () => { const code = await uchoiceCheck(u); if (my === seq) setStatus(code); }, 350);
  };
  const suggestFromName = async () => {
    if (touchedUser) return;
    const my = ++seq;
    const s = await uchoiceSuggest(nameEl.value);
    if (my !== seq || touchedUser) return;
    userEl.value = s;
    runCheck();
  };

  let nameTimer = null;
  nameEl.addEventListener('input', () => { clearTimeout(nameTimer); nameTimer = setTimeout(suggestFromName, 400); });
  userEl.addEventListener('input', () => {
    touchedUser = true;
    const clean = uchoiceCleanInput(userEl.value);
    if (clean !== userEl.value) userEl.value = clean;
    runCheck();
  });
  saveBtn.addEventListener('click', async () => {
    errEl.textContent = '';
    const name = nameEl.value.trim();
    const u = userEl.value;
    if (!name){ errEl.textContent = t('uchoice.err.name'); nameEl.focus(); return; }
    const local = uchoiceLocalProblem(u);
    if (local){ setStatus(local); userEl.focus(); return; }
    saveBtn.disabled = true;
    const { data, error } = await supabaseClient.rpc('claim_my_username', { p_username: u, p_display_name: name });
    saveBtn.disabled = false;
    if (error || !data || data.error){
      const code = data && data.error;
      if (code === 'taken' || code === 'reserved' || code === 'invalid'){ setStatus(code); userEl.focus(); return; }
      if (code === 'already_chosen'){ closeUsernameChoice(); return; }
      if (code === 'name_required'){ errEl.textContent = t('uchoice.err.name'); return; }
      errEl.textContent = t('uchoice.status.error');
      return;
    }
    if (typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE){
      PROFILE_CACHE = Object.assign({}, PROFILE_CACHE, { username: data.username, display_name: data.display_name, username_chosen_at: new Date().toISOString() });
    }
    closeUsernameChoice();
    if (typeof showToast === 'function') showToast(t('uchoice.done', { user: data.username }));
    if (typeof refreshProfilePlaceholders === 'function') refreshProfilePlaceholders();
    if (typeof renderProfileView === 'function' && document.getElementById('profile-content')?.offsetParent) renderProfileView();
  });

  if (startName) await suggestFromName(); else nameEl.focus();
}

function closeUsernameChoice(){
  document.getElementById('username-choice-modal')?.remove();
  uchoiceOpen = false;
}
