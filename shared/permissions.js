// ---------- Papéis e permissões da conta logada (migration 075) ----------
// Fonte da verdade é o banco: my_permissions() devolve os papéis ativos
// (user, student, premium_basic, premium_pro, teacher), se a conta é admin e
// cada permissão {enabled, limit}. O cliente só usa isto para decidir o que
// MOSTRAR; quem libera ou barra de verdade são as policies/RPCs (075/076).
//
// Depende de: shared/supabase-client.js (supabaseClient), shared/auth.js
// (CURRENT_USER). isAdminUser() vem de <lang>/app.js.

let MY_PERMISSIONS = null;      // { roles:[], admin:bool, permissions:{key:{enabled,limit}} }
let MY_PERMISSIONS_PROMISE = null;

async function loadMyPermissions(force){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) { MY_PERMISSIONS = null; return null; }
  if (MY_PERMISSIONS && !force) return MY_PERMISSIONS;
  if (MY_PERMISSIONS_PROMISE && !force) return MY_PERMISSIONS_PROMISE;
  MY_PERMISSIONS_PROMISE = (async () => {
    try {
      const { data, error } = await supabaseClient.rpc('my_permissions');
      if (error || !data || typeof data !== 'object') throw error || new Error('sem dados');
      MY_PERMISSIONS = data;
    } catch (e) {
      // Sem o RPC (rede fora, banco antigo): só a admin por e-mail continua
      // vendo o painel; ninguém ganha permissão por engano.
      const admin = typeof isAdminUser === 'function' && isAdminUser();
      MY_PERMISSIONS = { roles: admin ? ['user', 'teacher'] : ['user'], admin, permissions: {} };
    } finally {
      MY_PERMISSIONS_PROMISE = null;
    }
    return MY_PERMISSIONS;
  })();
  return MY_PERMISSIONS_PROMISE;
}

function clearMyPermissions(){ MY_PERMISSIONS = null; MY_PERMISSIONS_PROMISE = null; }

function hasMyRole(role){ return !!(MY_PERMISSIONS && Array.isArray(MY_PERMISSIONS.roles) && MY_PERMISSIONS.roles.includes(role)); }

// Professora = papel teacher ou admin (a admin sempre é professora também).
function isTeacherUser(){
  if (typeof isAdminUser === 'function' && isAdminUser()) return true;
  return !!(MY_PERMISSIONS && (MY_PERMISSIONS.admin || hasMyRole('teacher')));
}

function hasPermission(key){
  if (typeof isAdminUser === 'function' && isAdminUser()) return true;
  return !!(MY_PERMISSIONS && MY_PERMISSIONS.permissions && MY_PERMISSIONS.permissions[key] && MY_PERMISSIONS.permissions[key].enabled);
}

// Mostra/esconde a navegação que depende de papel (não do Admin Mode):
// .teacher-only-nav = Painel da professora (sidebar + menu do avatar).
// Material de apoio e Aulas do aluno dependem de existir conteúdo e ficam
// por conta de refreshStudentTeacherNav().
async function applyRoleNavUI(){
  await loadMyPermissions();
  const teacher = isTeacherUser();
  document.querySelectorAll('.teacher-only-nav').forEach(el => { el.style.display = teacher ? '' : 'none'; });
  if (typeof refreshStudentTeacherNav === 'function') refreshStudentTeacherNav();
  if (typeof refreshTeacherBell === 'function') refreshTeacherBell(); // sino da professora (105)
}
