-- 077 -- Convite de aluno pela professora + badge por professora + 1 professora por aluno por idioma.
-- Plano: docs/plano-professora-privacidade.md (decisões da autora 2026-10-12).
--
-- Fluxo:
--   * Professora convida uma conta (teacher_invite_student): vínculo com status 'invited', vale 14 dias,
--     notificação no sino do aluno. Limite de 30 convites por dia por professora.
--   * Aluno aceita ou recusa (respond_teacher_invite). Aceitar = 'active'; recusar = 'removed'. A professora é avisada.
--   * Link de convite (teacher_invite_link): código por professora e idioma. Quem abre o link e aceita vira aluno
--     na hora (accept_invite_code). invite_code_info mostra o cartão do convite (também sem login).
--   * Só a professora desvincula (policy da 076); o aluno não sai sozinho.
--   * Badge: cada professora tem o seu no catálogo ("Aluno/a do/a Prof. {nome}"; o da autora continua
--     "Aluno/a da Prof. Brune", id 'student'). Entra quando o vínculo fica ativo e SAI quando não há mais vínculo
--     ativo com aquela professora (trigger em teacher_students; vale também para o vínculo direto da admin).
--   * Um aluno tem no máximo 1 professora ativa por idioma (índice único parcial).
--
-- Dados: adiciona colunas/tabelas novas; marca o badge 'student' como o da autora (teacher_id). Nenhum vínculo
-- ou badge existente muda (conferido em 2026-10-12: 13 vínculos ativos, 13 badges 'student', 0 duplicados).
-- Desfazer (manual): remover trigger, funções, tabelas teacher_invite_codes/teacher_invite_log, o índice e as colunas.

-- ---------- Estrutura ----------
alter table public.teacher_students add column if not exists invited_at timestamptz null;
alter table public.teacher_students add column if not exists responded_at timestamptz null;

create unique index if not exists teacher_students_one_active_teacher_per_lang
  on public.teacher_students (student_id, language_app_key) where status = 'active';

alter table public.badge_catalog add column if not exists teacher_id uuid null references auth.users(id) on delete set null;
create unique index if not exists badge_catalog_teacher_id_key on public.badge_catalog (teacher_id) where teacher_id is not null;
update public.badge_catalog set teacher_id = (select id from auth.users where email = 'brunemed1310@gmail.com')
 where id = 'student' and teacher_id is null;

create table if not exists public.teacher_invite_codes (
  code text primary key check (code ~ '^[a-z0-9]{10}$'),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);
create unique index if not exists teacher_invite_codes_one_live
  on public.teacher_invite_codes (teacher_id, language_app_key) where revoked_at is null;
alter table public.teacher_invite_codes enable row level security;

create table if not exists public.teacher_invite_log (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null,
  sent_at timestamptz not null default now()
);
alter table public.teacher_invite_log enable row level security;
-- Sem policies: só as funções abaixo (security definer) leem/gravam essas duas tabelas.
revoke all on public.teacher_invite_codes, public.teacher_invite_log from anon, authenticated;

-- ---------- Helpers internos ----------
create or replace function public._teacher_display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(display_name), ''), username, 'Professora') from public.profiles where user_id = p_user
$$;

-- Badge da professora: cria na primeira vez ("Aluno/a do/a Prof. {primeiro nome}", até 40 letras).
create or replace function public._teacher_badge_id(p_teacher uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text; v_name text;
begin
  select id into v_id from public.badge_catalog where teacher_id = p_teacher;
  if v_id is not null then return v_id; end if;
  v_id := 'student_' || substr(replace(p_teacher::text, '-', ''), 1, 24);
  v_name := left('Aluno/a do/a Prof. ' || split_part(btrim(public._teacher_display_name(p_teacher)), ' ', 1), 40);
  insert into public.badge_catalog (id, name, icon, description, created_by, teacher_id)
  values (v_id, v_name, '🎓', 'Aluno/a com vínculo ativo com esta professora.', 'convite', p_teacher)
  on conflict (id) do update set teacher_id = excluded.teacher_id;
  return v_id;
end $$;

create or replace function public._teacher_notify(p_user uuid, p_lang text, p_category text, p_event text, p_body text, p_tab text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_lang not in ('frances', 'mandarim') then return; end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
  values (p_user, p_lang, p_category, p_event, null, p_body, p_tab);
end $$;

create or replace function public._lang_label(p_lang text)
returns text language sql immutable as $$
  select case p_lang when 'frances' then 'francês' when 'mandarim' then 'chinês' when 'portugues' then 'português' else p_lang end
$$;

revoke execute on function public._teacher_display_name(uuid), public._teacher_badge_id(uuid),
  public._teacher_notify(uuid, text, text, text, text, text) from public, anon, authenticated;

-- ---------- Badge acompanha o vínculo ----------
create or replace function public._teacher_students_badge_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_badge text;
begin
  if (tg_op in ('INSERT', 'UPDATE')) and new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    v_badge := public._teacher_badge_id(new.teacher_id);
    insert into public.badge_grants (user_id, badge_id, granted_by, note)
    values (new.student_id, v_badge, 'vinculo', 'Vínculo ativo com a professora')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if (tg_op in ('UPDATE', 'DELETE')) and old.status = 'active'
     and (tg_op = 'DELETE' or new.status is distinct from 'active') then
    if not exists (select 1 from public.teacher_students t
                    where t.teacher_id = old.teacher_id and t.student_id = old.student_id and t.status = 'active'
                      and (tg_op = 'DELETE' or t.id <> old.id)) then
      delete from public.badge_grants g
       using public.badge_catalog c
       where c.teacher_id = old.teacher_id and g.badge_id = c.id and g.user_id = old.student_id;
    end if;
  end if;
  return null;
end $$;
revoke execute on function public._teacher_students_badge_sync() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_teacher_students_badge_sync') then
    create trigger trg_teacher_students_badge_sync after insert or update of status or delete on public.teacher_students
      for each row execute function public._teacher_students_badge_sync();
  end if;
end $$;

-- A professora só pode mudar o vínculo para 'removed' (cancelar convite / desvincular). Antes (076) podia gravar
-- qualquer status <> 'active', o que deixava criar 'invited' sem passar pela RPC (sem limite e sem aviso).
alter policy teacher_students_teacher_update on public.teacher_students
  using (auth.uid() = teacher_id and public.is_teacher())
  with check (auth.uid() = teacher_id and public.is_teacher() and status = 'removed');

-- ---------- Convite por busca ----------
create or replace function public.teacher_invite_student(p_student uuid, p_lang text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_row public.teacher_students%rowtype; v_existing boolean;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  if p_student is null or p_student = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if not exists (select 1 from public.profiles where user_id = p_student) then return jsonb_build_object('error', 'not_found'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || p_student::text || p_lang, 0));
  if exists (select 1 from public.teacher_students where student_id = p_student and language_app_key = p_lang and status = 'active') then
    return jsonb_build_object('error', case when exists (select 1 from public.teacher_students where student_id = p_student
      and language_app_key = p_lang and status = 'active' and teacher_id = v_me) then 'already_student' else 'student_has_teacher' end);
  end if;
  select * into v_row from public.teacher_students where teacher_id = v_me and student_id = p_student and language_app_key = p_lang;
  v_existing := found;
  if v_existing and v_row.status = 'invited' and v_row.invited_at > now() - interval '14 days' then
    return jsonb_build_object('error', 'already_invited');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tinvlog:' || v_me::text, 0));
  if (select count(*) from public.teacher_invite_log where teacher_id = v_me and sent_at > now() - interval '24 hours') >= 30 then
    return jsonb_build_object('error', 'daily_invite_limit');
  end if;
  insert into public.teacher_invite_log (teacher_id, student_id) values (v_me, p_student);
  if v_existing then
    update public.teacher_students set status = 'invited', invited_at = now(), responded_at = null where id = v_row.id;
  else
    insert into public.teacher_students (teacher_id, student_id, language_app_key, status, invited_at)
    values (v_me, p_student, p_lang, 'invited', now());
  end if;
  perform public._teacher_notify(p_student, p_lang, 'sistema', 'teacher_invite',
    public._teacher_display_name(v_me) || ' te convidou para ser aluno/a de ' || public._lang_label(p_lang) || ' 🎓', 'path');
  return jsonb_build_object('ok', true, 'status', 'invited');
end $$;

-- Convites pendentes do aluno logado (só os que ainda valem).
create or replace function public.my_teacher_invites()
returns table (link_id bigint, teacher_id uuid, teacher_name text, teacher_username text, teacher_avatar text,
               language_app_key text, invited_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.teacher_id, public._teacher_display_name(t.teacher_id), p.username, p.avatar_url, t.language_app_key, t.invited_at
    from public.teacher_students t join public.profiles p on p.user_id = t.teacher_id
   where t.student_id = auth.uid() and t.status = 'invited' and t.invited_at > now() - interval '14 days'
   order by t.invited_at desc
$$;

create or replace function public.respond_teacher_invite(p_link_id bigint, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_row public.teacher_students%rowtype; v_name text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_row from public.teacher_students where id = p_link_id and student_id = v_me for update;
  if not found or v_row.status <> 'invited' or v_row.invited_at <= now() - interval '14 days' then
    return jsonb_build_object('error', 'no_pending_invite');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || v_me::text || v_row.language_app_key, 0));
  v_name := public._teacher_display_name(v_me);
  if p_accept then
    if exists (select 1 from public.teacher_students where student_id = v_me and language_app_key = v_row.language_app_key and status = 'active') then
      return jsonb_build_object('error', 'student_has_teacher');
    end if;
    update public.teacher_students set status = 'active', responded_at = now() where id = v_row.id;
    perform public._teacher_notify(v_row.teacher_id, v_row.language_app_key, 'supervisao', 'teacher_invite_accepted',
      v_name || ' aceitou seu convite e agora é seu aluno/a de ' || public._lang_label(v_row.language_app_key) || ' 🎉', 'teacher-panel');
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;
  update public.teacher_students set status = 'removed', responded_at = now() where id = v_row.id;
  perform public._teacher_notify(v_row.teacher_id, v_row.language_app_key, 'supervisao', 'teacher_invite_declined',
    v_name || ' recusou o convite para as aulas de ' || public._lang_label(v_row.language_app_key) || '.', 'teacher-panel');
  return jsonb_build_object('ok', true, 'status', 'removed');
end $$;

-- ---------- Convite por link ----------
create or replace function public.teacher_invite_link(p_lang text, p_reset boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_code text;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tcode:' || v_me::text || p_lang, 0));
  if p_reset then
    update public.teacher_invite_codes set revoked_at = now() where teacher_id = v_me and language_app_key = p_lang and revoked_at is null;
  end if;
  select code into v_code from public.teacher_invite_codes where teacher_id = v_me and language_app_key = p_lang and revoked_at is null;
  if v_code is null then
    loop
      -- gen_random_uuid() é do core (sem depender do pgcrypto no schema extensions).
      v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      exit when not exists (select 1 from public.teacher_invite_codes where code = v_code);
    end loop;
    insert into public.teacher_invite_codes (code, teacher_id, language_app_key) values (v_code, v_me, p_lang);
  end if;
  return jsonb_build_object('ok', true, 'code', v_code);
end $$;

-- Cartão do convite (funciona sem login: mostra só nome/@/foto da professora e o idioma).
create or replace function public.invite_code_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('teacher_name', public._teacher_display_name(c.teacher_id),
            'teacher_username', p.username, 'teacher_avatar', p.avatar_url, 'language_app_key', c.language_app_key)
     from public.teacher_invite_codes c join public.profiles p on p.user_id = c.teacher_id
    where c.code = lower(btrim(p_code)) and c.revoked_at is null), jsonb_build_object('error', 'invalid_code'))
$$;

create or replace function public.accept_invite_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_c public.teacher_invite_codes%rowtype; v_row public.teacher_students%rowtype;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_c from public.teacher_invite_codes where code = lower(btrim(p_code)) and revoked_at is null;
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  if v_c.teacher_id = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || v_me::text || v_c.language_app_key, 0));
  if exists (select 1 from public.teacher_students where student_id = v_me and language_app_key = v_c.language_app_key and status = 'active') then
    return jsonb_build_object('error', case when exists (select 1 from public.teacher_students where student_id = v_me
      and language_app_key = v_c.language_app_key and status = 'active' and teacher_id = v_c.teacher_id) then 'already_student' else 'student_has_teacher' end);
  end if;
  select * into v_row from public.teacher_students where teacher_id = v_c.teacher_id and student_id = v_me and language_app_key = v_c.language_app_key;
  if found then
    update public.teacher_students set status = 'active', responded_at = now() where id = v_row.id;
  else
    insert into public.teacher_students (teacher_id, student_id, language_app_key, status, invited_at, responded_at)
    values (v_c.teacher_id, v_me, v_c.language_app_key, 'active', now(), now());
  end if;
  perform public._teacher_notify(v_c.teacher_id, v_c.language_app_key, 'supervisao', 'teacher_invite_accepted',
    public._teacher_display_name(v_me) || ' entrou pelo seu link e agora é seu aluno/a de ' || public._lang_label(v_c.language_app_key) || ' 🎉', 'teacher-panel');
  return jsonb_build_object('ok', true, 'status', 'active', 'language_app_key', v_c.language_app_key);
end $$;

revoke execute on function public.teacher_invite_student(uuid, text), public.my_teacher_invites(),
  public.respond_teacher_invite(bigint, boolean), public.teacher_invite_link(text, boolean),
  public.accept_invite_code(text), public.invite_code_info(text) from public, anon;
grant execute on function public.teacher_invite_student(uuid, text), public.my_teacher_invites(),
  public.respond_teacher_invite(bigint, boolean), public.teacher_invite_link(text, boolean),
  public.accept_invite_code(text), public.invite_code_info(text) to authenticated;
grant execute on function public.invite_code_info(text) to anon;
