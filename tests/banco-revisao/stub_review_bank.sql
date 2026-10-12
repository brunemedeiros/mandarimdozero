-- Complemento para a 080: colunas de teacher_flashcards que a produção já tem e um ensure_teacher_decks mínimo.
alter table public.teacher_flashcards add column if not exists back_trans text, add column if not exists note text,
  add column if not exists fields jsonb, add column if not exists card_generation_mode text,
  add column if not exists tags text[] not null default '{}'::text[], add column if not exists deck_id bigint,
  add column if not exists revision int not null default 0;
create or replace function public.ensure_teacher_decks(p_student_id uuid, p_language_app_key text)
returns table (root_deck_id bigint, teacher_root_deck_id bigint) language plpgsql security definer set search_path = public as $$
declare v_t uuid := auth.uid(); v_r bigint; v_tr bigint;
begin
  if not teacher_link_is_active(v_t, p_student_id, p_language_app_key) then raise exception 'not_authorized'; end if;
  select id into v_r from decks where owner_id = p_student_id and kind = 'root' and language_app_key = p_language_app_key;
  if v_r is null then insert into decks(owner_id, kind, name, language_app_key) values (p_student_id, 'root', 'Francês', p_language_app_key) returning id into v_r; end if;
  select id into v_tr from decks where owner_id = p_student_id and teacher_id = v_t and kind = 'teacher_root' and language_app_key = p_language_app_key;
  if v_tr is null then insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (p_student_id, v_t, v_r, 'teacher_root', 'Cartões da professora', p_language_app_key) returning id into v_tr; end if;
  return query select v_r, v_tr;
end $$;
