// ---------- Planos (painel de Admin): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (busca, RPCs, confirmações,
// eventos) fica em shared/admin-premium.js. Testado em tests/painel-admin/test_plans_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t() (chaves plans.* e perm.*).
//
// Depende de: shared/i18n (t), shared/profile.js (escapeHTML).

const PLAN_GRANTABLE_ROLES = ['premium_basic', 'premium_pro', 'teacher'];
const PLAN_MATRIX_ROLES = ['user', 'student', 'premium_basic', 'premium_pro', 'teacher'];

function plnEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
function plnRoleLabel(role){ return t(`plans.role.${role}`); }
function plnInitial(p){ const s = String((p && (p.display_name || p.username)) || '?').trim(); return plnEsc((s[0] || '?').toUpperCase()); }
// Termo de busca limpo: sem @ no começo e sem os caracteres que quebram o filtro do PostgREST.
function plnSearchTerm(raw){ return String(raw || '').trim().replace(/^@+/, '').replace(/[%,()*\\]/g, ''); }
// Nome da permissão: texto do catálogo de textos (perm.<chave>) e, se não existir, o label_pt do banco.
function plnPermLabel(c){ const k = `perm.${c.key}`; const v = t(k); return v === k ? c.label_pt : v; }

function plnPageHTML(){
  return `<div class="painel"><div class="p-pagina" data-tpl="pagina">
    <header class="p-cabecalho"><div><h2>${plnEsc(t('plans.title'))}</h2><span class="p-subtitulo">${plnEsc(t('plans.sub'))}</span></div></header>
    <article aria-labelledby="plans-grant-title"><header><h3 id="plans-grant-title">${plnEsc(t('plans.grant.title'))}</h3></header>
      <p class="p-subtitulo" style="margin-top:0">${plnEsc(t('plans.grant.hint'))}</p>
      <div class="p-busca" id="plans-search-box">
        <label class="p-so-leitor" for="plans-search-input">${plnEsc(t('plans.search.label'))}</label>
        <input type="search" id="plans-search-input" role="combobox" aria-expanded="false" aria-controls="plans-search-list" aria-autocomplete="list" aria-haspopup="listbox"
          placeholder="${plnEsc(t('plans.search.placeholder'))}" autocomplete="off" spellcheck="false">
        <ul class="p-combo-lista" id="plans-search-list" role="listbox" aria-label="${plnEsc(t('plans.search.label'))}" hidden></ul>
        <small id="plans-search-status" aria-live="polite"></small>
      </div>
      <div id="plans-account" aria-live="polite"></div>
    </article>
    <article aria-labelledby="plans-matrix-title"><header><h3 id="plans-matrix-title">${plnEsc(t('plans.matrix.title'))}</h3></header>
      <p class="p-subtitulo" style="margin-top:0">${plnEsc(t('plans.matrix.hint'))}</p>
      <div id="plans-matrix"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${plnEsc(t('plans.loading'))}</span></div></div>
    </article>
  </div></div>`;
}

function plnOptionsHTML(rows, active){
  return rows.map((p, i) => `<li role="option" id="plans-opt-${i}" data-plano-opcao data-i="${i}" aria-selected="${i === active}"${i === active ? ' class="p-ativo"' : ''}>
      <span class="p-avatar" aria-hidden="true">${plnInitial(p)}</span>
      <span class="p-op-texto"><b>${plnEsc(p.display_name || p.username)}</b><small data-opcao-usuario>@${plnEsc(p.username || '')}</small></span>
      ${p.plan_tier === 'premium' ? `<span class="p-selo">${plnEsc(t('plans.chip.premium'))}</span>` : ''}
      ${p.role === 'teacher' || p.role === 'admin' ? `<span class="p-selo">${plnEsc(plnRoleLabel(p.role === 'admin' ? 'admin' : 'teacher'))}</span>` : ''}
    </li>`).join('');
}

function plnAccountHTML(profile, info){
  const roles = Array.isArray(info && info.roles) ? info.roles : [];
  const isStudent = roles.includes('student');
  return `<article class="p-conta">
    <header><div class="p-pessoa"><span class="p-avatar p-avatar--grande" aria-hidden="true">${plnInitial(profile)}</span>
      <div><h3 style="margin:0">${plnEsc(profile.display_name || profile.username)}</h3><small>@${plnEsc(profile.username || '')}</small></div></div></header>
    ${info && info.admin ? `<div class="p-linha-opcao"><span class="p-op-texto"><b>${plnEsc(plnRoleLabel('admin'))}</b><small>${plnEsc(t('plans.role.adminNote'))}</small></span></div>` : ''}
    ${PLAN_GRANTABLE_ROLES.map(role => `<label class="p-linha-opcao"><span class="p-op-texto"><b>${plnEsc(plnRoleLabel(role))}</b></span>
      <input type="checkbox" role="switch" data-plan-role="${role}" aria-label="${plnEsc(plnRoleLabel(role))}" aria-checked="${roles.includes(role)}"${roles.includes(role) ? ' checked' : ''}></label>`).join('')}
    <div class="p-linha-opcao"><span class="p-op-texto"><b>${plnEsc(plnRoleLabel('student'))}${isStudent ? ' ✓' : ''}</b><small>${plnEsc(t('plans.role.studentNote'))}</small></span></div>
  </article>`;
}

// cat = linhas de permission_catalog (key, kind, label_pt); perms = linhas de role_permissions.
function plnMatrixHTML(cat, perms){
  const cell = {};
  (perms || []).forEach(r => { cell[`${r.role}|${r.permission_key}`] = r; });
  return `<div class="p-tabela p-tabela--matriz"><table class="striped" data-plano-matriz>
    <thead><tr><th scope="col">${plnEsc(t('plans.matrix.permission'))}</th>${PLAN_MATRIX_ROLES.map(r => `<th scope="col">${plnEsc(plnRoleLabel(r))}</th>`).join('')}</tr></thead>
    <tbody>${cat.map(c => `<tr><th scope="row">${plnEsc(plnPermLabel(c))}</th>${PLAN_MATRIX_ROLES.map(r => {
      const v = cell[`${r}|${c.key}`] || { enabled: false, limit_value: null };
      const name = `${plnPermLabel(c)}: ${plnRoleLabel(r)}`;
      return `<td><span class="p-celula" data-plano-celula data-role="${r}" data-key="${plnEsc(c.key)}" data-kind="${plnEsc(c.kind)}">
        <input type="checkbox" aria-label="${plnEsc(name)}"${v.enabled ? ' checked' : ''}>
        ${c.kind === 'limit' ? `<input type="number" min="0" step="1" inputmode="numeric" data-plano-limite value="${v.limit_value == null ? '' : plnEsc(v.limit_value)}" placeholder="∞" title="${plnEsc(t('plans.matrix.unlimited'))}" aria-label="${plnEsc(name)}"${v.enabled ? '' : ' disabled'}>` : ''}
      </span></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
