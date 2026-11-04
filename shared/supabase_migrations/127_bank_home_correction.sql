-- 127: corrigir a nota do estudo em casa (botão "Voltar" da Revisão do aluno) SEM contar a resposta duas vezes.
-- A função nova troca a resposta mais recente de HOJE (via 'casa') do mesmo aluno e cartão pela nota corrigida e então registra
-- como a log_my_bank_review da 112 (mesmo espelho de FSRS, resultado e data). Sem resposta de hoje para trocar, só registra.
-- Aditiva e idempotente; sem DROP. Só apaga a própria linha do aluno logado, do mesmo cartão, de hoje e via 'casa'.
-- Desfazer (manual): remover a função correct_my_bank_review.

create or replace function public.correct_my_bank_review(p_card_id bigint, p_grade integer, p_typed boolean, p_fsrs jsonb)
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
  return public.log_my_bank_review(p_card_id, p_grade, p_typed, p_fsrs);
end;
$$;

revoke execute on function public.correct_my_bank_review(bigint, integer, boolean, jsonb) from public, anon;
grant execute on function public.correct_my_bank_review(bigint, integer, boolean, jsonb) to authenticated;
