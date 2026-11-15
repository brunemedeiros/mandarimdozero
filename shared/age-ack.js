// Confirmação de idade para quem já tem conta (Fase P, opção A da dona em 2026-11-15; migration 136).
// O cadastro novo já pede a caixinha no passo 2 (index.html). Quem criou a conta antes disso, ou entrou pelo
// "Entrar com Google" da tela de Entrar sem passar pelo cadastro, vê uma faixa no topo da tela Estudo com a mesma
// caixinha. Ela NÃO trava nada: some quando a pessoa marca (a data vai para profile_private.age_ack_at pela
// ack_my_age(), que só a própria pessoa lê). Professora e admin ficam dispensadas (contas de trabalho).
// Sem a 136 no banco (coluna ou função faltando), nada aparece. Grátis x Premium: tudo grátis.
// Carregado depois de shared/roles.js e shared/username-choice.js; chamado por onUserLoggedIn (shared/auth.js).

let ageAckChecking = false;

function ageAckBannerHTML(){
  return '<div class="age-ack-banner" id="age-ack-banner" role="region" aria-labelledby="age-ack-title">'
    + '<p class="age-ack-title" id="age-ack-title">' + escapeHTML(t('ageAck.title')) + '</p>'
    + '<label class="age-ack-label" for="age-ack-check"><input type="checkbox" id="age-ack-check">'
    + '<span>' + escapeHTML(t('ageAck.label')) + '</span></label>'
    + '<p class="age-ack-note" id="age-ack-note" role="status"></p>'
    + '</div>';
}

async function maybeShowAgeAckBanner(){
  if (ageAckChecking || document.getElementById('age-ack-banner')) return;
  if (!CURRENT_USER || !CURRENT_USER.id || typeof supabaseClient === 'undefined') return;
  ageAckChecking = true;
  try {
    if (typeof ensureProfileLoaded === 'function') { try { await ensureProfileLoaded(); } catch (e) {} }
    if (typeof isTeacherOrAdmin === 'function' && isTeacherOrAdmin()) return;
    if (typeof isAdminUser === 'function' && isAdminUser()) return;
    const { data, error } = await supabaseClient.from('profile_private').select('age_ack_at').eq('user_id', CURRENT_USER.id).maybeSingle();
    if (error) return; // sem a 136 (coluna inexistente) ou sem rede: não mostra
    if (data && data.age_ack_at) return;
    const wrap = document.getElementById('path-list-wrap');
    if (!wrap || document.getElementById('age-ack-banner')) return;
    wrap.insertAdjacentHTML('afterbegin', ageAckBannerHTML());
    document.getElementById('age-ack-check').addEventListener('change', onAgeAckChange);
  } finally {
    ageAckChecking = false;
  }
}

async function onAgeAckChange(e){
  const box = e.target;
  if (!box.checked) return;
  const note = document.getElementById('age-ack-note');
  box.disabled = true;
  note.textContent = ''; note.className = 'age-ack-note';
  let ok = false;
  try {
    const { data, error } = await supabaseClient.rpc('ack_my_age');
    ok = !error && !!data;
  } catch (err) { ok = false; }
  if (!ok){
    box.checked = false; box.disabled = false;
    note.textContent = t('ageAck.error'); note.className = 'age-ack-note err';
    return;
  }
  const banner = document.getElementById('age-ack-banner');
  if (banner){
    banner.classList.add('done');
    banner.innerHTML = '<p class="age-ack-thanks" role="status">' + escapeHTML(t('ageAck.thanks')) + '</p>';
    setTimeout(() => { const b = document.getElementById('age-ack-banner'); if (b) b.remove(); }, 2500);
  }
}

// Troca de idioma do site com a faixa aberta: repinta os textos sem perder nada.
function repaintAgeAckBanner(){
  const b = document.getElementById('age-ack-banner');
  if (!b || b.classList.contains('done')) return;
  const title = document.getElementById('age-ack-title');
  const span = b.querySelector('.age-ack-label span');
  if (title) title.textContent = t('ageAck.title');
  if (span) span.textContent = t('ageAck.label');
}
try { window.addEventListener('i18n:change', repaintAgeAckBanner); } catch (e) {}
