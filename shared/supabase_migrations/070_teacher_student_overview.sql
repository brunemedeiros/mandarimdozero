-- 070 -- Painel do aluno ampliado: get_teacher_student_overview.
--
-- Função NOVA (não substitui get_teacher_student_metrics, migration 059, que
-- continua igual e segue alimentando o bloco "cartões que você criou").
-- Sem DROP (a ferramenta de deploy trava com DROP), sem tabela nova, sem RLS
-- nova, sem mudança de dados. Só CREATE OR REPLACE + grants.
--
-- Decisão da autora (professora/admin): privacidade NÃO é um limite estrito
-- aqui -- como professora ela vê uso/acesso, progresso, sequência, últimas
-- atividades, unidades concluídas e o resto. O aluno não é notificado.
-- Cartões próprios do aluno: só a QUANTIDADE (nunca conteúdo).
--
-- Autorização (mesmo padrão de 059): vínculo teacher_students ATIVO entre
-- auth.uid() (professora) e p_student_id no idioma p_language_app_key.
-- Autorizado o vínculo, o painel mostra o progresso do aluno em TODOS os
-- idiomas que ele tem em progress.data (frances/mandarim/portugues) -- caso
-- real: alunos vinculados em 'portugues' que estudam no site de Francês.
--
-- Datas de activityLog/dailyLessonsLog são do relógio local do aluno: o
-- servidor devolve os últimos ~40 dias crus e o CLIENTE calcula 7/30 dias.
-- Sequência: devolve o valor bruto + lastStudyDay; o cliente aplica
-- effectiveStreakFor (shared/srs.js) para não mostrar sequência congelada.
--
-- Fila de revisão (todos os cartões do idioma, mesma semântica do K1,
-- shared/srs.js cardStudyBucket): new = reps 0 e state new/ausente;
-- learning = state learning/relearning, ou state new com reps > 0;
-- review = state review. Devidos = não-new com 0 < due <= agora (ms).
-- Fracos = lapses >= 2.
--
-- Histórico de acertos: eventos usage_events 'review_answer' (gravados a
-- partir deste deploy pelo gradeCurrentCard de fr/zh app.js) + as notas de
-- lição/checkpoint que já existiam (meta.scorePct de lesson_complete).
--
-- ROLLBACK: revoke execute ... from authenticated (a função não é usada por
-- mais nada além de shared/student-metrics.js).
create or replace function public.get_teacher_student_overview(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_data jsonb;
  v_now_ms numeric := extract(epoch from clock_timestamp()) * 1000;
  v_since text := to_char((current_date - 40), 'YYYY-MM-DD');
  v_languages jsonb;
  v_timeline jsonb;
  v_answers jsonb;
  v_lessons jsonb;
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

  select data into v_data from progress where user_id = p_student_id;

  with langs as (
    select l.key, l.value as d
    from jsonb_each(coalesce(v_data, '{}'::jsonb)) l
    where l.key in ('frances', 'mandarim', 'portugues')
      and jsonb_typeof(l.value) = 'object'
  ),
  per_lang as (
    select lg.key,
      jsonb_build_object(
        'key', lg.key,
        'lastStudyDay', case when jsonb_typeof(lg.d -> 'lastStudyDay') = 'string' then lg.d ->> 'lastStudyDay' end,
        'streak', case when jsonb_typeof(lg.d -> 'streak') = 'number' then (lg.d -> 'streak') else '0'::jsonb end,
        'xp', case when jsonb_typeof(lg.d -> 'xp') = 'number' then (lg.d -> 'xp') else '0'::jsonb end,
        'totalReviews', case when jsonb_typeof(lg.d -> 'totalReviews') = 'number' then (lg.d -> 'totalReviews') else '0'::jsonb end,
        'progressSummary', case when jsonb_typeof(lg.d -> 'progressSummary') = 'object'
          then jsonb_build_object(
            'levelId', lg.d -> 'progressSummary' ->> 'levelId',
            'levelLabel', lg.d -> 'progressSummary' ->> 'levelLabel',
            'pct', case when jsonb_typeof(lg.d -> 'progressSummary' -> 'pct') = 'number' then lg.d -> 'progressSummary' -> 'pct' end)
          end,
        'unitsCompleted', coalesce((
          select jsonb_agg(u.key order by u.key)
          from jsonb_each(case when jsonb_typeof(lg.d -> 'unitProgress') = 'object' then lg.d -> 'unitProgress' else '{}'::jsonb end) u
          where jsonb_typeof(u.value) = 'object' and (u.value ->> 'completed') = 'true'
        ), '[]'::jsonb),
        'unitsStarted', coalesce((
          select count(*)
          from jsonb_each(case when jsonb_typeof(lg.d -> 'unitProgress') = 'object' then lg.d -> 'unitProgress' else '{}'::jsonb end) u
          where jsonb_typeof(u.value) = 'object' and (u.value ->> 'started') = 'true'
        ), 0),
        'checkpoints', coalesce((
          select jsonb_object_agg(c.key, jsonb_build_object(
              'completed', (c.value ->> 'completed') = 'true',
              'bestScore', case when jsonb_typeof(c.value -> 'bestScore') = 'number' then c.value -> 'bestScore' else '0'::jsonb end))
          from jsonb_each(case when jsonb_typeof(lg.d -> 'checkpointProgress') = 'object' then lg.d -> 'checkpointProgress' else '{}'::jsonb end) c
          where jsonb_typeof(c.value) = 'object'
            and ((c.value ->> 'completed') = 'true' or coalesce(c.value ->> 'bestScore', '0') not in ('0', '0.0'))
        ), '{}'::jsonb),
        'activityDays', coalesce((
          select jsonb_object_agg(a.key, a.value)
          from jsonb_each(case when jsonb_typeof(lg.d -> 'activityLog') = 'object' then lg.d -> 'activityLog' else '{}'::jsonb end) a
          where a.key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and a.key >= v_since and jsonb_typeof(a.value) = 'number'
        ), '{}'::jsonb),
        'dailyLessons', coalesce((
          select jsonb_object_agg(a.key, a.value)
          from jsonb_each(case when jsonb_typeof(lg.d -> 'dailyLessonsLog') = 'object' then lg.d -> 'dailyLessonsLog' else '{}'::jsonb end) a
          where a.key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and a.key >= v_since and jsonb_typeof(a.value) = 'number'
        ), '{}'::jsonb),
        'dictations', coalesce((
          select jsonb_agg(jsonb_build_object(
              'id', x.key,
              'bestScore', case when jsonb_typeof(x.value -> 'bestScore') = 'number' then x.value -> 'bestScore' else '0'::jsonb end,
              'attempts', case when jsonb_typeof(x.value -> 'attempts') = 'number' then x.value -> 'attempts' else '0'::jsonb end,
              'lastAt', case when jsonb_typeof(x.value -> 'lastAt') = 'string' then x.value ->> 'lastAt' end)
            order by x.key)
          from jsonb_each(case when jsonb_typeof(lg.d -> 'dictations') = 'object' then lg.d -> 'dictations' else '{}'::jsonb end) x
          where jsonb_typeof(x.value) = 'object'
        ), '[]'::jsonb),
        'challengesCompleted', coalesce((
          select count(*)
          from jsonb_each(case when jsonb_typeof(lg.d -> 'completedChallenges') = 'object' then lg.d -> 'completedChallenges' else '{}'::jsonb end) ch
          where ch.value = 'true'::jsonb
        ), 0),
        'queue', (
          with cards as (
            select
              case when (c ->> 'reps') ~ '^-?[0-9]+(\.[0-9]+)?$' then (c ->> 'reps')::numeric else 0 end as reps,
              case when (c ->> 'lapses') ~ '^-?[0-9]+(\.[0-9]+)?$' then (c ->> 'lapses')::numeric else 0 end as lapses,
              case when (c ->> 'due') ~ '^[0-9]+(\.[0-9]+)?$' then (c ->> 'due')::numeric else 0 end as due,
              coalesce(nullif(c ->> 'state', ''), 'new') as st
            from jsonb_array_elements(case when jsonb_typeof(lg.d -> 'cards') = 'array' then lg.d -> 'cards' else '[]'::jsonb end) c
            where jsonb_typeof(c) = 'object'
          ),
          b as (
            select lapses, due,
              case when st in ('learning', 'relearning') then 'learning'
                   when st = 'review' then 'review'
                   when reps > 0 then 'learning'
                   else 'new' end as bucket
            from cards
          )
          select jsonb_build_object(
            'total', count(*),
            'new', count(*) filter (where bucket = 'new'),
            'learning', count(*) filter (where bucket = 'learning'),
            'review', count(*) filter (where bucket = 'review'),
            'due', count(*) filter (where bucket <> 'new' and due > 0 and due <= v_now_ms),
            'weak', count(*) filter (where lapses >= 2))
          from b
        ),
        'ownCardsActive', (
          select count(*) from own_flashcards o
          where o.owner_id = p_student_id and o.language_app_key = lg.key and o.status = 'active'
        )
      ) as j
    from langs lg
  )
  select coalesce(jsonb_agg(j order by (key = p_language_app_key) desc, key), '[]'::jsonb)
  into v_languages from per_lang;

  -- Linha do tempo: últimos 50 eventos relevantes (sem técnicos, sem cada
  -- resposta de revisão -- essas viram agregado abaixo). meta reduzida a
  -- chaves conhecidas, nunca o objeto inteiro.
  select coalesce(jsonb_agg(t order by (t ->> 'at') desc), '[]'::jsonb) into v_timeline
  from (
    select jsonb_build_object(
      'at', e.created_at,
      'type', e.event_type,
      'name', e.event_name,
      'lang', e.language_app_key,
      'meta', (
        select coalesce(jsonb_object_agg(m.key, m.value), '{}'::jsonb)
        from jsonb_each(case when jsonb_typeof(e.meta) = 'object' then e.meta else '{}'::jsonb end) m
        where m.key in ('unitId', 'lessonIdx', 'scorePct', 'score', 'total', 'pct', 'count', 'pairs', 'dictationId', 'challengeId')
          and jsonb_typeof(m.value) in ('string', 'number')
      )
    ) as t
    from usage_events e
    where e.user_id = p_student_id
      and e.event_type in ('tab_switch', 'lesson_start', 'lesson_complete', 'report_submitted')
    order by e.created_at desc
    limit 50
  ) s;

  select jsonb_build_object(
    'firstAt', min(e.created_at),
    'last7Total', count(*) filter (where e.created_at >= now() - interval '7 days'),
    'last7Correct', count(*) filter (where e.created_at >= now() - interval '7 days' and e.meta ->> 'correct' = 'true'),
    'last30Total', count(*) filter (where e.created_at >= now() - interval '30 days'),
    'last30Correct', count(*) filter (where e.created_at >= now() - interval '30 days' and e.meta ->> 'correct' = 'true'),
    'allTotal', count(*),
    'allCorrect', count(*) filter (where e.meta ->> 'correct' = 'true')
  ) into v_answers
  from usage_events e
  where e.user_id = p_student_id and e.event_type = 'review_answer';

  select jsonb_build_object(
    'last30Count', count(*),
    'last30AvgPct', round(avg((e.meta ->> 'scorePct')::numeric))
  ) into v_lessons
  from usage_events e
  where e.user_id = p_student_id
    and e.event_type = 'lesson_complete'
    and e.event_name in ('vocab_lesson', 'unit_checkpoint')
    and e.created_at >= now() - interval '30 days'
    and (e.meta ->> 'scorePct') ~ '^[0-9]+(\.[0-9]+)?$';

  return jsonb_build_object(
    'linkedLanguage', p_language_app_key,
    'languages', v_languages,
    'timeline', v_timeline,
    'answers', v_answers,
    'lessonScores', v_lessons
  );
end;
$$;

revoke all on function public.get_teacher_student_overview(uuid, text) from public;
revoke all on function public.get_teacher_student_overview(uuid, text) from anon;
grant execute on function public.get_teacher_student_overview(uuid, text) to authenticated;

-- Índice de apoio para as consultas por aluno+tipo+data (aditivo, sem lock
-- longo: usage_events é pequena; se crescer, recriar com CONCURRENTLY fora
-- de transação).
create index if not exists usage_events_user_type_created_idx
  on public.usage_events (user_id, event_type, created_at desc);
