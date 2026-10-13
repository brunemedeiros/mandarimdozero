-- E3 / C3 (docs/i18n/auditoria-e3-progresso-por-curso.md): o servidor passa a entender chaves de CURSO e a sequência da CONTA em
-- progress.data, ANTES de qualquer conta ter dado novo ("servidor primeiro, cliente depois").
--
-- O que muda (só LEITURA, nenhuma tabela, coluna, política ou dado):
--   get_teacher_student_overview (070): aceita chaves frances, frances@en, mandarim@en, portugues@en...; devolve `languageAppKey` e
--     `courseId` além de `key`; streak/lastStudyDay vêm de progress.data._account quando existir e não estiver atrás do bloco;
--     "cartões próprios ativos" e a ordem usam o idioma estudado (parte antes do @), não a chave inteira.
--   get_public_profile_stats (037): mesma tolerância a chaves de curso (languageAppKey = idioma estudado, courseId novo) e a
--     sequência da conta.
-- Para as contas de hoje (chaves frances e mandarim, sem _account ou com _account igual ao bloco) o resultado é o MESMO, só com
-- os campos extras languageAppKey e courseId. get_teacher_student_metrics (059) continua como está: lê o bloco do idioma pedido.
-- Sem DROP; CREATE OR REPLACE com a mesma assinatura. Mesmos grants de antes (re-declarados).

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
    select l.key, split_part(l.key, '@', 1) as app_key, l.value as d,
      -- E3/C3: sequência da CONTA (progress.data._account) vale quando existe e não está atrás do bloco
      (jsonb_typeof(v_data #> '{_account,lastStudyDay}') = 'string'
        and jsonb_typeof(v_data #> '{_account,streak}') = 'number'
        and (coalesce(jsonb_typeof(l.value -> 'lastStudyDay'), '') <> 'string'
             or (v_data #>> '{_account,lastStudyDay}') >= (l.value ->> 'lastStudyDay'))) as use_acct
    from jsonb_each(coalesce(v_data, '{}'::jsonb)) l
    -- E3/C3: chave de curso (frances, frances@en...); _meta e _account não casam
    where split_part(l.key, '@', 1) in ('frances', 'mandarim', 'portugues')
      and jsonb_typeof(l.value) = 'object'
  ),
  per_lang as (
    select lg.key, lg.app_key,
      jsonb_build_object(
        'key', lg.key,
        'languageAppKey', lg.app_key,
        'courseId', case when position('@' in lg.key) > 0 then lg.key else lg.key || '@pt-BR' end,
        'lastStudyDay', case when lg.use_acct then v_data #>> '{_account,lastStudyDay}'
                             when jsonb_typeof(lg.d -> 'lastStudyDay') = 'string' then lg.d ->> 'lastStudyDay' end,
        'streak', case when lg.use_acct then (v_data #> '{_account,streak}')
                       when jsonb_typeof(lg.d -> 'streak') = 'number' then (lg.d -> 'streak') else '0'::jsonb end,
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
          where o.owner_id = p_student_id and o.language_app_key = lg.app_key and o.status = 'active'
        )
      ) as j
    from langs lg
  )
  select coalesce(jsonb_agg(j order by (app_key = p_language_app_key) desc, key), '[]'::jsonb)
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

-- ============================================================
-- get_public_profile_stats (037) com chaves de curso e sequência da conta
-- ============================================================
create or replace function public.get_public_profile_stats(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_public boolean;
  v_data jsonb;
  v_langs jsonb := '[]'::jsonb;
  v_key text;
  v_lang jsonb;
  v_pct int;
begin
  select user_id, public_profile into v_user_id, v_public
  from profiles where username = p_username;

  if v_user_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if not v_public then
    return jsonb_build_object('error', 'not_public');
  end if;

  select data into v_data from progress where user_id = v_user_id;
  v_data := coalesce(v_data, '{}'::jsonb);

  for v_key in select jsonb_object_keys(v_data)
  loop
    v_lang := v_data -> v_key;
    -- object_keys também pega chaves não-idioma se algum dia existirem
    -- na raiz de `data` -- checagem defensiva, só processa se parecer
    -- um bloco de idioma de verdade (tem progressSummary ou xp).
    -- _meta e _account não têm progressSummary nem xp, então nunca entram aqui
    if jsonb_typeof(v_lang) = 'object' and (v_lang ? 'progressSummary' or v_lang ? 'xp') then
      v_pct := coalesce((v_lang -> 'progressSummary' ->> 'pct')::int, 0);
      if v_pct > 0 then
        v_langs := v_langs || jsonb_build_array(jsonb_build_object(
          -- E3/C3: languageAppKey é sempre o idioma estudado (parte antes do @); courseId é o curso
          'languageAppKey', split_part(v_key, '@', 1),
          'courseId', case when position('@' in v_key) > 0 then v_key else v_key || '@pt-BR' end,
          'pct', v_pct,
          'levelLabel', v_lang -> 'progressSummary' ->> 'levelLabel',
          'xp', coalesce((v_lang ->> 'xp')::int, 0),
          -- sequência da CONTA (_account) quando existir e não estiver atrás do bloco; senão a do bloco, como antes
          'streak', case when jsonb_typeof(v_data #> '{_account,lastStudyDay}') = 'string'
                          and jsonb_typeof(v_data #> '{_account,streak}') = 'number'
                          and (coalesce(jsonb_typeof(v_lang -> 'lastStudyDay'), '') <> 'string'
                               or (v_data #>> '{_account,lastStudyDay}') >= (v_lang ->> 'lastStudyDay'))
                     then (v_data #>> '{_account,streak}')::int
                     else coalesce((v_lang ->> 'streak')::int, 0) end,
          'lastStudyDay', case when jsonb_typeof(v_data #> '{_account,lastStudyDay}') = 'string'
                                and jsonb_typeof(v_data #> '{_account,streak}') = 'number'
                                and (coalesce(jsonb_typeof(v_lang -> 'lastStudyDay'), '') <> 'string'
                                     or (v_data #>> '{_account,lastStudyDay}') >= (v_lang ->> 'lastStudyDay'))
                           then v_data #>> '{_account,lastStudyDay}'
                           else v_lang ->> 'lastStudyDay' end
        ));
      end if;
    end if;
  end loop;

  return jsonb_build_object('userId', v_user_id, 'languages', v_langs);
end;
$$;

revoke all on function public.get_public_profile_stats(text) from public;
-- `anon` incluso de propósito -- é a única function SECURITY DEFINER
-- desta feature chamável sem sessão (mesmo motivo de profiles_public_read
-- já ser `to anon, authenticated` desde a migration 001).
grant execute on function public.get_public_profile_stats(text) to anon, authenticated;
