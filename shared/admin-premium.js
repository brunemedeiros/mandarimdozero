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
// Visual (Design System do painel): peças de HTML em shared/admin-plans-ui.js. Desligar o que alguém já tem (tirar um plano,
// desligar uma permissão de um tipo de conta) pede confirmação (PainelUI.confirmar); ligar não pede.
//
// Depende de: shared/supabase-client.js, shared/toast.js (showToast), shared/admin-plans-ui.js, shared/painel/painel-ui.js.

const ADMIN_PLANS_STATE = { query: '', results: [], active: -1, selected: null, timer: null, seq: 0 };

async function plansConfirm(opts){
  return (window.PainelUI && PainelUI.confirmar) ? PainelUI.confirmar(Object.assign({ cancelar: t('plans.confirm.cancel'), perigo: true }, opts)) : confirm(opts.descricao);
}

async function renderAdminPremiumView(){
  const wrap = document.getElementById('admin-premium-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.premium.adminOnly')}</p>`;
    return;
  }
  ADMIN_PLANS_STATE.selected = null; ADMIN_PLANS_STATE.results = []; ADMIN_PLANS_STATE.active = -1;
  wrap.innerHTML = plnPageHTML();
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
  input.addEventListener('blur', () => setTimeout(closePlansList, 120));
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

async function runPlansSearch(raw, pickFirst){
  const status = document.getElementById('plans-search-status');
  const q = plnSearchTerm(raw);
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
  const input = document.getElementById('plans-search-input');
  const rows = ADMIN_PLANS_STATE.results;
  if (!list || !rows.length){ closePlansList(); return; }
  list.innerHTML = plnOptionsHTML(rows, ADMIN_PLANS_STATE.active);
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-activedescendant', ADMIN_PLANS_STATE.active >= 0 ? `plans-opt-${ADMIN_PLANS_STATE.active}` : '');
  list.querySelectorAll('[data-plano-opcao]').forEach(li => {
    li.addEventListener('mousedown', (e) => { e.preventDefault(); selectPlansAccount(ADMIN_PLANS_STATE.results[+li.dataset.i]); });
  });
}

function setPlansActive(i){
  ADMIN_PLANS_STATE.active = i;
  document.querySelectorAll('#plans-search-list [data-plano-opcao]').forEach(li => {
    const on = +li.dataset.i === i;
    li.classList.toggle('p-ativo', on); li.setAttribute('aria-selected', String(on));
  });
  document.getElementById('plans-search-input').setAttribute('aria-activedescendant', `plans-opt-${i}`);
  document.getElementById(`plans-opt-${i}`)?.scrollIntoView({ block: 'nearest' });
}

function closePlansList(){
  const list = document.getElementById('plans-search-list');
  if (list){ list.hidden = true; list.innerHTML = ''; }
  document.getElementById('plans-search-input')?.setAttribute('aria-expanded', 'false');
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
  box.innerHTML = `<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${escapeHTML(t('plans.loading'))}</span></div>`;
  const { data, error } = await supabaseClient.rpc('admin_get_account_roles', { p_user: profile.user_id });
  if (ADMIN_PLANS_STATE.selected !== profile) return;
  if (error || !data){ box.innerHTML = `<div class="p-alerta p-alerta--erro" role="alert"><span>${escapeHTML(t('plans.loadFailed'))}</span></div>`; return; }
  renderPlansAccount(profile, data);
}

function renderPlansAccount(profile, info){
  const box = document.getElementById('plans-account');
  box.innerHTML = plnAccountHTML(profile, info);
  box.querySelectorAll('[data-plan-role]').forEach(sw => {
    sw.addEventListener('change', async () => {
      const role = sw.dataset.planRole;
      const turnOn = sw.checked;
      const undo = () => { sw.checked = !turnOn; sw.setAttribute('aria-checked', String(!turnOn)); };
      if (!turnOn){
        const ok = await plansConfirm({ titulo: t('plans.confirm.revoke.title', { role: plnRoleLabel(role), username: profile.username }), descricao: t('plans.confirm.revoke.text'), confirmar: t('plans.confirm.revoke.confirm') });
        if (!ok){ undo(); return; }
      }
      sw.disabled = true;
      const { error } = await supabaseClient.rpc(turnOn ? 'admin_grant_role' : 'admin_revoke_role', turnOn
        ? { p_user: profile.user_id, p_role: role, p_expires_at: null }
        : { p_user: profile.user_id, p_role: role });
      sw.disabled = false;
      if (error){ undo(); showToast(t('plans.failed')); return; }
      sw.setAttribute('aria-checked', String(turnOn));
      showToast(t(turnOn ? 'plans.granted' : 'plans.revoked', { role: plnRoleLabel(role), username: profile.username }));
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
    box.innerHTML = `<div class="p-alerta p-alerta--erro" role="alert"><span>${escapeHTML(t('plans.matrix.loadFailed'))}</span></div>`;
    return;
  }
  const names = {}; cat.data.forEach(c => { names[c.key] = plnPermLabel(c); });
  box.innerHTML = plnMatrixHTML(cat.data, perms.data);
  box.querySelectorAll('[data-plano-celula]').forEach(c => {
    const chk = c.querySelector('input[type="checkbox"]');
    const num = c.querySelector('[data-plano-limite]');
    const save = async (desfazer) => {
      const raw = num ? num.value.trim() : '';
      const limit = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0);
      if (num) num.disabled = !chk.checked;
      c.classList.remove('is-saved');
      const { error } = await supabaseClient.rpc('admin_set_role_permission', {
        p_role: c.dataset.role, p_key: c.dataset.key, p_enabled: chk.checked, p_limit: c.dataset.kind === 'limit' ? limit : null,
      });
      if (error){ if (desfazer) desfazer(); showToast(t('plans.failed')); return; }
      c.classList.add('is-saved');
      c.title = t('plans.matrix.saved');
    };
    chk.addEventListener('change', async () => {
      if (!chk.checked){
        const ok = await plansConfirm({ titulo: t('plans.confirm.perm.title', { perm: names[c.dataset.key], role: plnRoleLabel(c.dataset.role) }), descricao: t('plans.confirm.perm.text'), confirmar: t('plans.confirm.perm.confirm') });
        if (!ok){ chk.checked = true; return; }
      }
      save(() => { chk.checked = !chk.checked; if (num) num.disabled = !chk.checked; });
    });
    if (num) num.addEventListener('change', () => save());
  });
}
