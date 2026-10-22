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

// ---------- Plano da conta = tabela Admin > Planos (Etapa 5, decisões da dona de 2026-10-22) ----------
// Fonte única para tudo que é Grátis x Premium x Aluno no site: a resposta de my_permissions() (075 + 116), que
// já soma os papéis ativos (Premium Basic/Pro, Professora, Aluno pelo vínculo ativo) com o valor mais permissivo.
// Nada de plan_tier nem de "aluno vinculado" fixo no código: mudar a célula da tabela muda o site.
// A admin com o Admin Mode DESLIGADO vê o site como uma conta grátis (linha Grátis, `free`); com ele LIGADO, tudo.
// Antes de carregar (ou se o RPC falhar) ninguém ganha nada por engano: planCan() = false e planLimit() = undefined
// (quem conta cartões usa então a reserva FREE_OWN_FLASHCARD_LIMIT, o mesmo número da linha Grátis de hoje).
function planPermissionSource(){
  const admin = typeof isAdminUser === 'function' && isAdminUser();
  if (admin){
    const profile = typeof PROFILE_CACHE !== 'undefined' ? PROFILE_CACHE : null;
    if (!profile || profile.admin_mode !== false) return 'all';
    return (MY_PERMISSIONS && MY_PERMISSIONS.free) || {};
  }
  return (MY_PERMISSIONS && MY_PERMISSIONS.permissions) || {};
}

// true se a conta tem a permissão ligada (tipos de cartão, Decks públicos, Desafios, Jogos, pular unidades...).
function planCan(key){
  const src = planPermissionSource();
  if (src === 'all') return true;
  return !!(src[key] && src[key].enabled);
}

// Limite numérico da permissão: null = sem limite; 0 = sem acesso; número = teto; undefined = ainda não se sabe.
function planLimit(key){
  const src = planPermissionSource();
  if (src === 'all') return null;
  const p = src[key];
  if (!p) return undefined;
  if (!p.enabled) return 0;
  return p.limit === undefined ? null : p.limit;
}

async function loadPlanPermissions(force){ await loadMyPermissions(force); return MY_PERMISSIONS; }

// ---------- "Fale com a Prof. Brune" (decisão 6 da dona: o Premium se pede só por e-mail) ----------
// Abre o e-mail da professora com assunto e texto já preenchidos com o @ da pessoa e o curso, no idioma do site.
const PREMIUM_CONTACT_EMAIL = 'brunemed1310@gmail.com';
function premiumContactMailto(){
  const tt = (k, p) => (typeof t === 'function' ? t(k, p) : k);
  const profile = typeof PROFILE_CACHE !== 'undefined' ? PROFILE_CACHE : null;
  const username = profile && profile.username ? '@' + profile.username : '';
  const appKey = typeof APP_KEY !== 'undefined' ? APP_KEY : '';
  const courseKey = 'review.deck.lang.' + appKey;
  const course = appKey && tt(courseKey) !== courseKey ? tt(courseKey) : appKey;
  const subject = tt('premiumContact.subject', { course });
  const body = tt('premiumContact.body', { username: username || tt('premiumContact.noUsername'), course });
  return 'mailto:' + PREMIUM_CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
// Botão do aviso Premium/Limite. O href é montado na hora (o @ e o idioma do site podem mudar).
function premiumContactButtonHTML(){
  const tt = (k) => (typeof t === 'function' ? t(k) : k);
  const esc = (s) => (typeof escapeHTML === 'function' ? escapeHTML(String(s)) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  return `<a class="btn btn-primary btn-block premium-contact-btn" data-premium-contact href="${esc(premiumContactMailto())}">📧 ${esc(tt('premiumContact.button'))}</a>`;
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
