-- 143: guardar o que a aluna DIGITOU quando erra um cartão da professora no estudo em casa (Etapa 2 de
-- docs/banco-revisao-resposta-digitada-plano.md; decisões da autora em 2026-11-24).
--   * Só quando ela erra (nota 0 = Errei) e o cartão é de digitar (p_typed = true). Acerto, "quase" e cartão de virar: nada.
--   * Até 300 caracteres. Quem lê: só a professora dona do item (política review_bank_reviews_teacher_all, sem mudança).
--   * Guardado por 180 dias: a limpeza diária apaga o TEXTO (a linha de errou/acertou fica).
--   * Excluir a conta da aluna já apaga as linhas dela (student_id ... on delete cascade).
-- Compatibilidade: as funções de 4 parâmetros continuam existindo (aparelho com o site antigo em cache segue enviando);
-- viram um atalho para a versão nova com o texto nulo. O corpo da log_my_bank_review é o da 112 (conferido por hash
-- igual no Staging e na produção em 2026-11-24) com o texto acrescentado; o da correct_my_bank_review é o da 127.
-- Aditiva e idempotente; sem DROP.
-- Desfazer (manual, SQL Editor): recriar as funções de 4 parâmetros com o corpo da 112/127, remover as de 5 parâmetros,
-- a função purge_old_bank_typed_text, o job 'purge-bank-typed-text' e a coluna typed_text.

alter table public.review_bank_reviews add column if not exists typed_text text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'review_bank_reviews_typed_text_len'
                 and conrelid = 'public.review_bank_reviews'::regclass) then
    alter table public.review_bank_reviews
      add constraint review_bank_reviews_typed_text_len check (typed_text is null or char_length(typed_text) <= 300);
  end if;
end $$;
comment on column public.review_bank_reviews.typed_text is
  'O que a aluna digitou quando errou (estudo em casa, cartão de digitar). Só a professora lê; apagado após 180 dias (143).';

-- ---------- log_my_bank_review com o texto digitado ----------
create or replace function public.log_my_bank_review(p_card_id bigint, p_grade integer, p_typed boolean, p_fsrs jsonb, p_typed_text text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_card public.teacher_flashcards%rowtype;
  v_item public.review_bank_items%rowtype;
  v_bs public.review_bank_students%rowtype;
  v_outcome text;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_fsrs jsonb;
  v_due date;
  v_text text;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  if p_grade is not null and (p_grade < 0 or p_grade > 3) then raise exception 'grade_invalido'; end if;
  select * into v_card from public.teacher_flashcards
   where id = p_card_id and student_id = v_me and bank_item_id is not null;
  if not found then return false; end if;
  if not public.teacher_link_is_active(v_card.teacher_id, v_me, v_card.language_app_key) then return false; end if;
  select * into v_item from public.review_bank_items
   where id = v_card.bank_item_id and teacher_id = v_card.teacher_id for update;
  if not found then return false; end if;
  select * into v_bs from public.review_bank_students where id = v_item.bank_student_id;
  if not found then return false; end if;

  v_outcome := case p_grade when 0 then 'errou' when 1 then 'ajuda' when 2 then 'acertou' when 3 then 'acertou' else null end;
  -- Só o erro de um cartão de digitar guarda o texto (decisão da autora, 2026-11-24).
  v_text := case when p_grade = 0 and coalesce(p_typed, false) then nullif(left(btrim(coalesce(p_typed_text, '')), 300), '') else null end;

  if p_grade is not null then
    insert into public.review_bank_reviews
      (item_id, teacher_id, student_id, bank_student_id, language_app_key, outcome, grade, typed, source, via, review_date, applied_at, typed_text)
    values
      (v_item.id, v_item.teacher_id, v_me, v_item.bank_student_id, v_item.language_app_key, v_outcome, p_grade::smallint,
       coalesce(p_typed, false), 'modo_aula', 'casa', v_today, now(), v_text);
  end if;

  if v_bs.linked_student_id is not null and v_bs.linked_student_id = v_me then
    begin
      if p_fsrs is not null and jsonb_typeof(p_fsrs) = 'object' then
        v_fsrs := jsonb_strip_nulls(jsonb_build_object(
          'stability', nullif(p_fsrs ->> 'stability', '')::numeric,
          'difficulty', nullif(p_fsrs ->> 'difficulty', '')::numeric,
          'state', case when p_fsrs ->> 'state' in ('new', 'learning', 'review', 'relearning') then p_fsrs ->> 'state' else null end,
          'lastReview', nullif(p_fsrs ->> 'lastReview', '')::bigint,
          'due', nullif(p_fsrs ->> 'due', '')::bigint,
          'reps', nullif(p_fsrs ->> 'reps', '')::integer,
          'lapses', nullif(p_fsrs ->> 'lapses', '')::integer,
          'interval', nullif(p_fsrs ->> 'interval', '')::integer,
          'fsrsReps', nullif(p_fsrs ->> 'fsrsReps', '')::integer,
          'fsrsLapses', nullif(p_fsrs ->> 'fsrsLapses', '')::integer));
        if v_fsrs ? 'due' then
          v_due := (to_timestamp((v_fsrs ->> 'due')::double precision / 1000.0) at time zone 'America/Sao_Paulo')::date;
        end if;
      end if;
    exception when others then
      v_fsrs := null; v_due := null;
    end;
    update public.review_bank_items
       set fsrs = coalesce(v_fsrs, fsrs),
           due_date = coalesce(v_due, due_date),
           last_result = coalesce(v_outcome, last_result),
           last_review_date = case when v_outcome is null then last_review_date else v_today end,
           last_source = case when v_outcome is null then last_source else 'casa' end,
           updated_at = updated_at
     where id = v_item.id;
  end if;
  return true;
end;
$$;

-- Versão antiga (4 parâmetros): mesmo comportamento de antes, sem texto.
create or replace function public.log_my_bank_review(p_card_id bigint, p_grade integer, p_typed boolean, p_fsrs jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  return public.log_my_bank_review(p_card_id, p_grade, p_typed, p_fsrs, null::text);
end;
$$;

-- ---------- correct_my_bank_review com o texto digitado (corpo da 127) ----------
create or replace function public.correct_my_bank_review(p_card_id bigint, p_grade integer, p_typed boolean, p_fsrs jsonb, p_typed_text text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_card public.teacher_flashcards%rowtype;
  v_last uuid;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  if p_grade is null or p_grade < 0 or p_grade > 3 then raise exception 'grade_invalido'; end if;
  select * into v_card from public.teacher_flashcards
   where id = p_card_id and student_id = v_me and bank_item_id is not null;
  if not found then return false; end if;
  if not public.teacher_link_is_active(v_card.teacher_id, v_me, v_card.language_app_key) then return false; end if;
  select r.id into v_last from public.review_bank_reviews r
   where r.item_id = v_card.bank_item_id and r.student_id = v_me and r.via = 'casa'
     and r.review_date = (now() at time zone 'America/Sao_Paulo')::date
   order by r.created_at desc limit 1;
  if v_last is not null then
    delete from public.review_bank_reviews where id = v_last;
  end if;
  return public.log_my_bank_review(p_card_id, p_grade, p_typed, p_fsrs, p_typed_text);
end;
$$;

create or replace function public.correct_my_bank_review(p_card_id bigint, p_grade integer, p_typed boolean, p_fsrs jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  return public.correct_my_bank_review(p_card_id, p_grade, p_typed, p_fsrs, null::text);
end;
$$;

revoke execute on function public.log_my_bank_review(bigint, integer, boolean, jsonb, text),
  public.correct_my_bank_review(bigint, integer, boolean, jsonb, text) from public, anon;
grant execute on function public.log_my_bank_review(bigint, integer, boolean, jsonb, text),
  public.correct_my_bank_review(bigint, integer, boolean, jsonb, text) to authenticated;

-- ---------- 180 dias: a limpeza apaga o texto, a linha fica ----------
create or replace function public.purge_old_bank_typed_text()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.review_bank_reviews set typed_text = null
   where typed_text is not null and created_at < now() - interval '180 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.purge_old_bank_typed_text() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-bank-typed-text', '23 7 * * *', 'select public.purge_old_bank_typed_text()');
  end if;
end $$;
