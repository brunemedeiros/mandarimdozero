-- Fase 6 do sistema de alunas particulares (ver CLAUDE.md) -- primeira vez
-- que uma professora pode LER qualquer dado de progresso de uma aluna.
-- Antes desta migration, RLS de `progress` era só `auth.uid() = user_id`
-- -- ninguém além da própria conta tinha acesso, nem professora vinculada.
--
-- Em vez de abrir uma policy de SELECT direta em `progress` (que exporia a
-- linha inteira -- os DOIS idiomas, TODAS as respostas/histórico
-- granulares, inclusive cartões auto-criados pela aluna que não são da
-- professora), esta function SECURITY DEFINER é o único ponto de acesso:
-- checa o vínculo ativo (teacher_students) ela mesma, escopa ao idioma do
-- vínculo, e devolve só métricas AGREGADAS sobre os cartões que ESTA
-- professora especificamente autorou pra essa aluna (teacher_flashcards) --
-- nunca a resposta literal de um cartão, nunca o cartão auto-criado da
-- aluna, nunca o outro idioma. RLS de `progress` continua sem nenhuma
-- policy nova -- toda checagem de autorização mora dentro da function.
create or replace function public.get_teacher_student_metrics(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_lang_data jsonb;
  v_cards jsonb;
  v_teacher_card_ids text[];
  v_card jsonb;
  v_id text;
  v_reps int;
  v_lapses int;
  v_interval int;
  v_status text;
  v_active_count int := 0;
  v_archived_count int := 0;
  v_never_reviewed int := 0;
  v_weak int := 0;
  v_medium int := 0;
  v_strong int := 0;
begin
  select exists(
    select 1 from teacher_students ts
    where ts.teacher_id = auth.uid()
      and ts.student_id = p_student_id
      and ts.language_app_key = p_language_app_key
      and ts.status = 'active'
  ) into v_authorized;

  if not v_authorized then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  select array_agg('t' || tf.id::text) into v_teacher_card_ids
  from teacher_flashcards tf
  where tf.teacher_id = auth.uid()
    and tf.student_id = p_student_id
    and tf.language_app_key = p_language_app_key;

  select data -> p_language_app_key into v_lang_data
  from progress where user_id = p_student_id;

  v_cards := coalesce(v_lang_data -> 'cards', '[]'::jsonb);

  if v_teacher_card_ids is not null then
    for v_card in select * from jsonb_array_elements(v_cards)
    loop
      v_id := v_card ->> 'id';
      if v_id = any(v_teacher_card_ids) then
        v_status := v_card ->> 'flashcardStatus';
        v_reps := coalesce((v_card ->> 'reps')::int, 0);
        v_lapses := coalesce((v_card ->> 'lapses')::int, 0);
        v_interval := coalesce((v_card ->> 'interval')::int, 0);
        if v_status = 'active' then v_active_count := v_active_count + 1; else v_archived_count := v_archived_count + 1; end if;
        if v_reps = 0 then v_never_reviewed := v_never_reviewed + 1; end if;
        -- Mesma regra de classificação de shared vocabStrengthBuckets()
        -- (fr/zh app.js) -- não reinventar um critério novo.
        if v_reps = 0 or v_lapses >= 2 then
          v_weak := v_weak + 1;
        elsif v_reps > 0 and v_lapses < 2 and v_interval >= 60 then
          v_strong := v_strong + 1;
        else
          v_medium := v_medium + 1;
        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'lastStudyDay', v_lang_data ->> 'lastStudyDay',
    'teacherCardsTotal', coalesce(array_length(v_teacher_card_ids, 1), 0),
    'teacherCardsActive', v_active_count,
    'teacherCardsArchived', v_archived_count,
    'teacherCardsNeverReviewed', v_never_reviewed,
    'teacherCardsWeak', v_weak,
    'teacherCardsMedium', v_medium,
    'teacherCardsStrong', v_strong
  );
end;
$$;

revoke all on function public.get_teacher_student_metrics(uuid, text) from public;
grant execute on function public.get_teacher_student_metrics(uuid, text) to authenticated;
