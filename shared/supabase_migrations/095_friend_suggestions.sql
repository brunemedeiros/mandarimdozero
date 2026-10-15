-- 095 -- Sugestões de amigos sem usar a agenda do celular (2026-10-15).
--
-- Decisões da autora (docs/amigos-seguir-x-amizade.md, 2026-10-14): manter amizade com pedido e aceite e sugerir:
--   1. quem entrou pelo seu link de convite / quem te convidou           motivos 'invite' / 'invited_by'
--   2. colegas da mesma professora ou da mesma turma do Mural             motivo 'classmate'
--   3. amigos de amigos ("2 amigos em comum")                             motivo 'mutual'
--   4. parceiros de estudo: mesmo idioma estudado na semana, perfil público   motivo 'partner'
--   5. quem ficou perto de você no ranking geral da semana, perfil público    motivo 'ranking'
-- (o QR code do convite é só tela; usa o mesmo link)
--
-- Privacidade:
--   - friend_settings.suggest_me (padrão: ligado): desligado, a pessoa não aparece nas sugestões dos outros
--     (exceto para quem ela mesma convidou ou quem a convidou).
--   - parceiros e ranking só sugerem perfis públicos; foto só de perfil público (ou com acesso completo, 080).
--   - fora: eu mesma, quem já é amigo ou tem pedido aberto, pedido recusado nos últimos 30 dias, quem não aceita
--     pedidos (accept_requests = false), professora e aluno entre si, e quem eu dispensei no X.
-- Tabelas sem policy (só pelas funções). Sem DROP.
-- ROLLBACK: drop function friend_suggestions(int), dismiss_friend_suggestion(uuid), record_friend_invite(text);
--           drop table friend_suggestion_dismissals, friend_invites; alter table friend_settings drop column suggest_me.

alter table public.friend_settings add column if not exists suggest_me boolean not null default true;

create table if not exists public.friend_suggestion_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, target_id)
);
alter table public.friend_suggestion_dismissals enable row level security;
revoke all on public.friend_suggestion_dismissals from anon, authenticated;

create table if not exists public.friend_invites (
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (inviter_id, invitee_id),
  constraint friend_invites_not_self check (inviter_id <> invitee_id)
);
create index if not exists friend_invites_invitee_idx on public.friend_invites (invitee_id);
alter table public.friend_invites enable row level security;
revoke all on public.friend_invites from anon, authenticated;

-- Quem abriu o link de convite (?amigo=usuario) já logado grava de quem veio o convite. Idempotente.
create or replace function public.record_friend_invite(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_inviter uuid;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select p.user_id into v_inviter from profiles p where p.username = lower(btrim(coalesce(p_username, '')));
  if v_inviter is null or v_inviter = v_me then return jsonb_build_object('ok', false); end if;
  insert into friend_invites (inviter_id, invitee_id) values (v_inviter, v_me) on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.record_friend_invite(text) from public, anon;
grant execute on function public.record_friend_invite(text) to authenticated;

-- X no cartão: a pessoa some das minhas sugestões.
create or replace function public.dismiss_friend_suggestion(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_user is null or p_user = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  insert into friend_suggestion_dismissals (user_id, target_id) values (v_me, p_user)
  on conflict (user_id, target_id) do update set dismissed_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.dismiss_friend_suggestion(uuid) from public, anon;
grant execute on function public.dismiss_friend_suggestion(uuid) to authenticated;

-- Sugestões, uma linha por pessoa, com o motivo mais forte e quantos amigos em comum.
create or replace function public.friend_suggestions(p_limit int default 12)
returns table(user_id uuid, username text, display_name text, avatar_url text, reason text,
              mutual_count int, language_app_key text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  v_my_xp int;
begin
  if v_me is null then return; end if;
  select coalesce(sum(w.amount), 0)::int into v_my_xp from weekly_xp w where w.user_id = v_me and w.week_start = v_week;

  return query
  with my_friends as (
    select case when f.requester_id = v_me then f.addressee_id else f.requester_id end as uid
    from friendships f where f.status = 'accepted' and (f.requester_id = v_me or f.addressee_id = v_me)
  ),
  invites as (
    select i.invitee_id as uid, 'invite'::text as why from friend_invites i where i.inviter_id = v_me
    union select i.inviter_id, 'invited_by' from friend_invites i where i.invitee_id = v_me
  ),
  classmates as (
    select t2.student_id as uid
    from teacher_students t1
    join teacher_students t2 on t2.teacher_id = t1.teacher_id and t2.status = 'active'
    where t1.student_id = v_me and t1.status = 'active'
    union
    select m2.student_id
    from classroom_members m1
    join classroom_members m2 on m2.classroom_id = m1.classroom_id
    where m1.student_id = v_me
  ),
  mutuals as (
    select case when f.requester_id = mf.uid then f.addressee_id else f.requester_id end as uid, count(*)::int as n
    from my_friends mf
    join friendships f on f.status = 'accepted' and (f.requester_id = mf.uid or f.addressee_id = mf.uid)
    group by 1
  ),
  my_langs as (
    select distinct w.language_app_key from weekly_xp w
    where w.user_id = v_me and w.week_start >= v_week - 7 and w.amount > 0
  ),
  partners as (
    select w.user_id as uid, min(w.language_app_key) as lang
    from weekly_xp w join my_langs ml on ml.language_app_key = w.language_app_key
    where w.week_start >= v_week - 7 and w.amount > 0
    group by w.user_id
  ),
  near as (
    select w.user_id as uid from weekly_xp w
    where w.week_start = v_week and v_my_xp > 0
    group by w.user_id
    having sum(w.amount) > 0 and abs(sum(w.amount) - v_my_xp) <= greatest(50, v_my_xp * 0.3)
  ),
  cand as (
    select iv.uid, iv.why as reason, 100 as score, null::text as lang from invites iv
    union all select uid, 'classmate', 80, null from classmates
    union all select uid, 'mutual', 50 + least(n, 20), null from mutuals
    union all select uid, 'partner', 20, lang from partners
    union all select uid, 'ranking', 15, null from near
  ),
  best as (
    select distinct on (c.uid) c.uid, c.reason, c.score, c.lang
    from cand c
    order by c.uid, c.score desc
  )
  select b.uid, p.username, p.display_name,
    case when p.public_profile or _profile_full_access(b.uid) then p.avatar_url else null end,
    b.reason, coalesce(mu.n, 0), b.lang
  from best b
  join profiles p on p.user_id = b.uid
  left join mutuals mu on mu.uid = b.uid
  left join friend_settings fs on fs.user_id = b.uid
  where b.uid <> v_me
    and p.username is not null
    and coalesce(fs.accept_requests, true)
    and (b.reason in ('invite', 'invited_by') or coalesce(fs.suggest_me, true))
    and (b.reason not in ('partner', 'ranking') or p.public_profile)
    and not exists (select 1 from friendships f
      where ((f.requester_id = v_me and f.addressee_id = b.uid) or (f.requester_id = b.uid and f.addressee_id = v_me))
        and (f.status in ('pending', 'accepted') or (f.status = 'declined' and coalesce(f.responded_at, f.requested_at) > now() - interval '30 days')))
    and not exists (select 1 from friend_suggestion_dismissals d where d.user_id = v_me and d.target_id = b.uid)
    and not exists (select 1 from teacher_students t where t.status in ('active', 'invited')
      and ((t.teacher_id = v_me and t.student_id = b.uid) or (t.teacher_id = b.uid and t.student_id = v_me)))
  order by b.score desc, coalesce(mu.n, 0) desc, md5(b.uid::text || v_week::text)
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
end;
$$;
revoke all on function public.friend_suggestions(int) from public, anon;
grant execute on function public.friend_suggestions(int) to authenticated;
