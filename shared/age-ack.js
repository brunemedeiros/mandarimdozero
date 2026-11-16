// Confirmação de idade para quem já tem conta (Fase P, migration 136). Escolha da dona em 2026-11-15: "A1 nova", uma
// janela no estilo das janelas do topo (🔥/⭐, classes tpop-* de shared/janelas-topo.css) que aparece ao abrir o site.
// O cadastro novo já pede a mesma caixinha no passo 2 (index.html); esta janela pega quem criou a conta antes disso e
// quem entrou pelo "Entrar com Google" da tela de Entrar sem passar pelo cadastro.
// - "Confirmar" só funciona com a caixinha marcada; grava a data em profile_private.age_ack_at (ack_my_age, só a própria
//   pessoa lê) e a janela não volta mais.
// - "Agora não" (ou Esc) fecha nesta visita; a janela volta na próxima vez que a pessoa abrir o site.
// - Professora e admin ficam dispensadas (contas de trabalho). Sem a 136 no banco, nada aparece.
// Grátis x Premium: tudo grátis. Carregado depois de shared/roles.js e shared/username-choice.js; chamado por
// onUserLoggedIn (shared/auth.js).

const AGE_ACK_LATER_KEY = 'age-ack-later';
let ageAckChecking = false;

function ageAckLaterThisVisit(){
  try { return sessionStorage.getItem(AGE_ACK_LATER_KEY) === '1'; } catch (e) { return false; }
}

function ageAckModalHTML(){
  return '<div class="age-ack-overlay" id="age-ack-modal">'
    + '<div class="tpop age-ack-pop" role="dialog" aria-modal="true" aria-labelledby="age-ack-title" tabindex="-1">'
    + '<div class="tpop-clip">'
    + '<div class="tpop-head"><p class="tpop-headline" id="age-ack-title">' + escapeHTML(t('ageAck.title')) + '</p>'
    + '<p class="tpop-sub" id="age-ack-sub">' + escapeHTML(t('ageAck.sub')) + '</p>'
    + '<span class="tpop-art" aria-hidden="true">🙋</span></div>'
    + '<div class="tpop-body">'
    + '<div class="tpop-card"><label class="age-ack-label" for="age-ack-check"><input type="checkbox" id="age-ack-check">'
    + '<span id="age-ack-label-text">' + escapeHTML(t('ageAck.label')) + '</span></label></div>'
    + '<p class="age-ack-note" id="age-ack-note" role="status"></p>'
    + '<div class="age-ack-actions"><button type="button" class="age-ack-later" id="age-ack-later">' + escapeHTML(t('ageAck.later')) + '</button>'
    + '<button type="button" class="tpop-link age-ack-confirm" id="age-ack-confirm" disabled>' + escapeHTML(t('ageAck.confirm')) + '</button></div>'
    + '</div></div></div></div>';
}

async function maybeShowAgeAckBanner(){
  if (ageAckChecking || document.getElementById('age-ack-modal') || ageAckLaterThisVisit()) return;
  if (!CURRENT_USER || !CURRENT_USER.id || typeof supabaseClient === 'undefined') return;
  ageAckChecking = true;
  try {
    if (typeof ensureProfileLoaded === 'function') { try { await ensureProfileLoaded(); } catch (e) {} }
    if (typeof isTeacherOrAdmin === 'function' && isTeacherOrAdmin()) return;
    if (typeof isAdminUser === 'function' && isAdminUser()) return;
    const { data, error } = await supabaseClient.from('profile_private').select('age_ack_at').eq('user_id', CURRENT_USER.id).maybeSingle();
    if (error) return; // sem a 136 (coluna inexistente) ou sem rede: não mostra
    if (data && data.age_ack_at) return;
    // espera outras janelas (idioma do site, escolha do @) fecharem, para não empilhar
    const otherOpen = () => [...document.querySelectorAll('.app-modal-overlay, .uchoice-overlay')].some(o => o.getClientRects().length > 0);
    for (let i = 0; i < 120 && otherOpen(); i++){ await new Promise(r => setTimeout(r, 500)); }
    if (document.getElementById('age-ack-modal') || ageAckLaterThisVisit()) return;
    openAgeAckModal();
  } finally {
    ageAckChecking = false;
  }
}

function openAgeAckModal(){
  document.body.insertAdjacentHTML('beforeend', ageAckModalHTML());
  const modal = document.getElementById('age-ack-modal');
  const box = document.getElementById('age-ack-check');
  const confirm = document.getElementById('age-ack-confirm');
  box.addEventListener('change', () => { confirm.disabled = !box.checked; });
  confirm.addEventListener('click', onAgeAckConfirm);
  document.getElementById('age-ack-later').addEventListener('click', ageAckLater);
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') ageAckLater(); });
  try { box.focus({ preventScroll: true }); } catch (e) {}
}

function closeAgeAckModal(){
  const m = document.getElementById('age-ack-modal');
  if (m) m.remove();
}

function ageAckLater(){
  try { sessionStorage.setItem(AGE_ACK_LATER_KEY, '1'); } catch (e) {}
  closeAgeAckModal();
}

async function onAgeAckConfirm(){
  const box = document.getElementById('age-ack-check');
  const confirm = document.getElementById('age-ack-confirm');
  const note = document.getElementById('age-ack-note');
  if (!box || !box.checked) return;
  box.disabled = true; confirm.disabled = true;
  note.textContent = ''; note.className = 'age-ack-note';
  let ok = false;
  try {
    const { data, error } = await supabaseClient.rpc('ack_my_age');
    ok = !error && !!data;
  } catch (err) { ok = false; }
  if (!ok){
    box.disabled = false; confirm.disabled = !box.checked;
    note.textContent = t('ageAck.error'); note.className = 'age-ack-note err';
    return;
  }
  const body = document.querySelector('#age-ack-modal .tpop-body');
  if (body) body.innerHTML = '<p class="age-ack-thanks" role="status">' + escapeHTML(t('ageAck.thanks')) + '</p>';
  setTimeout(closeAgeAckModal, 1800);
}

// Troca de idioma do site com a janela aberta: repinta os textos sem perder a marcação.
function repaintAgeAckBanner(){
  const m = document.getElementById('age-ack-modal');
  if (!m) return;
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  set('age-ack-title', 'ageAck.title'); set('age-ack-sub', 'ageAck.sub'); set('age-ack-label-text', 'ageAck.label');
  set('age-ack-later', 'ageAck.later'); set('age-ack-confirm', 'ageAck.confirm');
}
try { window.addEventListener('i18n:change', repaintAgeAckBanner); } catch (e) {}
