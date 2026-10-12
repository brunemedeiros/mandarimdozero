// ---------- Aba "Planos" do Painel de Admin (antiga "⭐ Premium") ----------
// Papéis somados e matriz de permissões (migration 075,
// docs/plano-professora-privacidade.md):
//   1) "Dar ou tirar um plano": busca de QUALQUER conta por nome ou @usuário
//      (sugestões enquanto digita, setas + Enter) e, na conta escolhida,
//      um interruptor por plano (Premium Basic, Premium Pro, Professora),
//      gravado pelas RPCs admin_grant_role/admin_revoke_role. Aluno não se
//      dá aqui: vem do vínculo ativo com uma professora.
//   2) "O que cada plano libera": tabela permissão × tipo de conta
//      (role_permissions), editada célula a célula por admin_set_role_permission.
// O UPDATE direto em profiles.plan_tier (setPlanTier) não era aceito pelo
// banco para outra conta (falhava em silêncio); a RPC mantém plan_tier/role
// como espelho para o código antigo.
//
// Depende de: shared/supabase-client.js, shared/toast.js (showToast),
// shared/profile.js (escapeHTML), shared/utils.js (loadingHTML).

const ADMIN_PLANS_STATE = { query: '', results: [], active: -1, selected: null, timer: null, seq: 0 };
const PLAN_GRANTABLE_ROLES = ['premium_basic', 'premium_pro', 'teacher'];
const PLAN_MATRIX_ROLES = ['user', 'student', 'premium_basic', 'premium_pro', 'teacher'];

function planRoleLabel(role){ return t(`plans.role.${role}`); }

function planInitial(p){
  const s = String(p.display_name || p.username || '?').trim();
  return escapeHTML((s[0] || '?').toUpperCase());
}

async function renderAdminPremiumView(){
  const wrap = document.getElementById('admin-premium-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.premium.adminOnly')}</p>`;
    return;
  }
  ADMIN_PLANS_STATE.selected = null;
  wrap.innerHTML = `
    <section class="panel-section" aria-labelledby="plans-grant-title">
      <h3 class="panel-h" id="plans-grant-title">${t('plans.grant.title')}</h3>
      <p class="panel-hint">${t('plans.grant.hint')}</p>
      <div class="plans-search" role="combobox" aria-expanded="false" aria-owns="plans-search-list" aria-haspopup="listbox" id="plans-search-box">
        <label class="sr-only" for="plans-search-input">${t('plans.search.label')}</label>
        <input type="search" id="plans-search-input" class="profile-edit-input plans-search-input" placeholder="${t('plans.search.placeholder')}"
          autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="plans-search-list">
        <ul class="plans-search-list" id="plans-search-list" role="listbox" hidden></ul>
        <p class="plans-search-status" id="plans-search-status" aria-live="polite"></p>
      </div>
      <div id="plans-account" aria-live="polite"></div>
    </section>
    <section class="panel-section" aria-labelledby="plans-matrix-title">
      <h3 class="panel-h" id="plans-matrix-title">${t('plans.matrix.title')}</h3>
      <p class="panel-hint">${t('plans.matrix.hint')}</p>
      <div id="plans-matrix">${loadingHTML()}</div>
    </section>
  `;
  wirePlansSearch();
  renderPlansMatrix();
}

// ---------- Busca ----------
function wirePlansSearch(){
  const input = document.getElementById('plans-search-input');
  input.addEventListener('input', () => {
    clearTimeout(ADMIN_PLANS_STATE.timer);
    ADMIN_PLANS_STATE.timer = setTimeout(() => runPlansSearch(input.value), 220);
  });
  input.addEventListener('keydown', (e) => {
    const n = ADMIN_PLANS_STATE.results.length;
    if (e.key === 'ArrowDown' && n){ e.preventDefault(); setPlansActive((ADMIN_PLANS_STATE.active + 1) % n); }
    else if (e.key === 'ArrowUp' && n){ e.preventDefault(); setPlansActive((ADMIN_PLANS_STATE.active - 1 + n) % n); }
    else if (e.key === 'Enter'){
      e.preventDefault();
      clearTimeout(ADMIN_PLANS_STATE.timer);
      const pick = ADMIN_PLANS_STATE.results[ADMIN_PLANS_STATE.active >= 0 ? ADMIN_PLANS_STATE.active : 0];
      if (pick && ADMIN_PLANS_STATE.query === input.value.trim()) selectPlansAccount(pick);
      else runPlansSearch(input.value, true);
    } else if (e.key === 'Escape'){ closePlansList(); }
  });
}

function planSearchTerm(raw){
  return String(raw || '').trim().replace(/^@+/, '').replace(/[%,()*\\]/g, '');
}

async function runPlansSearch(raw, pickFirst){
  const status = document.getElementById('plans-search-status');
  const q = planSearchTerm(raw);
  ADMIN_PLANS_STATE.query = String(raw || '').trim();
  if (q.length < 2){
    ADMIN_PLANS_STATE.results = [];
    closePlansList();
    status.textContent = q.length ? t('plans.search.short') : '';
    return;
  }
  const seq = ++ADMIN_PLANS_STATE.seq;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, plan_tier, role')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('username', { ascending: true })
    .limit(8);
  if (seq !== ADMIN_PLANS_STATE.seq) return; // chegou uma busca mais nova
  if (error){ status.textContent = t('plans.search.error'); closePlansList(); return; }
  // Quem começa com o termo vem primeiro (busca por @ exato acha a pessoa no topo).
  const lc = q.toLowerCase();
  const rows = (data || []).slice().sort((a, b) => {
    const sa = String(a.username || '').toLowerCase().startsWith(lc) ? 0 : 1;
    const sb = String(b.username || '').toLowerCase().startsWith(lc) ? 0 : 1;
    return sa - sb;
  });
  ADMIN_PLANS_STATE.results = rows;
  ADMIN_PLANS_STATE.active = rows.length ? 0 : -1;
  status.textContent = rows.length ? '' : t('plans.search.none', { q: ADMIN_PLANS_STATE.query });
  if (pickFirst && rows.length === 1){ selectPlansAccount(rows[0]); return; }
  renderPlansList();
}

function renderPlansList(){
  const list = document.getElementById('plans-search-list');
  const box = document.getElementById('plans-search-box');
  const rows = ADMIN_PLANS_STATE.results;
  if (!rows.length){ closePlansList(); return; }
  list.innerHTML = rows.map((p, i) => `
    <li class="plans-option" role="option" id="plans-opt-${i}" data-i="${i}" aria-selected="${i === ADMIN_PLANS_STATE.active}">
      <span class="plans-avatar" aria-hidden="true">${planInitial(p)}</span>
      <span class="plans-option-text">
        <span class="plans-option-name">${escapeHTML(p.display_name || p.username)}</span>
        <span class="plans-option-user">@${escapeHTML(p.username || '')}</span>
      </span>
      ${p.plan_tier === 'premium' ? `<span class="plans-chip">${t('plans.chip.premium')}</span>` : ''}
      ${p.role === 'teacher' || p.role === 'admin' ? `<span class="plans-chip">${planRoleLabel(p.role === 'admin' ? 'admin' : 'teacher')}</span>` : ''}
    </li>`).join('');
  list.hidden = false;
  box.setAttribute('aria-expanded', 'true');
  document.getElementById('plans-search-input').setAttribute('aria-activedescendant', ADMIN_PLANS_STATE.active >= 0 ? `plans-opt-${ADMIN_PLANS_STATE.active}` : '');
  list.querySelectorAll('.plans-option').forEach(li => {
    li.addEventListener('mousedown', (e) => { e.preventDefault(); selectPlansAccount(ADMIN_PLANS_STATE.results[+li.dataset.i]); });
  });
}

function setPlansActive(i){
  ADMIN_PLANS_STATE.active = i;
  document.querySelectorAll('#plans-search-list .plans-option').forEach(li => li.setAttribute('aria-selected', String(+li.dataset.i === i)));
  document.getElementById('plans-search-input').setAttribute('aria-activedescendant', `plans-opt-${i}`);
  document.getElementById(`plans-opt-${i}`)?.scrollIntoView({ block: 'nearest' });
}

function closePlansList(){
  const list = document.getElementById('plans-search-list');
  if (list){ list.hidden = true; list.innerHTML = ''; }
  document.getElementById('plans-search-box')?.setAttribute('aria-expanded', 'false');
}

// ---------- Conta escolhida ----------
async function selectPlansAccount(profile){
  if (!profile) return;
  closePlansList();
  const input = document.getElementById('plans-search-input');
  input.value = `@${profile.username || ''}`;
  ADMIN_PLANS_STATE.query = input.value;
  ADMIN_PLANS_STATE.selected = profile;
  const box = document.getElementById('plans-account');
  box.innerHTML = loadingHTML();
  const { data, error } = await supabaseClient.rpc('admin_get_account_roles', { p_user: profile.user_id });
  if (ADMIN_PLANS_STATE.selected !== profile) return;
  if (error || !data){ box.innerHTML = `<p class="profile-empty-note">${t('plans.loadFailed')}</p>`; return; }
  renderPlansAccount(profile, data);
}

function renderPlansAccount(profile, info){
  const box = document.getElementById('plans-account');
  const roles = Array.isArray(info.roles) ? info.roles : [];
  const isStudent = roles.includes('student');
  box.innerHTML = `
    <div class="settings-card plans-account-card">
      <div class="settings-row plans-account-head">
        <span class="plans-avatar plans-avatar-lg" aria-hidden="true">${planInitial(profile)}</span>
        <div class="plans-option-text">
          <span class="plans-option-name">${escapeHTML(profile.display_name || profile.username)}</span>
          <span class="plans-option-user">@${escapeHTML(profile.username || '')}</span>
        </div>
      </div>
      ${info.admin ? `<div class="settings-row"><div class="pref-row-text"><div class="pref-row-title">${planRoleLabel('admin')}</div><div class="pref-row-sub">${t('plans.role.adminNote')}</div></div></div>` : ''}
      ${PLAN_GRANTABLE_ROLES.map(role => `
        <div class="settings-row">
          <div class="pref-row-text"><div class="pref-row-title" id="plans-role-${role}">${planRoleLabel(role)}</div></div>
          <button type="button" class="pref-switch" role="switch" aria-labelledby="plans-role-${role}" data-plan-role="${role}" aria-checked="${roles.includes(role)}"><span class="pref-switch-knob"></span></button>
        </div>`).join('')}
      <div class="settings-row">
        <div class="pref-row-text">
          <div class="pref-row-title">${planRoleLabel('student')}${isStudent ? ' ✓' : ''}</div>
          <div class="pref-row-sub">${t('plans.role.studentNote')}</div>
        </div>
      </div>
    </div>`;
  box.querySelectorAll('[data-plan-role]').forEach(sw => {
    sw.addEventListener('click', async () => {
      const role = sw.dataset.planRole;
      const turnOn = sw.getAttribute('aria-checked') !== 'true';
      sw.disabled = true;
      const { error } = await supabaseClient.rpc(turnOn ? 'admin_grant_role' : 'admin_revoke_role', turnOn
        ? { p_user: profile.user_id, p_role: role, p_expires_at: null }
        : { p_user: profile.user_id, p_role: role });
      sw.disabled = false;
      if (error){ showToast(t('plans.failed')); return; }
      sw.setAttribute('aria-checked', String(turnOn));
      showToast(t(turnOn ? 'plans.granted' : 'plans.revoked', { role: planRoleLabel(role), username: profile.username }));
    });
  });
}

// ---------- Matriz de permissões ----------
async function renderPlansMatrix(){
  const box = document.getElementById('plans-matrix');
  if (!box) return;
  const [cat, perms] = await Promise.all([
    supabaseClient.from('permission_catalog').select('key, kind, label_pt, sort').order('sort', { ascending: true }),
    supabaseClient.from('role_permissions').select('role, permission_key, enabled, limit_value'),
  ]);
  if (cat.error || perms.error || !Array.isArray(cat.data)){
    box.innerHTML = `<p class="profile-empty-note">${t('plans.matrix.loadFailed')}</p>`;
    return;
  }
  const cell = {};
  (perms.data || []).forEach(r => { cell[`${r.role}|${r.permission_key}`] = r; });
  const label = (c) => { const k = `perm.${c.key}`; const v = t(k); return v === k ? c.label_pt : v; };
  box.innerHTML = `
    <div class="plans-matrix-scroll">
      <table class="plans-matrix">
        <thead><tr>
          <th scope="col">${t('plans.matrix.permission')}</th>
          ${PLAN_MATRIX_ROLES.map(r => `<th scope="col">${planRoleLabel(r)}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${cat.data.map(c => `<tr>
            <th scope="row">${escapeHTML(label(c))}</th>
            ${PLAN_MATRIX_ROLES.map(r => {
              const v = cell[`${r}|${c.key}`] || { enabled: false, limit_value: null };
              const id = `pm-${r}-${c.key}`;
              const name = `${label(c)}: ${planRoleLabel(r)}`;
              return `<td><span class="plans-cell" data-role="${r}" data-key="${c.key}" data-kind="${c.kind}">
                <input type="checkbox" id="${id}" ${v.enabled ? 'checked' : ''} aria-label="${escapeHTML(name)}">
                ${c.kind === 'limit' ? `<input type="number" min="0" step="1" inputmode="numeric" class="plans-limit" value="${v.limit_value == null ? '' : v.limit_value}"
                    placeholder="∞" title="${t('plans.matrix.unlimited')}" aria-label="${escapeHTML(name)}" ${v.enabled ? '' : 'disabled'}>` : ''}
              </span></td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  box.querySelectorAll('.plans-cell').forEach(c => {
    const chk = c.querySelector('input[type="checkbox"]');
    const num = c.querySelector('.plans-limit');
    const save = async () => {
      const raw = num ? num.value.trim() : '';
      const limit = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0);
      if (num) num.disabled = !chk.checked;
      c.classList.remove('is-saved');
      const { error } = await supabaseClient.rpc('admin_set_role_permission', {
        p_role: c.dataset.role, p_key: c.dataset.key, p_enabled: chk.checked, p_limit: c.dataset.kind === 'limit' ? limit : null,
      });
      if (error){ showToast(t('plans.failed')); return; }
      c.classList.add('is-saved');
      c.title = t('plans.matrix.saved');
    };
    chk.addEventListener('change', save);
    if (num) num.addEventListener('change', save);
  });
}
