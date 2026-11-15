-- 136: Banco de Revisão, botões novos da professora (prévia aprovada em 2026-11-15, docs/banco-revisao-previa-botoes.html):
--   * review_bank_student_footprint: o que apagar um aluno do Banco levaria junto (itens, cartões entregues, memória, respostas, Récaps);
--   * delete_review_bank_item: apaga um item SÓ se nunca virou cartão (com cartão: cortar);
--   * delete_review_bank_student: apaga um aluno SÓ se não tem cartão entregue, memória (FSRS) nem respostas guardadas (senão: arquivar);
--   * move_review_bank_item: move um item para outro aluno do MESMO idioma (com cartão só se os dois entregam para os mesmos destinatários);
--   * merge_review_bank_students: junta duas fichas do mesmo idioma (prévia com p_dry_run = true), sem apagar progresso de ninguém:
--     itens repetidos (mesma import_key) do aluno que sai são descartados SÓ se não têm cartão entregue; regras do Google Agenda/Notion passam para a ficha que fica.
-- Nunca mexe em notebook_id (regra da dona: caderno só troca com aprovação dela, pela tela). Aditiva (create or replace), sem DROP.
-- Desfazer (manual): remover as 5 funções abaixo. Nenhuma coluna ou tabela nova.

create or replace function public._rb_mine(p_bank_student_id uuid)
returns public.review_bank_students
language plpgsql stable security definer set search_path = public as $$
declare s public.review_bank_students%rowtype;
begin
  if auth.uid() is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into s from public.review_bank_students where id = p_bank_student_id and teacher_id = auth.uid();
  if not found then raise exception 'not_authorized'; end if;
  return s;
end;
$$;
revoke execute on function public._rb_mine(uuid) from public, anon, authenticated;

-- Mesmos destinatários (conta vinculada ou turma) nos dois alunos do Banco?
create or replace function public._rb_same_target(a public.review_bank_students, b public.review_bank_students)
returns boolean language sql immutable set search_path = public as $$
  select coalesce((a.linked_student_id is not null and a.linked_student_id = b.linked_student_id)
      or (a.classroom_id is not null and a.classroom_id = b.classroom_id), false)
$$;
revoke execute on function public._rb_same_target(public.review_bank_students, public.review_bank_students) from public, anon, authenticated;

create or replace function public.review_bank_student_footprint(p_bank_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.review_bank_students%rowtype;
begin
  s := public._rb_mine(p_bank_student_id);
  return jsonb_build_object(
    'name', s.name,
    'items', (select count(*) from public.review_bank_items where bank_student_id = s.id),
    'delivered_cards', (select count(*) from public.review_bank_items where bank_student_id = s.id and teacher_flashcard_id is not null),
    'memory_items', (select count(*) from public.review_bank_items where bank_student_id = s.id and fsrs is not null),
    'reviews', (select count(*) from public.review_bank_reviews where bank_student_id = s.id),
    'recaps', (select count(*) from public.review_bank_recaps where bank_student_id = s.id)
  );
end;
$$;
revoke execute on function public.review_bank_student_footprint(uuid) from public, anon;
grant execute on function public.review_bank_student_footprint(uuid) to authenticated;

create or replace function public.delete_review_bank_item(p_item_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare i public.review_bank_items%rowtype;
begin
  if auth.uid() is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into i from public.review_bank_items where id = p_item_id and teacher_id = auth.uid() for update;
  if not found then raise exception 'not_authorized'; end if;
  if i.teacher_flashcard_id is not null or exists (select 1 from public.teacher_flashcards where bank_item_id = i.id) then
    raise exception 'has_card';
  end if;
  delete from public.review_bank_items where id = i.id;
end;
$$;
revoke execute on function public.delete_review_bank_item(uuid) from public, anon;
grant execute on function public.delete_review_bank_item(uuid) to authenticated;

create or replace function public.delete_review_bank_student(p_bank_student_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.review_bank_students%rowtype; f jsonb;
begin
  s := public._rb_mine(p_bank_student_id);
  f := public.review_bank_student_footprint(s.id);
  if (f->>'delivered_cards')::int > 0 or (f->>'memory_items')::int > 0 or (f->>'reviews')::int > 0 then
    raise exception 'has_progress';
  end if;
  delete from public.review_bank_students where id = s.id and teacher_id = auth.uid();
end;
$$;
revoke execute on function public.delete_review_bank_student(uuid) from public, anon;
grant execute on function public.delete_review_bank_student(uuid) to authenticated;

create or replace function public.move_review_bank_item(p_item_id uuid, p_to_bank_student uuid)
returns void language plpgsql security definer set search_path = public as $$
declare i public.review_bank_items%rowtype; src public.review_bank_students%rowtype; dst public.review_bank_students%rowtype;
begin
  dst := public._rb_mine(p_to_bank_student);
  select * into i from public.review_bank_items where id = p_item_id and teacher_id = auth.uid() for update;
  if not found then raise exception 'not_authorized'; end if;
  src := public._rb_mine(i.bank_student_id);
  if src.id = dst.id then raise exception 'same_student'; end if;
  if src.language_app_key <> dst.language_app_key then raise exception 'language_mismatch'; end if;
  if i.import_key is not null and exists (select 1 from public.review_bank_items where bank_student_id = dst.id and import_key = i.import_key) then
    raise exception 'duplicate_in_target';
  end if;
  if (i.teacher_flashcard_id is not null or exists (select 1 from public.teacher_flashcards where bank_item_id = i.id))
     and not public._rb_same_target(src, dst) then
    raise exception 'has_card_other_recipient';
  end if;
  update public.review_bank_items set bank_student_id = dst.id, student_id = dst.linked_student_id, updated_at = now() where id = i.id;
  update public.review_bank_reviews set bank_student_id = dst.id where item_id = i.id;
  update public.review_bank_requests set bank_student_id = dst.id where item_id = i.id;
end;
$$;
revoke execute on function public.move_review_bank_item(uuid, uuid) from public, anon;
grant execute on function public.move_review_bank_item(uuid, uuid) to authenticated;

-- Junta p_from em p_into. p_dry_run = true só conta (a tela mostra a prévia). Devolve contagens e, se houver, 'blocked' com o motivo.
create or replace function public.merge_review_bank_students(p_from uuid, p_into uuid, p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  src public.review_bank_students%rowtype; dst public.review_bank_students%rowtype;
  it record; has_card boolean;
  moved int := 0; dup int := 0; recaps_moved int := 0; recaps_dup int := 0; blocked text := null;
begin
  src := public._rb_mine(p_from);
  dst := public._rb_mine(p_into);
  if src.id = dst.id then raise exception 'same_student'; end if;
  if src.language_app_key <> dst.language_app_key then raise exception 'language_mismatch'; end if;

  for it in select * from public.review_bank_items where bank_student_id = src.id order by created_at loop
    has_card := it.teacher_flashcard_id is not null or exists (select 1 from public.teacher_flashcards where bank_item_id = it.id);
    if it.import_key is not null and exists (select 1 from public.review_bank_items where bank_student_id = dst.id and import_key = it.import_key) then
      if has_card then blocked := coalesce(blocked, 'duplicate_has_card'); end if;
      dup := dup + 1;
    else
      if has_card and not public._rb_same_target(src, dst) then blocked := coalesce(blocked, 'has_card_other_recipient'); end if;
      moved := moved + 1;
    end if;
  end loop;
  select count(*) filter (where not exists (select 1 from public.review_bank_recaps d where d.bank_student_id = dst.id and d.class_date = r.class_date)),
         count(*) filter (where exists (select 1 from public.review_bank_recaps d where d.bank_student_id = dst.id and d.class_date = r.class_date))
    into recaps_moved, recaps_dup
    from public.review_bank_recaps r where r.bank_student_id = src.id;

  if p_dry_run or blocked is not null then
    return jsonb_build_object('dry_run', p_dry_run, 'blocked', blocked, 'keep', dst.name, 'remove', src.name,
      'items_moved', moved, 'items_duplicate', dup, 'recaps_moved', recaps_moved, 'recaps_duplicate', recaps_dup);
  end if;

  for it in select * from public.review_bank_items where bank_student_id = src.id order by created_at loop
    if it.import_key is not null and exists (select 1 from public.review_bank_items where bank_student_id = dst.id and import_key = it.import_key) then
      delete from public.review_bank_items where id = it.id;
    else
      update public.review_bank_items set bank_student_id = dst.id, student_id = dst.linked_student_id, updated_at = now() where id = it.id;
      update public.review_bank_reviews set bank_student_id = dst.id where item_id = it.id;
      update public.review_bank_requests set bank_student_id = dst.id where item_id = it.id;
    end if;
  end loop;
  update public.review_bank_recaps r set bank_student_id = dst.id
   where r.bank_student_id = src.id and not exists (select 1 from public.review_bank_recaps d where d.bank_student_id = dst.id and d.class_date = r.class_date);
  -- regras do Google Agenda e do Notion seguem a ficha que fica
  update public.google_calendar_events set bank_student_id = dst.id where bank_student_id = src.id;
  update public.google_calendar_rules set bank_student_id = dst.id where bank_student_id = src.id;
  update public.notion_name_links set bank_student_id = dst.id where bank_student_id = src.id;
  update public.notion_pages set bank_student_id = dst.id where bank_student_id = src.id;
  update public.notion_pages set manual_bank = dst.id where manual_bank = src.id;
  -- ficha que fica: junta datas e nomes de agenda (o nome da ficha que sai vira nome de agenda); última leitura = a mais recente; caderno NÃO muda
  update public.review_bank_students d set
    lesson_dates = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(d.lesson_dates, '{}') || coalesce(src.lesson_dates, '{}')) x),
    agenda_names = (select coalesce(array_agg(distinct x), '{}') from unnest(coalesce(d.agenda_names, '{}') || coalesce(src.agenda_names, '{}') || array[src.name]) x),
    last_entry_read = greatest(d.last_entry_read, src.last_entry_read),
    updated_at = now()
   where d.id = dst.id;
  delete from public.review_bank_students where id = src.id and teacher_id = auth.uid();
  return jsonb_build_object('dry_run', false, 'blocked', null, 'keep', dst.name, 'remove', src.name,
    'items_moved', moved, 'items_duplicate', dup, 'recaps_moved', recaps_moved, 'recaps_duplicate', recaps_dup);
end;
$$;
revoke execute on function public.merge_review_bank_students(uuid, uuid, boolean) from public, anon;
grant execute on function public.merge_review_bank_students(uuid, uuid, boolean) to authenticated;
