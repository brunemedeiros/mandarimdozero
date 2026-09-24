// ---------- Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md,
// grillado em 3 rodadas) -- ativação manual do plano Premium ----------
// Diferente de "🎓 Alunos" (que só lista quem já está vinculado como aluno
// formal), Premium se aplica a QUALQUER conta registrada -- decisão
// explícita do grilling ("aluno individual paga por si mesma", não
// dependente de vínculo pedagógico). Por isso esta tela busca por
// @username livre (searchAnyProfileByUsername, shared/roles.js), não lista
// nada por padrão -- não existe hoje uma listagem de "todas as contas" em
// lugar nenhum do admin, e construir uma agora seria escopo maior que o
// pedido ("botão no Painel de Admin", não "navegador de usuários").
//
// Sem checkout Stripe nesta entrega (escopo travado: "só infraestrutura por
// enquanto") -- este é o ÚNICO jeito de uma conta virar Premium hoje.
//
// Depende de (mesma posição de shared/admin-students.js -- antes de app.js):
//   - shared/roles.js   (searchAnyProfileByUsername, setPlanTier)
//   - shared/toast.js   (showToast)

const ADMIN_PREMIUM_STATE = { lastResult: null };

async function renderAdminPremiumView(){
  const wrap = document.getElementById('admin-premium-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Só a administração pode acessar esta seção.</p>`;
    return;
  }

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">⭐ Ativar/remover Premium</div>
      <p class="profile-edit-hint">Busque uma conta por @username e ative o plano Premium pra ela -- funciona pra QUALQUER conta registrada, vinculada a você como aluno ou não. Sem cobrança real ainda (sem checkout configurado) -- é uma concessão manual, reversível a qualquer momento.</p>
      <form id="admin-premium-search-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-premium-username">@username</label>
        <input type="text" id="admin-premium-username" class="profile-edit-input" placeholder="ex: joaosilva" autocomplete="off">
        <p class="profile-edit-error" id="admin-premium-search-error"></p>
        <button type="submit" class="btn btn-secondary btn-block">Buscar conta</button>
      </form>
      <div id="admin-premium-result" style="margin-top:12px;"></div>
    </div>
  `;

  document.getElementById('admin-premium-search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('admin-premium-search-error');
    const resultEl = document.getElementById('admin-premium-result');
    errorEl.textContent = '';
    resultEl.innerHTML = '';
    const username = document.getElementById('admin-premium-username').value;
    const profile = await searchAnyProfileByUsername(username);
    if (!profile){ errorEl.textContent = 'Não achei ninguém com esse @username. Confira a grafia.'; return; }
    ADMIN_PREMIUM_STATE.lastResult = profile;
    renderAdminPremiumResult(profile, resultEl);
  });
}

function renderAdminPremiumResult(profile, resultEl){
  const isPremiumNow = profile.plan_tier === 'premium';
  resultEl.innerHTML = `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(profile.display_name || profile.username)} <span style="opacity:.6">@${escapeHTML(profile.username)}</span></div>
        <div class="admin-badge-desc">Plano atual: ${isPremiumNow ? '⭐ Premium' : '🔒 Grátis'}</div>
      </div>
      <button type="button" class="btn ${isPremiumNow ? 'btn-secondary' : 'btn-primary'}" id="admin-premium-toggle-btn">${isPremiumNow ? 'Remover Premium' : 'Tornar Premium'}</button>
    </div>
  `;
  document.getElementById('admin-premium-toggle-btn').addEventListener('click', async () => {
    const nextTier = isPremiumNow ? 'free' : 'premium';
    const result = await setPlanTier(profile.user_id, nextTier);
    if (!result.ok){ showToast(result.error); return; }
    showToast(nextTier === 'premium' ? `✓ @${profile.username} agora é Premium.` : `✓ Premium removido de @${profile.username}.`);
    renderAdminPremiumResult({ ...profile, plan_tier: nextTier }, resultEl);
  });
}
