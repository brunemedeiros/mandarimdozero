// ---------- Papéis (aluno/professora/admin) -- Fase 1 do sistema de alunos
// particulares (ver CLAUDE.md, auditoria 2026-09-19) ----------
// Primeira peça de um modelo real de "quem é aluno x quem é professora",
// além do teste de igualdade de e-mail hardcoded (isAdminUser(), em
// fr/zh app.js) que era, até aqui, a única forma de "papel" que existia na
// plataforma. Este arquivo só LÊ o papel novo (profiles.role,
// teacher_students) -- não substitui isAdminUser() em nenhum call site
// existente, decisão registrada explicitamente como fora do escopo desta
// fase.
//
// Depende de (carregado na mesma posição de shared/admin-badges.js --
// antes de app.js, só referencia globals dentro de função):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/profile.js         (ensureProfileLoaded, PROFILE_CACHE,
//                                 slugifyUsername)

// `role` vem de graça no `select('*')` que ensureProfileLoaded() já faz --
// sem round-trip extra.
async function fetchMyRole(){
  const profile = await ensureProfileLoaded();
  return profile?.role || 'student';
}

function isTeacherOrAdmin(){
  return PROFILE_CACHE?.role === 'teacher' || PROFILE_CACHE?.role === 'admin';
}

// Todos os vínculos da professora logada, com username/display_name da
// aluna já resolvidos -- mesmo padrão de fetchAllGrantsWithUsernames()
// (admin-badges.js): teacher_students e profiles não têm FK direta entre
// si, então o join é feito aqui em JS.
async function fetchMyStudents(){
  if (!CURRENT_USER) return [];
  const { data: links, error } = await supabaseClient
    .from('teacher_students')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar alunos:', error); return []; }
  if (!links?.length) return [];
  const studentIds = [...new Set(links.map(l => l.student_id))];
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name')
    .in('user_id', studentIds);
  const byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  return links.map(l => ({ ...l, username: byId[l.student_id]?.username, display_name: byId[l.student_id]?.display_name }));
}

// Vincula uma aluna (por @username) à professora logada, num idioma
// específico -- cada aluno vale pra exatamente 1 idioma (decisão
// registrada no CLAUDE.md), então language_app_key é obrigatório, não um
// vínculo "geral" da conta.
async function assignStudentToTeacher(studentUsername, languageAppKey){
  const clean = slugifyUsername(studentUsername);
  if (!clean) return { ok: false, error: 'Digite o @username da aluna.' };
  if (!['frances', 'mandarim', 'portugues'].includes(languageAppKey)){
    return { ok: false, error: 'Idioma inválido.' };
  }
  const target = await resolveProfileByUsername(clean);
  if (!target) return { ok: false, error: 'Não achei ninguém com esse @username. Confira a grafia.' };
  if (target.user_id === CURRENT_USER?.id) return { ok: false, error: 'Você não pode se atribuir como sua própria aluna.' };
  const { error } = await supabaseClient
    .from('teacher_students')
    .insert({ teacher_id: CURRENT_USER.id, student_id: target.user_id, language_app_key: languageAppKey });
  if (error){
    if (error.code === '23505') return { ok: false, error: `@${target.username} já é sua aluna nesse idioma.` };
    console.error('Erro ao vincular aluna:', error);
    return { ok: false, error: 'Não foi possível vincular agora.' };
  }
  // Pedido da autora (ver CLAUDE.md) -- toda aluna vinculada ganha o badge
  // "Aluno/a da Prof. Brune" (badge_catalog, id='student') automaticamente,
  // sem precisar de uma segunda ação manual em "🎖️ Badges". `on conflict`
  // não existe aqui (insert simples), então o erro 23505 (já tem o badge --
  // ex: vínculo num segundo idioma pra quem já era aluna em outro) é
  // esperado e ignorado, não um erro de verdade. Nunca falha o vínculo por
  // causa disto -- a aluna já foi vinculada com sucesso acima, um problema
  // no badge não deveria desfazer isso nem aparecer como erro pra autora.
  const { error: badgeError } = await supabaseClient
    .from('badge_grants')
    .insert({ user_id: target.user_id, badge_id: 'student', granted_by: CURRENT_USER?.email || null, note: 'Concedido automaticamente ao vincular como aluno(a)' });
  if (badgeError && badgeError.code !== '23505'){
    console.error('Erro ao conceder badge de aluno automaticamente:', badgeError);
  }
  return { ok: true, target };
}

async function removeStudentLink(linkId){
  const { error } = await supabaseClient.from('teacher_students').delete().eq('id', linkId);
  return { ok: !error };
}

// Fase 5.1 do sistema de alunas particulares (ver CLAUDE.md, seção
// "limite de cartões próprios") -- checa se a conta logada tem pelo menos
// um vínculo ATIVO como aluna de alguma professora (teacher_students,
// status='active'). Usado por shared/my-flashcards.js como o eixo "aluno x
// não-aluno" que decide se o limite de quantidade de "Meus Cartões" se
// aplica: aluna vinculada a uma professora tem cartões ilimitados, o resto
// (hoje a maioria das contas) tem o teto do plano grátis. Não substitui
// fetchMyRole()/isTeacherOrAdmin() -- eixo diferente (vínculo, não papel).
async function hasActiveTeacherLink(){
  if (!CURRENT_USER) return false;
  const { data, error } = await supabaseClient
    .from('teacher_students')
    .select('id')
    .eq('student_id', CURRENT_USER.id)
    .eq('status', 'active');
  if (error){ console.error('Erro ao checar vínculo com professora:', error); return false; }
  return (data || []).length > 0;
}

// ---------- Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md,
// grillado em 3 rodadas) ----------
// Eixo NOVO e SEPARADO de hasActiveTeacherLink() acima -- vínculo com
// professora continua isentando do teto de QUANTIDADE de cartões próprios
// (Fase 5.1, sem mudança). `plan_tier` decide uma coisa diferente: se a
// conta pode usar os formatos RICOS (imagem/áudio/múltipla escolha/
// completar frase) em cartão próprio -- hoje exclusivos de cartão de
// professora (Fase 8a/8c). Uma conta pode ter as duas isenções, uma só, ou
// nenhuma -- não são a mesma coisa, mesmo que as duas acabem "desbloqueando
// coisa" pra quantidade/qualidade de Meus Cartões.
async function fetchMyPlanTier(){
  const profile = await ensureProfileLoaded();
  return profile?.plan_tier || 'free';
}

function isPremium(){
  return PROFILE_CACHE?.plan_tier === 'premium';
}

// Ativação/remoção manual do Premium -- sem checkout Stripe real nesta
// entrega (escopo travado no grilling: "só infraestrutura por enquanto").
// Só quem já é admin pode chamar isto (gate de UI em shared/admin-users.js,
// RLS de profiles continua exigindo o mesmo e-mail admin pra UPDATE, mesmo
// padrão de todo campo administrativo já existente -- ver migration 023).
async function setPlanTier(userId, tier){
  if (!['free', 'premium'].includes(tier)) return { ok: false, error: 'Plano inválido.' };
  const { error } = await supabaseClient.from('profiles').update({ plan_tier: tier }).eq('user_id', userId);
  if (error){ console.error('Erro ao mudar plano:', error); return { ok: false, error: 'Não foi possível mudar o plano agora.' }; }
  return { ok: true };
}

// Busca QUALQUER conta registrada por @username -- diferente de
// fetchMyStudents() (só as vinculadas como aluno formal), Premium se
// aplica a qualquer perfil (decisão do grilling: "qualquer conta
// registrada", não só quem tem vínculo pedagógico com uma professora).
// Select próprio (não reaproveita resolveProfileByUsername de
// admin-badges.js) porque precisa de `plan_tier` junto -- os outros
// chamadores daquela função não precisam desse campo, evitar carregar
// dado extra que ninguém mais usa.
async function searchAnyProfileByUsername(username){
  const clean = slugifyUsername(username);
  if (!clean) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name, plan_tier')
    .eq('username', clean)
    .maybeSingle();
  if (error){ console.error('Erro ao buscar usuário:', error); return null; }
  return data;
}
