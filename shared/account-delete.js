// Excluir a própria conta (Configurações > Geral). Só para aluna/usuária: professora e administradora não veem o botão
// (apagar a conta delas apagaria os dados das alunas). Chama a Edge Function delete-my-account (supabase/functions/delete-my-account).
// Depende de (carregar antes): supabaseClient, CURRENT_USER, t, showToast, isTeacherUser/isAdminUser (resolvidos na hora do uso).

function accountDeleteBlocked(){
  return (typeof isAdminUser === 'function' && isAdminUser()) || (typeof isTeacherUser === 'function' && isTeacherUser());
}

function refreshDeleteAccountBox(){
  const box = document.getElementById('settings-delete-box');
  if (box) box.hidden = !CURRENT_USER || accountDeleteBlocked();
}

function openDeleteAccountModal(){
  const modal = document.getElementById('delete-account-modal');
  if (!modal) return;
  document.getElementById('delete-account-input').value = '';
  document.getElementById('delete-account-error').textContent = '';
  document.getElementById('delete-account-yes').disabled = true;
  modal.style.display = 'flex';
  document.getElementById('delete-account-input').focus();
}
function closeDeleteAccountModal(){
  const modal = document.getElementById('delete-account-modal');
  if (modal) modal.style.display = 'none';
}

async function confirmDeleteAccount(){
  const input = document.getElementById('delete-account-input'), err = document.getElementById('delete-account-error'), yes = document.getElementById('delete-account-yes');
  const typed = input.value.trim();
  if (!CURRENT_USER || typed.toLowerCase() !== String(CURRENT_USER.email || '').toLowerCase()){ err.textContent = t('accountDelete.err.mismatch'); return; }
  yes.disabled = true; err.textContent = '';
  const { data, error } = await supabaseClient.functions.invoke('delete-my-account', { body: { confirm_email: typed } });
  let code = data && data.error;
  if (error && !code){ try { const b = await error.context.json(); code = b && b.error; } catch (e) {} }
  if (!error && data && data.ok){
    closeDeleteAccountModal();
    if (typeof showToast === 'function') showToast(t('accountDelete.done'));
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    setTimeout(() => location.reload(), 800);
    return;
  }
  err.textContent = code === 'not_allowed_for_teachers' ? t('accountDelete.err.teacher') : code === 'confirm_mismatch' ? t('accountDelete.err.mismatch') : t('accountDelete.err.generic');
  yes.disabled = false;
}

(function wireDeleteAccount(){
  const open = document.getElementById('delete-account-open');
  if (!open) return;
  open.addEventListener('click', openDeleteAccountModal);
  document.getElementById('delete-account-close').addEventListener('click', closeDeleteAccountModal);
  document.getElementById('delete-account-cancel').addEventListener('click', closeDeleteAccountModal);
  document.getElementById('delete-account-input').addEventListener('input', (e) => {
    document.getElementById('delete-account-yes').disabled = e.target.value.trim().toLowerCase() !== String((CURRENT_USER && CURRENT_USER.email) || '').toLowerCase() || !e.target.value.trim();
  });
  document.getElementById('delete-account-yes').addEventListener('click', confirmDeleteAccount);
})();
