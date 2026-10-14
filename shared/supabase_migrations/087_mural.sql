-- 087 -- Mural da professora (Etapa 4 do plano, docs/plano-professora-privacidade.md, decisões de 2026-10-12/13).
--
-- Murais:
--   * Turma (classrooms): a professora cria, põe alunos (ou manda o link da turma). Um mural por turma, visto por
--     todos os alunos da turma. Recado da professora vai para a turma toda ou para UM aluno da turma (só ele vê).
--     Um aluno pode estar em várias turmas da mesma professora. Turma é de um idioma só.
--   * Individual: entre a professora e um aluno (com ou sem turma).
-- Quem posta: a professora (edita e apaga os próprios recados; apaga qualquer post/comentário do mural dela) e o
-- aluno (cria post e comenta; só apaga o que é dele). Aviso só no sino (categoria 'mural'), sem e-mail.
-- Anexos: PDF e imagem, até 5 por post e 10 MB cada, no bucket privado 'mural' em <professora>/<autor>/<arquivo>.
-- Acesso de aluno exige vínculo ATIVO com a professora no idioma; desvincular tira o aluno das turmas dela.
-- Grátis para alunos vinculados; criar turmas e postar como professora exige o papel Professora (is_teacher()).
-- Tabelas sem policy: tudo passa pelas RPCs security definer abaixo (checagem de acesso dentro de cada uma).
-- Desfazer: drop das 5 tabelas, das funções mural_*/_mural_*/classroom_code_info/join_classroom_code, do trigger
-- trg_teacher_students_mural_cleanup e das 3 policies mural_files_* (e esvaziar/remover o bucket 'mural').

create table if not exists public.classrooms (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  join_code text unique check (join_code ~ '^[a-z0-9]{10}$'),
  created_at timestamptz not null default now()
);
create index if not exists classrooms_teacher_idx on public.classrooms (teacher_id, language_app_key);

create table if not exists public.classroom_members (
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (classroom_id, student_id)
);
create index if not exists classroom_members_student_idx on public.classroom_members (student_id);

create table if not exists public.mural_posts (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  classroom_id bigint references public.classrooms(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  check (classroom_id is not null or student_id is not null)
);
create index if not exists mural_posts_classroom_idx on public.mural_posts (classroom_id, created_at desc);
create index if not exists mural_posts_individual_idx on public.mural_posts (teacher_id, student_id, language_app_key, created_at desc);
create index if not exists mural_posts_author_idx on public.mural_posts (author_id, created_at);

create table if not exists public.mural_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.mural_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists mural_comments_post_idx on public.mural_comments (post_id, created_at);
create index if not exists mural_comments_author_idx on public.mural_comments (author_id, created_at);

-- Última visita de cada pessoa a cada mural ('c:<turma>' ou 'i:<professora>:<aluno>:<idioma>'), para o "+N".
create table if not exists public.mural_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  mural_key text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, mural_key)
);

alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.mural_posts enable row level security;
alter table public.mural_comments enable row level security;
alter table public.mural_seen enable row level security;
revoke all on public.classrooms, public.classroom_members, public.mural_posts, public.mural_comments, public.mural_seen
  from anon, authenticated;

-- ---------- Helpers ----------
create or replace function public._mural_active_link(p_teacher uuid, p_student uuid, p_lang text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teacher_students
                  where teacher_id = p_teacher and student_id = p_student and language_app_key = p_lang and status = 'active')
$$;

-- Quem vê um post: a professora dona do mural; ou aluno com vínculo ativo que é o destinatário (post individual ou
-- recado para um aluno só) ou, em post para a turma toda, membro da turma.
create or replace function public._mural_visible(p_teacher uuid, p_lang text, p_classroom bigint, p_student uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_uid is not null and (
    p_uid = p_teacher
    or (public._mural_active_link(p_teacher, p_uid, p_lang) and (
          (p_student is not null and p_student = p_uid)
          or (p_student is null and exists (select 1 from public.classroom_members m
                                             where m.classroom_id = p_classroom and m.student_id = p_uid)))))
$$;

create or replace function public._mural_person(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p_user, 'name', public._teacher_display_name(p_user),
    'username', (select username from public.profiles where user_id = p_user),
    'avatar', (select avatar_url from public.profiles where user_id = p_user))
$$;

-- Anexos: até 5, PDF/imagem, até 10 MB, caminho <professora>/<autor>/<arquivo>. Devolve o array limpo ou null.
create or replace function public._mural_clean_attachments(p_list jsonb, p_teacher uuid, p_author uuid)
returns jsonb language plpgsql immutable set search_path = public as $$
declare v_out jsonb := '[]'::jsonb; v_a jsonb; v_prefix text := p_teacher::text || '/' || p_author::text || '/';
begin
  if p_list is null then return v_out; end if;
  if jsonb_typeof(p_list) <> 'array' or jsonb_array_length(p_list) > 5 then return null; end if;
  for v_a in select * from jsonb_array_elements(p_list) loop
    if jsonb_typeof(v_a) <> 'object'
       or coalesce(v_a ->> 'path', '') !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
       or left(v_a ->> 'path', length(v_prefix)) <> v_prefix
       or coalesce(v_a ->> 'type', '') not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
       or coalesce(v_a ->> 'size', '') !~ '^[0-9]{1,9}$' or (v_a ->> 'size')::bigint > 10485760
       or char_length(coalesce(v_a ->> 'name', '')) not between 1 and 200 then
      return null;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('path', v_a ->> 'path', 'name', v_a ->> 'name',
      'type', v_a ->> 'type', 'size', (v_a ->> 'size')::bigint));
  end loop;
  return v_out;
end $$;

create or replace function public._mural_paths(p_list jsonb)
returns text[] language sql immutable as $$
  select coalesce(array_agg(a ->> 'path'), '{}') from jsonb_array_elements(coalesce(p_list, '[]'::jsonb)) a
$$;

create or replace function public._mural_notify(p_user uuid, p_lang text, p_event text, p_body text, p_tab text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_lang not in ('frances', 'mandarim', 'portugues') then return; end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
  values (p_user, p_lang, 'mural', p_event, null, left(p_body, 300), p_tab);
end $$;

create or replace function public._mural_snippet(p_body text)
returns text language sql immutable as $$
  select case when char_length(btrim(coalesce(p_body, ''))) = 0 then '📎'
              when char_length(btrim(p_body)) > 80 then left(btrim(p_body), 80) || '…'
              else btrim(p_body) end
$$;

-- Novidades (posts e comentários de outras pessoas) depois da última visita, num conjunto de posts.
create or replace function public._mural_unread(p_uid uuid, p_key text, p_teacher uuid, p_lang text, p_classroom bigint, p_student uuid)
returns int language sql stable security definer set search_path = public as $$
  with seen as (select coalesce((select seen_at from public.mural_seen where user_id = p_uid and mural_key = p_key), '-infinity'::timestamptz) as t),
  posts as (
    select p.* from public.mural_posts p
     where p.teacher_id = p_teacher and p.language_app_key = p_lang
       and (case when p_classroom is not null then p.classroom_id = p_classroom
                 else p.classroom_id is null and p.student_id = p_student end)
       and public._mural_visible(p.teacher_id, p.language_app_key, p.classroom_id, p.student_id, p_uid))
  select ((select count(*) from posts, seen where posts.author_id <> p_uid and posts.created_at > seen.t)
        + (select count(*) from public.mural_comments c join posts on posts.id = c.post_id, seen
            where c.author_id <> p_uid and c.created_at > seen.t))::int
$$;

revoke execute on function public._mural_active_link(uuid, uuid, text), public._mural_visible(uuid, text, bigint, uuid, uuid),
  public._mural_person(uuid), public._mural_clean_attachments(jsonb, uuid, uuid), public._mural_paths(jsonb),
  public._mural_notify(uuid, text, text, text, text), public._mural_snippet(text),
  public._mural_unread(uuid, text, uuid, text, bigint, uuid) from public, anon, authenticated;

-- ---------- Lista de murais ----------
-- as_teacher: turmas da professora + alunos ativos fora de qualquer turma (o mural individual de quem está numa turma
-- continua acessível pelo aluno na lista "roster"). as_student: as turmas do aluno + o mural individual com a professora.
create or replace function public.mural_list(p_lang text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_teacher jsonb := null; v_student jsonb; v_t uuid;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  if public.is_teacher() then
    v_teacher := jsonb_build_object(
      'classrooms', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name,
          'members', (select coalesce(jsonb_agg(m.student_id order by m.added_at), '[]'::jsonb) from public.classroom_members m
                       where m.classroom_id = c.id and public._mural_active_link(v_me, m.student_id, p_lang)),
          'unread', public._mural_unread(v_me, 'c:' || c.id, v_me, p_lang, c.id, null)) order by lower(c.name), c.id)
        from public.classrooms c where c.teacher_id = v_me and c.language_app_key = p_lang), '[]'::jsonb),
      'roster', coalesce((select jsonb_agg(public._mural_person(ts.student_id)
          || jsonb_build_object('in_classroom', exists (select 1 from public.classroom_members m join public.classrooms c on c.id = m.classroom_id
                                                         where m.student_id = ts.student_id and c.teacher_id = v_me and c.language_app_key = p_lang),
                                'unread', public._mural_unread(v_me, 'i:' || v_me || ':' || ts.student_id || ':' || p_lang, v_me, p_lang, null, ts.student_id))
          order by lower(public._teacher_display_name(ts.student_id)))
        from public.teacher_students ts where ts.teacher_id = v_me and ts.language_app_key = p_lang and ts.status = 'active'), '[]'::jsonb));
  end if;
  select teacher_id into v_t from public.teacher_students where student_id = v_me and language_app_key = p_lang and status = 'active' limit 1;
  if v_t is null then
    v_student := null;
  else
    v_student := jsonb_build_object(
      'teacher', public._mural_person(v_t),
      'individual_unread', public._mural_unread(v_me, 'i:' || v_t || ':' || v_me || ':' || p_lang, v_t, p_lang, null, v_me),
      'individual_posts', (select count(*) from public.mural_posts where teacher_id = v_t and student_id = v_me
                             and classroom_id is null and language_app_key = p_lang),
      'classrooms', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name,
          'unread', public._mural_unread(v_me, 'c:' || c.id, v_t, p_lang, c.id, null)) order by lower(c.name), c.id)
        from public.classrooms c join public.classroom_members m on m.classroom_id = c.id and m.student_id = v_me
       where c.teacher_id = v_t and c.language_app_key = p_lang), '[]'::jsonb));
  end if;
  return jsonb_build_object('as_teacher', v_teacher, 'as_student', v_student);
end $$;

-- ---------- Ler um mural (e marcar como visto) ----------
-- Turma: p_classroom_id. Individual: a professora passa p_student_id; o aluno não passa nada.
create or replace function public.mural_feed(p_lang text, p_classroom_id bigint default null, p_student_id uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_teacher uuid; v_student uuid; v_key text; v_c public.classrooms%rowtype; v_posts jsonb;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  if p_classroom_id is not null then
    select * into v_c from public.classrooms where id = p_classroom_id and language_app_key = p_lang;
    if not found then return jsonb_build_object('error', 'not_found'); end if;
    if not (v_c.teacher_id = v_me or (public._mural_active_link(v_c.teacher_id, v_me, p_lang)
            and exists (select 1 from public.classroom_members where classroom_id = v_c.id and student_id = v_me))) then
      return jsonb_build_object('error', 'not_authorized');
    end if;
    v_teacher := v_c.teacher_id; v_key := 'c:' || v_c.id;
  else
    if p_student_id is not null and p_student_id <> v_me then
      if not public._mural_active_link(v_me, p_student_id, p_lang) then return jsonb_build_object('error', 'not_authorized'); end if;
      v_teacher := v_me; v_student := p_student_id;
    else
      select teacher_id into v_teacher from public.teacher_students where student_id = v_me and language_app_key = p_lang and status = 'active' limit 1;
      if v_teacher is null then return jsonb_build_object('error', 'no_teacher'); end if;
      v_student := v_me;
    end if;
    v_key := 'i:' || v_teacher || ':' || v_student || ':' || p_lang;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'author', public._mural_person(p.author_id), 'by_teacher', p.author_id = p.teacher_id,
      'body', p.body, 'attachments', p.attachments, 'created_at', p.created_at, 'edited_at', p.edited_at,
      'target', case when p.classroom_id is not null and p.student_id is not null then public._mural_person(p.student_id) end,
      'can_edit', p.author_id = v_me and v_me = p.teacher_id,
      'can_delete', p.author_id = v_me or v_me = p.teacher_id,
      'comments', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'author', public._mural_person(c.author_id),
                      'by_teacher', c.author_id = p.teacher_id, 'body', c.body, 'created_at', c.created_at,
                      'can_delete', c.author_id = v_me or v_me = p.teacher_id) order by c.created_at, c.id), '[]'::jsonb)
                     from public.mural_comments c where c.post_id = p.id))
    order by p.created_at desc, p.id desc), '[]'::jsonb)
    into v_posts
  from (select * from public.mural_posts p
         where p.teacher_id = v_teacher and p.language_app_key = p_lang
           and (case when p_classroom_id is not null then p.classroom_id = p_classroom_id
                     else p.classroom_id is null and p.student_id = v_student end)
           and public._mural_visible(p.teacher_id, p.language_app_key, p.classroom_id, p.student_id, v_me)
         order by p.created_at desc, p.id desc limit 100) p;

  insert into public.mural_seen (user_id, mural_key, seen_at) values (v_me, v_key, now())
  on conflict (user_id, mural_key) do update set seen_at = excluded.seen_at;

  return jsonb_build_object('posts', v_posts, 'teacher', public._mural_person(v_teacher), 'is_teacher', v_me = v_teacher,
    'classroom', case when p_classroom_id is not null then jsonb_build_object('id', v_c.id, 'name', v_c.name) end,
    'student', case when v_student is not null then public._mural_person(v_student) end);
end $$;

-- ---------- Posts ----------
create or replace function public.mural_create_post(p_lang text, p_classroom_id bigint, p_student_id uuid, p_body text, p_attachments jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_teacher uuid; v_student uuid := null; v_c public.classrooms%rowtype; v_att jsonb;
        v_body text := btrim(coalesce(p_body, '')); v_id bigint; v_name text; v_where text; v_r record;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  if char_length(v_body) > 5000 then return jsonb_build_object('error', 'too_long'); end if;
  if p_classroom_id is not null then
    select * into v_c from public.classrooms where id = p_classroom_id and language_app_key = p_lang;
    if not found then return jsonb_build_object('error', 'not_found'); end if;
    v_teacher := v_c.teacher_id;
    if v_me = v_teacher then
      if not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
      if p_student_id is not null then
        if not exists (select 1 from public.classroom_members where classroom_id = v_c.id and student_id = p_student_id)
           or not public._mural_active_link(v_teacher, p_student_id, p_lang) then
          return jsonb_build_object('error', 'not_member');
        end if;
        v_student := p_student_id;
      end if;
    else
      if p_student_id is not null or not public._mural_active_link(v_teacher, v_me, p_lang)
         or not exists (select 1 from public.classroom_members where classroom_id = v_c.id and student_id = v_me) then
        return jsonb_build_object('error', 'not_authorized');
      end if;
    end if;
  else
    if p_student_id is not null and p_student_id <> v_me then
      if not public.is_teacher() or not public._mural_active_link(v_me, p_student_id, p_lang) then
        return jsonb_build_object('error', 'not_authorized');
      end if;
      v_teacher := v_me; v_student := p_student_id;
    else
      select teacher_id into v_teacher from public.teacher_students where student_id = v_me and language_app_key = p_lang and status = 'active' limit 1;
      if v_teacher is null then return jsonb_build_object('error', 'no_teacher'); end if;
      v_student := v_me;
    end if;
  end if;
  v_att := public._mural_clean_attachments(p_attachments, v_teacher, v_me);
  if v_att is null then return jsonb_build_object('error', 'invalid_attachments'); end if;
  if v_body = '' and jsonb_array_length(v_att) = 0 then return jsonb_build_object('error', 'empty'); end if;
  perform pg_advisory_xact_lock(hashtextextended('mural_post:' || v_me::text, 0));
  if (select count(*) from public.mural_posts where author_id = v_me and created_at > now() - interval '24 hours') >= 50 then
    return jsonb_build_object('error', 'daily_limit');
  end if;
  insert into public.mural_posts (teacher_id, language_app_key, classroom_id, student_id, author_id, body, attachments)
  values (v_teacher, p_lang, p_classroom_id, v_student, v_me, v_body, v_att) returning id into v_id;

  v_name := public._teacher_display_name(v_me);
  v_where := case when p_classroom_id is not null then ' (turma ' || v_c.name || ')' else '' end;
  if v_me = v_teacher then
    for v_r in
      select v_student as uid where v_student is not null
      union
      select m.student_id from public.classroom_members m
       where p_classroom_id is not null and v_student is null and m.classroom_id = p_classroom_id
         and public._mural_active_link(v_teacher, m.student_id, p_lang)
    loop
      perform public._mural_notify(v_r.uid, p_lang, 'mural_post', '📌 ' || v_name || ' postou no mural' || v_where || ': ' || public._mural_snippet(v_body), 'my-mural');
    end loop;
  else
    perform public._mural_notify(v_teacher, p_lang, 'mural_post', '📌 ' || v_name || ' postou no mural' || v_where || ': ' || public._mural_snippet(v_body), 'teacher-mural');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Só a professora edita, e só os próprios recados. Devolve os anexos que saíram (o app apaga do Storage).
create or replace function public.mural_update_post(p_post_id bigint, p_body text, p_attachments jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_p public.mural_posts%rowtype; v_att jsonb; v_body text := btrim(coalesce(p_body, ''));
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_p from public.mural_posts where id = p_post_id for update;
  if not found or v_p.author_id <> v_me or v_p.teacher_id <> v_me then return jsonb_build_object('error', 'not_authorized'); end if;
  if char_length(v_body) > 5000 then return jsonb_build_object('error', 'too_long'); end if;
  v_att := public._mural_clean_attachments(p_attachments, v_me, v_me);
  if v_att is null then return jsonb_build_object('error', 'invalid_attachments'); end if;
  if v_body = '' and jsonb_array_length(v_att) = 0 then return jsonb_build_object('error', 'empty'); end if;
  update public.mural_posts set body = v_body, attachments = v_att, edited_at = now() where id = v_p.id;
  return jsonb_build_object('ok', true, 'removed_paths',
    to_jsonb(array(select x from unnest(public._mural_paths(v_p.attachments)) x where x <> all (public._mural_paths(v_att)))));
end $$;

-- Apaga: o autor ou a professora dona do mural. Devolve os caminhos dos anexos (o app apaga do Storage).
create or replace function public.mural_delete_post(p_post_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_p public.mural_posts%rowtype;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_p from public.mural_posts where id = p_post_id;
  if not found or not (v_p.author_id = v_me or v_p.teacher_id = v_me) then return jsonb_build_object('error', 'not_authorized'); end if;
  delete from public.mural_posts where id = v_p.id;
  return jsonb_build_object('ok', true, 'removed_paths', to_jsonb(public._mural_paths(v_p.attachments)));
end $$;

-- ---------- Comentários ----------
create or replace function public.mural_add_comment(p_post_id bigint, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_p public.mural_posts%rowtype; v_body text := btrim(coalesce(p_body, '')); v_id bigint;
        v_msg text; v_r record;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_p from public.mural_posts where id = p_post_id;
  if not found or not public._mural_visible(v_p.teacher_id, v_p.language_app_key, v_p.classroom_id, v_p.student_id, v_me) then
    return jsonb_build_object('error', 'not_authorized');
  end if;
  if char_length(v_body) not between 1 and 2000 then return jsonb_build_object('error', case when v_body = '' then 'empty' else 'too_long' end); end if;
  perform pg_advisory_xact_lock(hashtextextended('mural_comment:' || v_me::text, 0));
  if (select count(*) from public.mural_comments where author_id = v_me and created_at > now() - interval '24 hours') >= 200 then
    return jsonb_build_object('error', 'daily_limit');
  end if;
  insert into public.mural_comments (post_id, author_id, body) values (v_p.id, v_me, v_body) returning id into v_id;
  v_msg := '💬 ' || public._teacher_display_name(v_me) || ' comentou no mural: ' || public._mural_snippet(v_body);
  for v_r in select distinct u from (values (v_p.teacher_id), (v_p.author_id)) x(u)
              where u <> v_me and public._mural_visible(v_p.teacher_id, v_p.language_app_key, v_p.classroom_id, v_p.student_id, u) loop
    perform public._mural_notify(v_r.u, v_p.language_app_key, 'mural_comment', v_msg,
      case when v_r.u = v_p.teacher_id then 'teacher-mural' else 'my-mural' end);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.mural_delete_comment(p_comment_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_c public.mural_comments%rowtype; v_teacher uuid;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_c from public.mural_comments where id = p_comment_id;
  if not found then return jsonb_build_object('error', 'not_authorized'); end if;
  select teacher_id into v_teacher from public.mural_posts where id = v_c.post_id;
  if not (v_c.author_id = v_me or v_teacher = v_me) then return jsonb_build_object('error', 'not_authorized'); end if;
  delete from public.mural_comments where id = v_c.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Turmas (professora) ----------
create or replace function public.mural_save_classroom(p_lang text, p_id bigint, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_name text := btrim(coalesce(p_name, '')); v_id bigint;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  if char_length(v_name) not between 1 and 60 then return jsonb_build_object('error', 'invalid_name'); end if;
  if p_id is null then
    if (select count(*) from public.classrooms where teacher_id = v_me) >= 50 then return jsonb_build_object('error', 'classroom_limit'); end if;
    insert into public.classrooms (teacher_id, language_app_key, name) values (v_me, p_lang, v_name) returning id into v_id;
  else
    update public.classrooms set name = v_name where id = p_id and teacher_id = v_me returning id into v_id;
    if v_id is null then return jsonb_build_object('error', 'not_found'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.mural_delete_classroom(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_paths text[];
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if not exists (select 1 from public.classrooms where id = p_id and teacher_id = v_me) then return jsonb_build_object('error', 'not_found'); end if;
  select coalesce(array_agg(x), '{}') into v_paths from public.mural_posts p, unnest(public._mural_paths(p.attachments)) x where p.classroom_id = p_id;
  delete from public.classrooms where id = p_id and teacher_id = v_me;
  delete from public.mural_seen where mural_key = 'c:' || p_id;
  return jsonb_build_object('ok', true, 'removed_paths', to_jsonb(v_paths));
end $$;

-- Troca a lista de alunos da turma (só alunos com vínculo ativo no idioma da turma). Avisa quem entrou.
create or replace function public.mural_set_classroom_members(p_id bigint, p_student_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_c public.classrooms%rowtype; v_new uuid[]; v_s uuid;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  select * into v_c from public.classrooms where id = p_id and teacher_id = v_me for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  select coalesce(array_agg(distinct s), '{}') into v_new from unnest(coalesce(p_student_ids, '{}')) s
   where public._mural_active_link(v_me, s, v_c.language_app_key);
  delete from public.classroom_members where classroom_id = p_id and student_id <> all (v_new);
  foreach v_s in array v_new loop
    insert into public.classroom_members (classroom_id, student_id) values (p_id, v_s) on conflict do nothing;
    if found then
      perform public._mural_notify(v_s, v_c.language_app_key, 'mural_classroom',
        '🏫 ' || public._teacher_display_name(v_me) || ' colocou você na turma ' || v_c.name || '.', 'my-mural');
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'members', to_jsonb(v_new));
end $$;

create or replace function public.mural_classroom_link(p_id bigint, p_reset boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_code text;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  select join_code into v_code from public.classrooms where id = p_id and teacher_id = v_me for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if v_code is null or p_reset then
    loop
      v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      exit when not exists (select 1 from public.classrooms where join_code = v_code)
            and not exists (select 1 from public.teacher_invite_codes where code = v_code);
    end loop;
    update public.classrooms set join_code = v_code where id = p_id;
  end if;
  return jsonb_build_object('ok', true, 'code', v_code);
end $$;

-- Cartão do link da turma (funciona sem login: só nome/@/foto da professora, idioma e nome da turma).
create or replace function public.classroom_code_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('teacher_id', c.teacher_id, 'teacher_name', public._teacher_display_name(c.teacher_id),
            'teacher_username', p.username, 'teacher_avatar', p.avatar_url, 'language_app_key', c.language_app_key,
            'classroom_name', c.name)
     from public.classrooms c join public.profiles p on p.user_id = c.teacher_id
    where c.join_code = lower(btrim(p_code))), jsonb_build_object('error', 'invalid_code'))
$$;

-- Entrar pelo link da turma: cria o vínculo com a professora (se ainda não houver) e põe o aluno na turma.
create or replace function public.join_classroom_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_c public.classrooms%rowtype; v_row public.teacher_students%rowtype; v_new_link boolean := false;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_c from public.classrooms where join_code = lower(btrim(p_code));
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  if v_c.teacher_id = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || v_me::text || v_c.language_app_key, 0));
  if exists (select 1 from public.teacher_students where student_id = v_me and language_app_key = v_c.language_app_key
              and status = 'active' and teacher_id <> v_c.teacher_id) then
    return jsonb_build_object('error', 'student_has_teacher');
  end if;
  if not public._mural_active_link(v_c.teacher_id, v_me, v_c.language_app_key) then
    select * into v_row from public.teacher_students where teacher_id = v_c.teacher_id and student_id = v_me and language_app_key = v_c.language_app_key;
    if found then
      update public.teacher_students set status = 'active', responded_at = now() where id = v_row.id;
    else
      insert into public.teacher_students (teacher_id, student_id, language_app_key, status, invited_at, responded_at)
      values (v_c.teacher_id, v_me, v_c.language_app_key, 'active', now(), now());
    end if;
    v_new_link := true;
  end if;
  insert into public.classroom_members (classroom_id, student_id) values (v_c.id, v_me) on conflict do nothing;
  if not found and not v_new_link then
    return jsonb_build_object('ok', true, 'already_member', true, 'language_app_key', v_c.language_app_key, 'classroom_id', v_c.id, 'classroom_name', v_c.name);
  end if;
  perform public._mural_notify(v_c.teacher_id, v_c.language_app_key, 'mural_classroom_join',
    '🏫 ' || public._teacher_display_name(v_me) || ' entrou pelo link na turma ' || v_c.name
    || case when v_new_link then ' e agora é seu aluno/a de ' || public._lang_label(v_c.language_app_key) else '' end || ' 🎉', 'teacher-mural');
  return jsonb_build_object('ok', true, 'new_link', v_new_link, 'language_app_key', v_c.language_app_key, 'classroom_id', v_c.id, 'classroom_name', v_c.name);
end $$;

-- ---------- Desvincular tira o aluno das turmas da professora naquele idioma ----------
create or replace function public._teacher_students_mural_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'active' and (tg_op = 'DELETE' or new.status is distinct from 'active') then
    delete from public.classroom_members m using public.classrooms c
     where c.id = m.classroom_id and c.teacher_id = old.teacher_id and c.language_app_key = old.language_app_key
       and m.student_id = old.student_id;
  end if;
  return null;
end $$;
revoke execute on function public._teacher_students_mural_cleanup() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_teacher_students_mural_cleanup') then
    create trigger trg_teacher_students_mural_cleanup after update of status or delete on public.teacher_students
      for each row execute function public._teacher_students_mural_cleanup();
  end if;
end $$;

-- ---------- Storage: bucket privado 'mural' ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mural', 'mural', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Leitura de um arquivo: quem pode ver algum post que o cita.
create or replace function public._mural_can_read_file(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mural_posts p
                  where p.attachments @> jsonb_build_array(jsonb_build_object('path', p_name))
                    and public._mural_visible(p.teacher_id, p.language_app_key, p.classroom_id, p.student_id, auth.uid()))
$$;
-- Envio: na pasta <professora>/<eu>/, sendo eu a professora ou aluno com vínculo ativo com ela.
create or replace function public._mural_can_upload(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (storage.foldername(p_name))[2] = auth.uid()::text and (
    ((storage.foldername(p_name))[1] = auth.uid()::text and public.is_teacher())
    or exists (select 1 from public.teacher_students ts where ts.teacher_id::text = (storage.foldername(p_name))[1]
                and ts.student_id = auth.uid() and ts.status = 'active'))
$$;
revoke execute on function public._mural_can_read_file(text), public._mural_can_upload(text) from public, anon;
grant execute on function public._mural_can_read_file(text), public._mural_can_upload(text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'mural_files_insert') then
    create policy mural_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'mural' and public._mural_can_upload(name));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'mural_files_read') then
    create policy mural_files_read on storage.objects for select to authenticated
      using (bucket_id = 'mural' and ((storage.foldername(name))[2] = auth.uid()::text or public._mural_can_read_file(name)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'mural_files_delete') then
    create policy mural_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'mural' and ((storage.foldername(name))[1] = auth.uid()::text or (storage.foldername(name))[2] = auth.uid()::text));
  end if;
end $$;

-- ---------- Permissões das RPCs ----------
revoke execute on function public.mural_list(text), public.mural_feed(text, bigint, uuid),
  public.mural_create_post(text, bigint, uuid, text, jsonb), public.mural_update_post(bigint, text, jsonb),
  public.mural_delete_post(bigint), public.mural_add_comment(bigint, text), public.mural_delete_comment(bigint),
  public.mural_save_classroom(text, bigint, text), public.mural_delete_classroom(bigint),
  public.mural_set_classroom_members(bigint, uuid[]), public.mural_classroom_link(bigint, boolean),
  public.classroom_code_info(text), public.join_classroom_code(text) from public, anon;
grant execute on function public.mural_list(text), public.mural_feed(text, bigint, uuid),
  public.mural_create_post(text, bigint, uuid, text, jsonb), public.mural_update_post(bigint, text, jsonb),
  public.mural_delete_post(bigint), public.mural_add_comment(bigint, text), public.mural_delete_comment(bigint),
  public.mural_save_classroom(text, bigint, text), public.mural_delete_classroom(bigint),
  public.mural_set_classroom_members(bigint, uuid[]), public.mural_classroom_link(bigint, boolean),
  public.classroom_code_info(text), public.join_classroom_code(text) to authenticated;
grant execute on function public.classroom_code_info(text) to anon;
