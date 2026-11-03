-- 121 -- Mural no estilo Google Classroom (decisões da autora, 2026-10-26 a 29).
-- 1) Capa da turma: cor (padrão = cor do site, quando nula) ou foto própria; só a professora troca (mural_set_cover).
--    A foto fica no bucket privado 'mural' em <professora>/<professora>/capa-...; alunos da turma podem ler.
-- 2) Avisos automáticos no Mural (mural_posts.kind = 'lesson' | 'material', ref_id = id da aula ou do material):
--    - aula: quando o tema ou a tarefa é preenchido ou muda (aula vinda do Google sem conteúdo não gera aviso; a leitura do
--      Google mexe só no horário, então não repete aviso); vai para o mural da turma ou do aluno da aula;
--    - material novo: vai para o mural individual do aluno (material é por aluno).
--    Um aviso por aula ou material (índice único), com sino para cada aluno no idioma do site dele. O texto mostrado vem
--    sempre da aula ou do material (editou lá, muda aqui); se a aula ou o material for apagado, o aviso some do feed.
--    Os avisos aceitam comentários como qualquer recado. Sem retroativo: só aulas e materiais daqui em diante.
-- 3) mural_feed devolve kind, ref e a capa da turma.
-- Aditiva, sem DROP e sem DELETE.

alter table public.classrooms add column if not exists cover_color text
  check (cover_color is null or cover_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.classrooms add column if not exists cover_path text
  check (cover_path is null or char_length(cover_path) <= 300);

alter table public.mural_posts add column if not exists kind text not null default 'post'
  check (kind in ('post', 'lesson', 'material'));
alter table public.mural_posts add column if not exists ref_id bigint;
create unique index if not exists mural_posts_kind_ref_key on public.mural_posts (kind, ref_id) where kind <> 'post';

-- ---------- Aviso automático ----------
create or replace function public._mural_auto_post(p_kind text, p_ref bigint, p_teacher uuid, p_lang text,
                                                   p_classroom bigint, p_student uuid, p_title text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_r record; v_name text; v_snip text; v_txt text;
begin
  if p_kind not in ('lesson', 'material') or p_ref is null or p_teacher is null
     or p_lang not in ('frances', 'mandarim', 'portugues') or (p_classroom is null and p_student is null) then
    return;
  end if;
  if p_classroom is null and not public._mural_active_link(p_teacher, p_student, p_lang) then return; end if;
  if exists (select 1 from public.mural_posts where kind = p_kind and ref_id = p_ref) then return; end if;
  insert into public.mural_posts (teacher_id, language_app_key, classroom_id, student_id, author_id, body, attachments, kind, ref_id)
  values (p_teacher, p_lang, p_classroom, case when p_classroom is null then p_student end, p_teacher, '', '[]'::jsonb, p_kind, p_ref)
  on conflict do nothing
  returning id into v_id;
  if v_id is null then return; end if;
  v_name := public._teacher_display_name(p_teacher);
  v_snip := public._mural_snippet(p_title);
  for v_r in
    select p_student as uid where p_classroom is null
    union
    select m.student_id from public.classroom_members m
     where p_classroom is not null and m.classroom_id = p_classroom and public._mural_active_link(p_teacher, m.student_id, p_lang)
  loop
    if public._ui_lang(v_r.uid) = 'en' then
      v_txt := case p_kind when 'lesson' then '📅 ' || v_name || ' logged a lesson on the board: '
                           else '📎 ' || v_name || ' shared a material on the board: ' end || v_snip;
    else
      v_txt := case p_kind when 'lesson' then '📅 ' || v_name || ' registrou uma aula no mural: '
                           else '📎 ' || v_name || ' publicou um material no mural: ' end || v_snip;
    end if;
    perform public._mural_notify(v_r.uid, p_lang, 'mural_post', v_txt, 'my-mural');
  end loop;
end $$;
revoke execute on function public._mural_auto_post(text, bigint, uuid, text, bigint, uuid, text) from public, anon, authenticated;

-- Aula: tema ou tarefa preenchido ou mudou. Falha no aviso nunca impede salvar a aula.
create or replace function public._mural_lesson_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(btrim(new.topic), '') = '' and coalesce(btrim(new.homework), '') = '' then return new; end if;
  if tg_op = 'UPDATE' and new.topic is not distinct from old.topic and new.homework is not distinct from old.homework then
    return new;
  end if;
  begin
    perform public._mural_auto_post('lesson', new.id, new.teacher_id, new.language_app_key, new.classroom_id,
      case when new.classroom_id is null then new.student_id end,
      coalesce(nullif(btrim(new.topic), ''), new.homework));
  exception when others then
    raise warning 'mural: aviso da aula % não foi criado: %', new.id, sqlerrm;
  end;
  return new;
end $$;

create or replace function public._mural_material_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public._mural_auto_post('material', new.id, new.teacher_id, new.language_app_key, null, new.student_id, new.title);
  exception when others then
    raise warning 'mural: aviso do material % não foi criado: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public._mural_lesson_trigger(), public._mural_material_trigger() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_mural_lesson' and tgrelid = 'public.teacher_class_logs'::regclass) then
    create trigger trg_mural_lesson after insert or update of topic, homework on public.teacher_class_logs
      for each row execute function public._mural_lesson_trigger();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_mural_material' and tgrelid = 'public.teacher_support_materials'::regclass) then
    create trigger trg_mural_material after insert on public.teacher_support_materials
      for each row execute function public._mural_material_trigger();
  end if;
end $$;

-- ---------- O que o aviso mostra (sempre da aula ou do material, ao vivo) ----------
create or replace function public._mural_ref(p_kind text, p_ref bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'lesson' then (select jsonb_build_object('id', l.id, 'class_date', l.class_date, 'start_time', l.start_time,
                                                  'topic', l.topic, 'homework', l.homework)
                          from public.teacher_class_logs l where l.id = p_ref)
    when 'material' then (select jsonb_build_object('id', m.id, 'title', m.title, 'description', m.description,
                                                    'link_url', m.link_url, 'has_file', m.file_url is not null, 'file_name', m.file_name)
                            from public.teacher_support_materials m where m.id = p_ref)
  end
$$;
revoke execute on function public._mural_ref(text, bigint) from public, anon, authenticated;

-- ---------- Capa da turma ----------
create or replace function public.mural_set_cover(p_id bigint, p_color text, p_path text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_c public.classrooms%rowtype;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  select * into v_c from public.classrooms where id = p_id and teacher_id = v_me;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p_color is not null and p_color !~ '^#[0-9A-Fa-f]{6}$' then return jsonb_build_object('error', 'invalid_color'); end if;
  if p_path is not null and (p_path not like v_me::text || '/' || v_me::text || '/%' or char_length(p_path) > 300 or p_path like '%..%') then
    return jsonb_build_object('error', 'invalid_path');
  end if;
  update public.classrooms set cover_color = p_color, cover_path = p_path where id = v_c.id;
  return jsonb_build_object('ok', true, 'old_path', v_c.cover_path);
end $$;
revoke execute on function public.mural_set_cover(bigint, text, text) from public, anon;
grant execute on function public.mural_set_cover(bigint, text, text) to authenticated;

-- Leitura de arquivo do mural: anexo de post visível (087) ou foto da capa de uma turma que a pessoa vê.
create or replace function public._mural_can_read_file(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mural_posts p
                  where p.attachments @> jsonb_build_array(jsonb_build_object('path', p_name))
                    and public._mural_visible(p.teacher_id, p.language_app_key, p.classroom_id, p.student_id, auth.uid()))
      or exists (select 1 from public.classrooms c
                  where c.cover_path = p_name
                    and (c.teacher_id = auth.uid()
                         or (public._mural_active_link(c.teacher_id, auth.uid(), c.language_app_key)
                             and exists (select 1 from public.classroom_members m where m.classroom_id = c.id and m.student_id = auth.uid()))))
$$;
revoke execute on function public._mural_can_read_file(text) from public, anon;
grant execute on function public._mural_can_read_file(text) to authenticated;

-- ---------- Feed (087 + kind, ref e capa) ----------
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
      'id', p.id, 'kind', p.kind, 'ref', p.ref, 'author', public._mural_person(p.author_id), 'by_teacher', p.author_id = p.teacher_id,
      'body', p.body, 'attachments', p.attachments, 'created_at', p.created_at, 'edited_at', p.edited_at,
      'target', case when p.classroom_id is not null and p.student_id is not null then public._mural_person(p.student_id) end,
      'can_edit', p.kind = 'post' and p.author_id = v_me and v_me = p.teacher_id,
      'can_delete', p.author_id = v_me or v_me = p.teacher_id,
      'comments', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'author', public._mural_person(c.author_id),
                      'by_teacher', c.author_id = p.teacher_id, 'body', c.body, 'created_at', c.created_at,
                      'can_delete', c.author_id = v_me or v_me = p.teacher_id) order by c.created_at, c.id), '[]'::jsonb)
                     from public.mural_comments c where c.post_id = p.id))
    order by p.created_at desc, p.id desc), '[]'::jsonb)
    into v_posts
  from (select p.*, case when p.kind = 'post' then null else public._mural_ref(p.kind, p.ref_id) end as ref
          from public.mural_posts p
         where p.teacher_id = v_teacher and p.language_app_key = p_lang
           and (case when p_classroom_id is not null then p.classroom_id = p_classroom_id
                     else p.classroom_id is null and p.student_id = v_student end)
           and public._mural_visible(p.teacher_id, p.language_app_key, p.classroom_id, p.student_id, v_me)
           and (p.kind = 'post' or public._mural_ref(p.kind, p.ref_id) is not null)
         order by p.created_at desc, p.id desc limit 100) p;

  insert into public.mural_seen (user_id, mural_key, seen_at) values (v_me, v_key, now())
  on conflict (user_id, mural_key) do update set seen_at = excluded.seen_at;

  return jsonb_build_object('posts', v_posts, 'teacher', public._mural_person(v_teacher), 'is_teacher', v_me = v_teacher,
    'classroom', case when p_classroom_id is not null then jsonb_build_object('id', v_c.id, 'name', v_c.name,
                   'cover_color', v_c.cover_color, 'cover_path', v_c.cover_path) end,
    'student', case when v_student is not null then public._mural_person(v_student) end);
end $$;
revoke execute on function public.mural_feed(text, bigint, uuid) from public, anon;
grant execute on function public.mural_feed(text, bigint, uuid) to authenticated;
