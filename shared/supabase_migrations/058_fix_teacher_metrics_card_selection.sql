-- K.0-B -- get_teacher_student_metrics: corrige SÓ a SELEÇÃO de cards do progresso.
--
-- Bug: a função montava ids 't'||id e comparava por igualdade exata com
-- progress.cards[].id. CardInstances com sufixo (t{n}-b reverso, t{n}-cN Cloze,
-- t{n}-rN edição e combinações t{n}-rN-b / t{n}-rN-cN) ficavam FORA da seleção.
--
-- Correção (seleção apenas):
--   1) estrutural: card.origin = 'teacher' e card.rowId ∈ ids das linhas de
--      teacher_flashcards desta professora/aluna/idioma (cards de professora são
--      serializados inteiros no progresso, com origin e rowId);
--   2) fallback p/ saves antigos sem rowId: id no formato ancorado
--      ^t{n}(-r{n})?(-b|-cN)?$ com {n} ∈ ids das linhas (e origin ausente ou
--      'teacher'). Origem presente e diferente de 'teacher' nunca entra.
--
-- NÃO muda o significado dos agregados: teacherCardsTotal continua = nº de
-- linhas (Notes); active/archived/neverReviewed/weak/medium/strong continuam
-- contados por card selecionado, com as mesmas regras. Sem mudança de schema,
-- sem migração de dados. Só CREATE OR REPLACE FUNCTION.
--
-- ROLLBACK: reaplicar o corpo da função de 029_create_teacher_student_metrics_function.sql.
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
  v_teacher_row_ids bigint[];
  v_card jsonb;
  v_id text;
  v_row_id bigint;
  v_selected boolean;
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

  select array_agg(tf.id) into v_teacher_row_ids
  from teacher_flashcards tf
  where tf.teacher_id = auth.uid()
    and tf.student_id = p_student_id
    and tf.language_app_key = p_language_app_key;

  select data -> p_language_app_key into v_lang_data
  from progress where user_id = p_student_id;

  v_cards := coalesce(v_lang_data -> 'cards', '[]'::jsonb);

  if v_teacher_row_ids is not null then
    for v_card in select * from jsonb_array_elements(v_cards)
    loop
      v_id := v_card ->> 'id';
      v_selected := false;

      if (v_card ->> 'rowId') ~ '^[0-9]+$' then
        -- caminho estrutural
        v_selected := (v_card ->> 'origin') = 'teacher'
                      and (v_card ->> 'rowId')::bigint = any(v_teacher_row_ids);
      elsif v_id ~ '^t[0-9]+(-r[0-9]+)?(-b|-c[0-9]+)?$'
            and coalesce(v_card ->> 'origin', 'teacher') = 'teacher' then
        -- fallback: save antigo sem rowId
        v_row_id := (substring(v_id from '^t([0-9]+)'))::bigint;
        v_selected := v_row_id = any(v_teacher_row_ids);
      end if;

      if v_selected then
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
    'teacherCardsTotal', coalesce(array_length(v_teacher_row_ids, 1), 0),
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
