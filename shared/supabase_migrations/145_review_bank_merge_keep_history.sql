-- 145: "Juntar fichas" do Banco (função da 137) deixa de perder histórico (achado da revisão diária de 2026-11-25, confirmado no código):
--   * item repetido (mesma import_key) da ficha que sai era APAGADO e, como `review_bank_reviews` e `review_bank_requests` apagam em
--     cascata, as respostas do Modo aula e os pedidos da aluna sumiam para sempre. Agora, antes de apagar o repetido, as respostas e os
--     pedidos passam para o item que fica; a memória (FSRS e escada) do mais recentemente revisado também fica no item que fica;
--     pedido aberto repetido da mesma aluna vira "recusado" (com a razão) em vez de sumir;
--   * Récap da ficha que sai com a mesma data de um Récap da que fica: os itens dos dois são unidos (antes o da ficha que sai sumia), e os ids de
--     itens repetidos apagados são trocados pelos que ficaram, em todo Récap trazido;
--   * conta/turma: se só a ficha que sai tem conta vinculada (ou turma), ela passa para a ficha que fica (antes o vínculo se desfazia
--     em silêncio e o aluno deixava de receber cartões); se as duas têm contas DIFERENTES, não junta ('different_targets');
--   * a prévia (p_dry_run) passa a dizer o que será movido: respostas, pedidos e se a conta muda de ficha.
-- Aditiva (create or replace, mesma assinatura da 137), sem DROP. Desfazer (manual): reaplicar a função da 137.

create or replace function public.merge_review_bank_students(p_from uuid, p_into uuid, p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  src public.review_bank_students%rowtype; dst public.review_bank_students%rowtype;
  it record; kept public.review_bank_items%rowtype; rq record; rc record;
  has_card boolean;
  eff_link uuid; eff_class bigint; link_moves boolean := false;
  moved int := 0; dup int := 0; reviews_moved int := 0; requests_moved int := 0;
  recaps_moved int := 0; recaps_merged int := 0; blocked text := null;
  map_from uuid[] := '{}'; map_to uuid[] := '{}'; new_ids uuid[]; j int; x uuid; y uuid;
begin
  src := public._rb_mine(p_from);
  dst := public._rb_mine(p_into);
  if src.id = dst.id then raise exception 'same_student'; end if;
  if src.language_app_key <> dst.language_app_key then raise exception 'language_mismatch'; end if;

  -- destino efetivo: o da ficha que fica; se ela não tem, o da que sai passa para ela
  eff_link := coalesce(dst.linked_student_id, case when dst.classroom_id is null then src.linked_student_id end);
  eff_class := coalesce(dst.classroom_id, case when dst.linked_student_id is null then src.classroom_id end);
  link_moves := (dst.linked_student_id is null and dst.classroom_id is null) and (src.linked_student_id is not null or src.classroom_id is not null);
  if (src.linked_student_id is not null or src.classroom_id is not null) and (dst.linked_student_id is not null or dst.classroom_id is not null)
     and not public._rb_same_target(src, dst) then
    blocked := 'different_targets';
  end if;

  for it in select * from public.review_bank_items where bank_student_id = src.id order by created_at loop
    has_card := it.teacher_flashcard_id is not null or exists (select 1 from public.teacher_flashcards where bank_item_id = it.id);
    select * into kept from public.review_bank_items where bank_student_id = dst.id and import_key = it.import_key and it.import_key is not null;
    if found then
      if has_card then blocked := coalesce(blocked, 'duplicate_has_card'); end if;
      dup := dup + 1;
      reviews_moved := reviews_moved + (select count(*) from public.review_bank_reviews where item_id = it.id);
      requests_moved := requests_moved + (select count(*) from public.review_bank_requests where item_id = it.id);
    else
      if has_card and not (public._rb_same_target(src, dst) or link_moves) then blocked := coalesce(blocked, 'has_card_other_recipient'); end if;
      moved := moved + 1;
    end if;
  end loop;
  select count(*) filter (where not exists (select 1 from public.review_bank_recaps d where d.bank_student_id = dst.id and d.class_date = r.class_date)),
         count(*) filter (where exists (select 1 from public.review_bank_recaps d where d.bank_student_id = dst.id and d.class_date = r.class_date))
    into recaps_moved, recaps_merged
    from public.review_bank_recaps r where r.bank_student_id = src.id;

  if p_dry_run or blocked is not null then
    return jsonb_build_object('dry_run', p_dry_run, 'blocked', blocked, 'keep', dst.name, 'remove', src.name,
      'items_moved', moved, 'items_duplicate', dup, 'recaps_moved', recaps_moved, 'recaps_duplicate', recaps_merged,
      'recaps_merged', recaps_merged, 'reviews_moved', reviews_moved, 'requests_moved', requests_moved, 'link_moves', link_moves);
  end if;

  -- 1) itens: repetido -> histórico e memória vão para o item que fica, só depois o repetido sai; os outros passam para a ficha que fica
  for it in select * from public.review_bank_items where bank_student_id = src.id order by created_at loop
    select * into kept from public.review_bank_items where bank_student_id = dst.id and import_key = it.import_key and it.import_key is not null;
    if found then
      update public.review_bank_reviews set item_id = kept.id, bank_student_id = dst.id where item_id = it.id;
      for rq in select * from public.review_bank_requests where item_id = it.id loop
        if rq.status = 'pendente' and exists (select 1 from public.review_bank_requests o where o.item_id = kept.id and o.requester_id = rq.requester_id and o.status = 'pendente') then
          update public.review_bank_requests set item_id = kept.id, bank_student_id = dst.id, status = 'recusado', decided_at = now(),
            reason = nullif(btrim(coalesce(reason, '') || ' [pedido repetido ao juntar as fichas]'), '') where id = rq.id;
        else
          update public.review_bank_requests set item_id = kept.id, bank_student_id = dst.id where id = rq.id;
        end if;
      end loop;
      -- memória: fica a do item revisado mais recentemente (a do que fica, se empatar)
      if (it.last_review_date is not null and (kept.last_review_date is null or it.last_review_date > kept.last_review_date))
         or (kept.last_review_date is null and it.last_review_date is null and it.fsrs is not null and kept.fsrs is null) then
        update public.review_bank_items set fsrs = it.fsrs, level = it.level, due_date = it.due_date, last_result = it.last_result,
          last_review_date = it.last_review_date, last_source = it.last_source, updated_at = now() where id = kept.id;
      end if;
      map_from := array_append(map_from, it.id); map_to := array_append(map_to, kept.id);
      delete from public.review_bank_items where id = it.id;
    else
      update public.review_bank_items set bank_student_id = dst.id, student_id = eff_link, updated_at = now() where id = it.id;
      update public.review_bank_reviews set bank_student_id = dst.id where item_id = it.id;
      update public.review_bank_requests set bank_student_id = dst.id where item_id = it.id;
    end if;
  end loop;
  -- itens que já estavam na ficha que fica também passam a apontar para a conta efetiva (se ela veio da ficha que sai)
  if link_moves then
    update public.review_bank_items set student_id = eff_link where bank_student_id = dst.id and teacher_flashcard_id is null and student_id is distinct from eff_link;
  end if;

  -- 2) Récaps: ids de itens repetidos apagados viram os que ficaram; mesma data = une os itens, data nova = traz o Récap inteiro
  for rc in select * from public.review_bank_recaps where bank_student_id = src.id loop
    new_ids := '{}';
    foreach x in array coalesce(rc.item_ids, '{}') loop
      j := array_position(map_from, x);
      y := case when j is null then x else map_to[j] end;
      if not (y = any(new_ids)) then new_ids := array_append(new_ids, y); end if;
    end loop;
    if exists (select 1 from public.review_bank_recaps d where d.bank_student_id = dst.id and d.class_date = rc.class_date) then
      update public.review_bank_recaps d set item_ids = (select coalesce(array_agg(distinct u), '{}') from unnest(coalesce(d.item_ids, '{}') || new_ids) u)
       where d.bank_student_id = dst.id and d.class_date = rc.class_date;
      delete from public.review_bank_recaps where id = rc.id;
    else
      update public.review_bank_recaps set bank_student_id = dst.id, item_ids = new_ids where id = rc.id;
    end if;
  end loop;

  -- 3) regras do Google Agenda e do Notion seguem a ficha que fica
  update public.google_calendar_events set bank_student_id = dst.id where bank_student_id = src.id;
  update public.google_calendar_rules set bank_student_id = dst.id where bank_student_id = src.id;
  update public.notion_name_links set bank_student_id = dst.id where bank_student_id = src.id;
  update public.notion_pages set bank_student_id = dst.id where bank_student_id = src.id;
  update public.notion_pages set manual_bank = dst.id where manual_bank = src.id;

  -- 4) ficha que fica: junta datas e nomes de agenda; última leitura = a mais recente; caderno NÃO muda
  update public.review_bank_students d set
    lesson_dates = (select coalesce(array_agg(distinct x2 order by x2), '{}') from unnest(coalesce(d.lesson_dates, '{}') || coalesce(src.lesson_dates, '{}')) x2),
    agenda_names = (select coalesce(array_agg(distinct x2), '{}') from unnest(coalesce(d.agenda_names, '{}') || coalesce(src.agenda_names, '{}') || array[src.name]) x2),
    last_entry_read = greatest(d.last_entry_read, src.last_entry_read),
    updated_at = now()
   where d.id = dst.id;
  -- a ficha que sai apaga (sobra só o que já foi movido ou unido); depois a conta/turma passa para a que fica (índice único por conta)
  delete from public.review_bank_students where id = src.id and teacher_id = auth.uid();
  if link_moves then
    update public.review_bank_students set linked_student_id = eff_link, classroom_id = eff_class, updated_at = now() where id = dst.id;
  end if;

  return jsonb_build_object('dry_run', false, 'blocked', null, 'keep', dst.name, 'remove', src.name,
    'items_moved', moved, 'items_duplicate', dup, 'recaps_moved', recaps_moved, 'recaps_duplicate', recaps_merged,
    'recaps_merged', recaps_merged, 'reviews_moved', reviews_moved, 'requests_moved', requests_moved, 'link_moves', link_moves);
end;
$$;
revoke execute on function public.merge_review_bank_students(uuid, uuid, boolean) from public, anon;
grant execute on function public.merge_review_bank_students(uuid, uuid, boolean) to authenticated;
