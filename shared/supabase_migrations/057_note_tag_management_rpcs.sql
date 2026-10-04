-- Fase J (Painel de Tags) -- aditiva e idempotente. NENHUMA tabela/coluna nova:
-- Tags continuam sendo `tags text[]` (migration 048) em own_flashcards e
-- teacher_flashcards. Esta migration só cria 3 RPCs SECURITY INVOKER
-- (a RLS existente continua sendo a autoridade; nenhum bypass):
--   list_note_tags(p_scope)                 -> (tag, notes)
--   rename_note_tag(p_scope, p_old, p_new)  -> jsonb
--   delete_note_tag(p_scope, p_tag)         -> jsonb
-- p_scope: 'own' (linhas com owner_id = auth.uid()) ou
--          'teacher' (linhas com teacher_id = auth.uid(); todos os alunos e
--          idiomas). Um chamador sem permissão (ex.: aluna em 'teacher')
--          atinge 0 linhas -- a RLS de teacher_flashcards (admin-only) e o
--          filtro teacher_id = auth.uid() valem juntos.
-- As funções alteram SOMENTE a coluna `tags` (nunca revision, deck_id, fields,
-- status): metadata da Note, sem reset de FSRS. Igualdade EXATA do slug (nunca
-- LIKE/substring). Rename funde quando o destino já existe (sem duplicata,
-- ordem estável: a fusão fica na posição da 1ª ocorrência). Os slugs chegam
-- JÁ normalizados pelo cliente (shared/flashcard-model.js); o servidor só
-- valida o formato canônico e o limite de 50 caracteres.

create or replace function public.note_tag_is_canonical(p_tag text)
returns boolean
language sql
immutable
as $$
  select p_tag is not null
     and char_length(p_tag) between 1 and 50
     and p_tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$';
$$;

create or replace function public.list_note_tags(p_scope text)
returns table(tag text, notes bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_scope = 'own' then
    return query
      select u.t, count(distinct o.id)
      from own_flashcards o, unnest(o.tags) as u(t)
      where o.owner_id = auth.uid()
      group by u.t
      order by u.t;
  elsif p_scope = 'teacher' then
    return query
      select u.t, count(distinct f.id)
      from teacher_flashcards f, unnest(f.tags) as u(t)
      where f.teacher_id = auth.uid()
      group by u.t
      order by u.t;
  else
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.rename_note_tag(p_scope text, p_old text, p_new text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_merged bigint := 0;
  v_affected bigint := 0;
begin
  if p_scope not in ('own', 'teacher') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if not note_tag_is_canonical(p_old) or not note_tag_is_canonical(p_new) then
    raise exception 'invalid_tag' using errcode = '22023';
  end if;
  if p_old = p_new then
    return jsonb_build_object('affected', 0, 'merged', 0, 'unchanged', true);
  end if;

  if p_scope = 'own' then
    select count(*) into v_merged from own_flashcards
      where owner_id = auth.uid() and tags @> array[p_old, p_new];
    update own_flashcards o
       set tags = coalesce((
             select array_agg(d.t order by d.first_pos)
             from (
               select s.t, min(s.pos) as first_pos
               from (select case when x = p_old then p_new else x end as t, pos
                     from unnest(o.tags) with ordinality as u(x, pos)) s
               group by s.t
             ) d), '{}'::text[])
     where o.owner_id = auth.uid() and o.tags @> array[p_old];
    get diagnostics v_affected = row_count;
  else
    select count(*) into v_merged from teacher_flashcards
      where teacher_id = auth.uid() and tags @> array[p_old, p_new];
    update teacher_flashcards f
       set tags = coalesce((
             select array_agg(d.t order by d.first_pos)
             from (
               select s.t, min(s.pos) as first_pos
               from (select case when x = p_old then p_new else x end as t, pos
                     from unnest(f.tags) with ordinality as u(x, pos)) s
               group by s.t
             ) d), '{}'::text[])
     where f.teacher_id = auth.uid() and f.tags @> array[p_old];
    get diagnostics v_affected = row_count;
  end if;

  return jsonb_build_object('affected', v_affected, 'merged', v_merged, 'unchanged', false);
end;
$$;

create or replace function public.delete_note_tag(p_scope text, p_tag text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_affected bigint := 0;
begin
  if p_scope not in ('own', 'teacher') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if not note_tag_is_canonical(p_tag) then
    raise exception 'invalid_tag' using errcode = '22023';
  end if;

  if p_scope = 'own' then
    update own_flashcards
       set tags = array_remove(tags, p_tag)
     where owner_id = auth.uid() and tags @> array[p_tag];
  else
    update teacher_flashcards
       set tags = array_remove(tags, p_tag)
     where teacher_id = auth.uid() and tags @> array[p_tag];
  end if;
  get diagnostics v_affected = row_count;
  return jsonb_build_object('affected', v_affected);
end;
$$;

revoke all on function public.note_tag_is_canonical(text) from public, anon;
revoke all on function public.list_note_tags(text) from public, anon;
revoke all on function public.rename_note_tag(text, text, text) from public, anon;
revoke all on function public.delete_note_tag(text, text) from public, anon;
grant execute on function public.list_note_tags(text) to authenticated;
grant execute on function public.rename_note_tag(text, text, text) to authenticated;
grant execute on function public.delete_note_tag(text, text) to authenticated;
grant execute on function public.note_tag_is_canonical(text) to authenticated;
