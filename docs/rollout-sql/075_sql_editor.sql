begin;
set local lock_timeout = '10s';
-- 075 -- Papéis somados + matriz de permissões por papel (etapa 1 do plano Professora,
-- docs/plano-professora-privacidade.md).
--
-- Modelo (decisões da autora, 2026-10-07):
--   * Toda conta tem o papel 'user'. 'student' é DERIVADO (vínculo ativo em teacher_students), nunca gravado.
--   * 'premium_basic', 'premium_pro' e 'teacher' são planos: ganhos por assinatura (source='subscription') ou
--     concedidos pela admin (source='grant'); perdem-se ao fim da assinatura (expires_at) ou por revogação.
--   * 'admin' só para a autora (nunca concedido por RPC). O e-mail da autora continua valendo como reserva em
--     is_admin(), para ela nunca ficar sem acesso.
--   * Permissões = SOMA dos papéis: booleano vale se qualquer papel ativo liga; limite numérico = o maior
--     (NULL = ilimitado). Admin tem tudo.
--
-- O que esta migration NÃO faz (fica para a 076): trocar policies/RPCs existentes para usar estes helpers.
-- Nada aqui muda o comportamento atual do site.
--
-- Dados gravados (explícito, não silencioso):
--   * account_roles: autora -> admin, teacher, premium_basic; toda conta com plan_tier='premium' -> premium_basic.
--   * permission_catalog e role_permissions com os valores de hoje (alunos = mesmo nível do Premium Basic,
--     decisão da autora 2026-10-08).
-- profiles.plan_tier e profiles.role passam a ser ESPELHO mantido por admin_grant_role/admin_revoke_role
-- (o código antigo ainda lê plan_tier até a 076 e a troca do JS).
--
-- Aditiva e idempotente; nenhuma remoção de objeto.
-- Desfazer (manual): remover as funções abaixo e as tabelas role_permissions, permission_catalog, account_roles.

-- ---------- Tabelas ----------
create table if not exists public.account_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'premium_basic', 'premium_pro')),
  source text not null default 'grant' check (source in ('grant', 'subscription')),
  granted_by uuid null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz null,
  primary key (user_id, role)
);
alter table public.account_roles enable row level security;

create table if not exists public.permission_catalog (
  key text primary key,
  kind text not null check (kind in ('bool', 'limit')),
  label_pt text not null,
  sort int not null default 0
);
alter table public.permission_catalog enable row level security;

create table if not exists public.role_permissions (
  role text not null check (role in ('user', 'student', 'premium_basic', 'premium_pro', 'teacher')),
  permission_key text not null references public.permission_catalog(key) on delete cascade,
  enabled boolean not null default false,
  limit_value int null check (limit_value is null or limit_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (role, permission_key)
);
alter table public.role_permissions enable row level security;

-- ---------- Leitura (escrita só por RPC) ----------
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='account_roles' and policyname='account_roles_owner_select') then
    create policy account_roles_owner_select on public.account_roles for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='permission_catalog' and policyname='permission_catalog_public_select') then
    create policy permission_catalog_public_select on public.permission_catalog for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='role_permissions' and policyname='role_permissions_public_select') then
    create policy role_permissions_public_select on public.role_permissions for select to anon, authenticated using (true);
  end if;
end $$;
revoke insert, update, delete on public.account_roles, public.permission_catalog, public.role_permissions from anon, authenticated;

-- ---------- Helpers internos (por usuário; sem EXECUTE para clientes) ----------
create or replace function public._is_admin_uid(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_uid is not null and (
    exists (select 1 from public.account_roles r
             where r.user_id = p_uid and r.role = 'admin' and (r.expires_at is null or r.expires_at > now()))
    or (p_uid = auth.uid() and coalesce(auth.jwt()->>'email', '') = 'brunemed1310@gmail.com')
  );
$$;

create or replace function public._account_role_keys(p_uid uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select case when p_uid is null then array[]::text[] else
    array['user']
    || case when exists (select 1 from public.teacher_students ts where ts.student_id = p_uid and ts.status = 'active')
            then array['student'] else array[]::text[] end
    || coalesce((select array_agg(r.role order by r.role) from public.account_roles r
                  where r.user_id = p_uid and r.role <> 'admin' and (r.expires_at is null or r.expires_at > now())),
                array[]::text[])
  end;
$$;

create or replace function public._has_permission(p_uid uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_uid is not null and (
    public._is_admin_uid(p_uid)
    or exists (select 1 from public.role_permissions rp
                where rp.permission_key = p_key and rp.enabled and rp.role = any(public._account_role_keys(p_uid)))
  );
$$;

-- NULL = ilimitado; 0 = sem acesso.
create or replace function public._permission_limit(p_uid uuid, p_key text)
returns int language plpgsql stable security definer set search_path = public as $$
declare v_any boolean; v_unlimited boolean; v_max int;
begin
  if p_uid is null then return 0; end if;
  if public._is_admin_uid(p_uid) then return null; end if;
  select count(*) > 0, bool_or(rp.limit_value is null), max(rp.limit_value)
    into v_any, v_unlimited, v_max
    from public.role_permissions rp
   where rp.permission_key = p_key and rp.enabled and rp.role = any(public._account_role_keys(p_uid));
  if not v_any then return 0; end if;
  if v_unlimited then return null; end if;
  return v_max;
end $$;

revoke execute on function public._is_admin_uid(uuid), public._account_role_keys(uuid),
  public._has_permission(uuid, text), public._permission_limit(uuid, text) from public, anon, authenticated;

-- ---------- Helpers da conta logada (para policies e para o cliente) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public._is_admin_uid(auth.uid());
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select public._is_admin_uid(auth.uid()) or 'teacher' = any(public._account_role_keys(auth.uid()));
$$;

create or replace function public.has_permission(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select public._has_permission(auth.uid(), p_key);
$$;

create or replace function public.permission_limit(p_key text)
returns int language sql stable security definer set search_path = public as $$
  select public._permission_limit(auth.uid(), p_key);
$$;

-- Tudo que a interface precisa num só pedido: papéis ativos + cada permissão {enabled, limit}.
create or replace function public.my_permissions()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_perms jsonb;
begin
  if v_uid is null then return jsonb_build_object('roles', '[]'::jsonb, 'admin', false, 'permissions', '{}'::jsonb); end if;
  select coalesce(jsonb_object_agg(c.key, jsonb_build_object(
           'enabled', public._has_permission(v_uid, c.key),
           'limit', case when c.kind = 'limit' then to_jsonb(public._permission_limit(v_uid, c.key)) else 'null'::jsonb end)),
         '{}'::jsonb)
    into v_perms from public.permission_catalog c;
  return jsonb_build_object(
    'roles', to_jsonb(public._account_role_keys(v_uid)),
    'admin', public._is_admin_uid(v_uid),
    'permissions', v_perms);
end $$;

revoke execute on function public.is_admin(), public.is_teacher(), public.has_permission(text),
  public.permission_limit(text), public.my_permissions() from public, anon;
grant execute on function public.is_admin(), public.is_teacher(), public.has_permission(text),
  public.permission_limit(text), public.my_permissions() to authenticated;

-- ---------- Espelho em profiles (plan_tier/role) para o código antigo ----------
create or replace function public._sync_profile_mirror(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_roles text[] := public._account_role_keys(p_uid); v_admin boolean := public._is_admin_uid(p_uid);
begin
  update public.profiles
     set plan_tier = case when v_admin or v_roles && array['premium_basic', 'premium_pro', 'teacher'] then 'premium' else 'free' end,
         role = case when v_admin then 'admin' when 'teacher' = any(v_roles) then 'teacher' else 'user' end
   where user_id = p_uid;
end $$;
revoke execute on function public._sync_profile_mirror(uuid) from public, anon, authenticated;

-- ---------- RPCs da admin ----------
create or replace function public.admin_grant_role(p_user uuid, p_role text, p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_role not in ('teacher', 'premium_basic', 'premium_pro') then raise exception 'invalid_role' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user) then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  insert into public.account_roles (user_id, role, source, granted_by, granted_at, expires_at)
  values (p_user, p_role, 'grant', auth.uid(), now(), p_expires_at)
  on conflict (user_id, role) do update
    set source = 'grant', granted_by = excluded.granted_by, granted_at = excluded.granted_at, expires_at = excluded.expires_at;
  perform public._sync_profile_mirror(p_user);
  return jsonb_build_object('roles', to_jsonb(public._account_role_keys(p_user)));
end $$;

create or replace function public.admin_revoke_role(p_user uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_role not in ('teacher', 'premium_basic', 'premium_pro') then raise exception 'invalid_role' using errcode = '22023'; end if;
  delete from public.account_roles where user_id = p_user and role = p_role;
  perform public._sync_profile_mirror(p_user);
  return jsonb_build_object('roles', to_jsonb(public._account_role_keys(p_user)));
end $$;

create or replace function public.admin_get_account_roles(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'roles', to_jsonb(public._account_role_keys(p_user)),
    'admin', public._is_admin_uid(p_user),
    'grants', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'source', r.source,
                         'granted_at', r.granted_at, 'expires_at', r.expires_at) order by r.role)
                        from public.account_roles r where r.user_id = p_user and r.role <> 'admin'), '[]'::jsonb));
end $$;

create or replace function public.admin_set_role_permission(p_role text, p_key text, p_enabled boolean, p_limit int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_role not in ('user', 'student', 'premium_basic', 'premium_pro', 'teacher') then raise exception 'invalid_role' using errcode = '22023'; end if;
  if not exists (select 1 from public.permission_catalog where key = p_key) then raise exception 'invalid_permission' using errcode = '22023'; end if;
  if p_limit is not null and p_limit < 0 then raise exception 'invalid_limit' using errcode = '22023'; end if;
  insert into public.role_permissions (role, permission_key, enabled, limit_value, updated_at)
  values (p_role, p_key, p_enabled, p_limit, now())
  on conflict (role, permission_key) do update
    set enabled = excluded.enabled, limit_value = excluded.limit_value, updated_at = now();
end $$;

revoke execute on function public.admin_grant_role(uuid, text, timestamptz), public.admin_revoke_role(uuid, text),
  public.admin_get_account_roles(uuid), public.admin_set_role_permission(text, text, boolean, int) from public, anon;
grant execute on function public.admin_grant_role(uuid, text, timestamptz), public.admin_revoke_role(uuid, text),
  public.admin_get_account_roles(uuid), public.admin_set_role_permission(text, text, boolean, int) to authenticated;

-- ---------- Catálogo e matriz inicial (= regras de hoje; só insere o que falta) ----------
insert into public.permission_catalog (key, kind, label_pt, sort) values
  ('own_cards_limit',           'limit', 'Cartões próprios (quantidade)',                         10),
  ('rich_card_formats',         'bool',  'Formatos ricos (imagem, áudio, múltipla escolha, completar frase)', 20),
  ('tts_monthly_quota',         'limit', 'Áudio TTS por campo (por mês)',                          30),
  ('public_deck_import',        'bool',  'Importar Deck público',                                  40),
  ('public_deck_copy_count',    'bool',  'Ver quantas pessoas copiaram meu Deck',                  50),
  ('challenges_premium',        'bool',  'Desafios Premium',                                       60),
  ('trail_skip_locked',         'bool',  'Pular lições da trilha',                                 70),
  ('class_logs_view',           'bool',  'Ver Aulas (o que aconteceu em cada aula)',               80),
  ('support_materials_view',    'bool',  'Ver Material de apoio',                                  90),
  ('teacher_panel',             'bool',  'Menu Professora (alunos, cartões, aulas, materiais)',   100),
  ('teacher_student_analytics', 'bool',  'Analytics do aluno',                                    110),
  ('teacher_board',             'bool',  'Mural para a turma',                                    120)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, enabled, limit_value)
select v.role, v.key, v.enabled, v.lim from (values
  -- user (grátis)
  ('user', 'own_cards_limit', true, 20), ('user', 'rich_card_formats', false, null::int), ('user', 'tts_monthly_quota', false, null),
  ('user', 'public_deck_import', false, null), ('user', 'public_deck_copy_count', false, null), ('user', 'challenges_premium', false, null),
  ('user', 'trail_skip_locked', false, null), ('user', 'class_logs_view', false, null), ('user', 'support_materials_view', false, null),
  ('user', 'teacher_panel', false, null), ('user', 'teacher_student_analytics', false, null), ('user', 'teacher_board', false, null),
  -- student (vínculo ativo) = Premium Basic + o que é de aluno
  ('student', 'own_cards_limit', true, null), ('student', 'rich_card_formats', true, null), ('student', 'tts_monthly_quota', true, 300),
  ('student', 'public_deck_import', true, null), ('student', 'public_deck_copy_count', true, null), ('student', 'challenges_premium', true, null),
  ('student', 'trail_skip_locked', true, null), ('student', 'class_logs_view', true, null), ('student', 'support_materials_view', true, null),
  ('student', 'teacher_panel', false, null), ('student', 'teacher_student_analytics', false, null), ('student', 'teacher_board', false, null),
  -- premium_basic (= Premium de hoje)
  ('premium_basic', 'own_cards_limit', true, null), ('premium_basic', 'rich_card_formats', true, null), ('premium_basic', 'tts_monthly_quota', true, 300),
  ('premium_basic', 'public_deck_import', true, null), ('premium_basic', 'public_deck_copy_count', true, null), ('premium_basic', 'challenges_premium', true, null),
  ('premium_basic', 'trail_skip_locked', false, null), ('premium_basic', 'class_logs_view', false, null), ('premium_basic', 'support_materials_view', false, null),
  ('premium_basic', 'teacher_panel', false, null), ('premium_basic', 'teacher_student_analytics', false, null), ('premium_basic', 'teacher_board', false, null),
  -- premium_pro (começa igual ao Basic; a autora decide o que fica só no Pro)
  ('premium_pro', 'own_cards_limit', true, null), ('premium_pro', 'rich_card_formats', true, null), ('premium_pro', 'tts_monthly_quota', true, 300),
  ('premium_pro', 'public_deck_import', true, null), ('premium_pro', 'public_deck_copy_count', true, null), ('premium_pro', 'challenges_premium', true, null),
  ('premium_pro', 'trail_skip_locked', false, null), ('premium_pro', 'class_logs_view', false, null), ('premium_pro', 'support_materials_view', false, null),
  ('premium_pro', 'teacher_panel', false, null), ('premium_pro', 'teacher_student_analytics', false, null), ('premium_pro', 'teacher_board', false, null),
  -- teacher (Premium + funções de professora)
  ('teacher', 'own_cards_limit', true, null), ('teacher', 'rich_card_formats', true, null), ('teacher', 'tts_monthly_quota', true, 300),
  ('teacher', 'public_deck_import', true, null), ('teacher', 'public_deck_copy_count', true, null), ('teacher', 'challenges_premium', true, null),
  ('teacher', 'trail_skip_locked', false, null), ('teacher', 'class_logs_view', false, null), ('teacher', 'support_materials_view', false, null),
  ('teacher', 'teacher_panel', true, null), ('teacher', 'teacher_student_analytics', true, null), ('teacher', 'teacher_board', true, null)
) as v(role, key, enabled, lim)
on conflict (role, permission_key) do nothing;

-- ---------- Papéis iniciais (explícito) ----------
insert into public.account_roles (user_id, role, source)
select u.id, r.role, 'grant'
  from auth.users u cross join (values ('admin'), ('teacher'), ('premium_basic')) as r(role)
 where u.email = 'brunemed1310@gmail.com'
on conflict (user_id, role) do nothing;

insert into public.account_roles (user_id, role, source)
select p.user_id, 'premium_basic', 'grant' from public.profiles p where p.plan_tier = 'premium'
on conflict (user_id, role) do nothing;
commit;
