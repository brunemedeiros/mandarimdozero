-- Teste de get_teacher_student_overview (070). Desenhado para transação +
-- ROLLBACK (nunca deixa resíduo). Roda no Postgres local (run.sh); também
-- pode ser colado num banco real -- usa só contas criadas aqui dentro.
-- Saída: uma linha "ok|..." ou "FALHA|..." por cenário.
begin;

create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;

insert into auth.users(id, email) values
  ('70000000-0000-0000-0000-0000000000a1', 'prof-070@example.invalid'),
  ('70000000-0000-0000-0000-0000000000b1', 'aluno-070@example.invalid'),
  ('70000000-0000-0000-0000-0000000000c1', 'outra-070@example.invalid'),
  ('70000000-0000-0000-0000-0000000000d1', 'aluno-pt-070@example.invalid');

insert into teacher_students(teacher_id, student_id, language_app_key, status) values
  ('70000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000b1', 'frances', 'active'),
  ('70000000-0000-0000-0000-0000000000a1', '70000000-0000-0000-0000-0000000000d1', 'portugues', 'active'),
  ('70000000-0000-0000-0000-0000000000c1', '70000000-0000-0000-0000-0000000000b1', 'mandarim', 'removed');

-- progresso do aluno B: francês + mandarim. O aluno D (vínculo 'portugues')
-- só tem progresso de francês.
insert into progress(user_id, data) values
('70000000-0000-0000-0000-0000000000b1', jsonb_build_object(
  'frances', jsonb_build_object(
    'lastStudyDay', to_char(current_date, 'YYYY-MM-DD'),
    'streak', 4, 'xp', 321, 'totalReviews', 17,
    'progressSummary', jsonb_build_object('levelId', 'A1', 'levelLabel', 'A1', 'pct', 12),
    'unitProgress', jsonb_build_object(
      'A1-1', jsonb_build_object('started', true, 'completed', true),
      'A1-2', jsonb_build_object('started', true, 'completed', false),
      'A1-3', jsonb_build_object('started', false, 'completed', false)),
    'checkpointProgress', jsonb_build_object(
      'M1', jsonb_build_object('completed', true, 'bestScore', 85),
      'M2', jsonb_build_object('completed', false, 'bestScore', 0)),
    'activityLog', jsonb_build_object(
      to_char(current_date, 'YYYY-MM-DD'), 3,
      to_char(current_date - 2, 'YYYY-MM-DD'), 1,
      to_char(current_date - 90, 'YYYY-MM-DD'), 5,
      'lixo', 9),
    'dailyLessonsLog', jsonb_build_object(to_char(current_date, 'YYYY-MM-DD'), 2),
    'dictations', jsonb_build_object('a1-m1-1', jsonb_build_object('bestScore', 90, 'attempts', 2, 'lastAt', '2026-10-01')),
    'completedChallenges', jsonb_build_object('c1', true, 'c2', true, 'c3', false),
    'cards', jsonb_build_array(
      jsonb_build_object('id', 'u1-v0', 'reps', 0, 'state', 'new', 'due', 0),
      jsonb_build_object('id', 'u1-v1', 'reps', 0),
      jsonb_build_object('id', 'u1-v2', 'reps', 2, 'state', 'new', 'due', 1),
      jsonb_build_object('id', 'u1-v3', 'reps', 3, 'state', 'review', 'due', 1, 'lapses', 2),
      jsonb_build_object('id', 'u1-v4', 'reps', 3, 'state', 'review', 'due', 99999999999999),
      jsonb_build_object('id', 'u1-v5', 'reps', 1, 'state', 'relearning', 'due', 99999999999999, 'lapses', 3),
      'lixo'::text)),
  'mandarim', jsonb_build_object('lastStudyDay', '2026-09-01', 'streak', 2, 'xp', 10),
  '_meta', jsonb_build_object('x', 1),
  'streak', 99)),
('70000000-0000-0000-0000-0000000000d1', jsonb_build_object(
  'frances', jsonb_build_object('lastStudyDay', '2026-09-30', 'streak', 1, 'xp', 50)));

insert into own_flashcards(owner_id, language_app_key, front, back_trans, status) values
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'a', 'a', 'active'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'b', 'b', 'active'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'c', 'c', 'archived'),
  ('70000000-0000-0000-0000-0000000000b1', 'mandarim', 'd', 'd', 'active');

insert into usage_events(user_id, language_app_key, event_type, event_name, meta, created_at) values
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'tab_switch', 'review', null, now() - interval '1 hour'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'lesson_complete', 'vocab_lesson', '{"unitId":"A1-1","scorePct":80,"secret":"x"}', now() - interval '2 hours'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'lesson_complete', 'unit_checkpoint', '{"unitId":"A1-1","scorePct":60}', now() - interval '3 hours'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'technical_error', 'js_error', '{"message":"boom"}', now()),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'review_answer', 'flashcard', '{"correct":true,"grade":2}', now() - interval '1 day'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'review_answer', 'flashcard', '{"correct":false,"grade":0}', now() - interval '2 days'),
  ('70000000-0000-0000-0000-0000000000b1', 'frances', 'review_answer', 'flashcard', '{"correct":true,"grade":3}', now() - interval '20 days'),
  ('70000000-0000-0000-0000-0000000000c1', 'frances', 'tab_switch', 'path', null, now());

-- professora A, como authenticated
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-0000000000a1', true); end $$;

create temp table o on commit drop as
  select public.get_teacher_student_overview('70000000-0000-0000-0000-0000000000b1', 'frances') as j;

insert into r select (j ->> 'linkedLanguage') = 'frances', 'linkedLanguage' from o;
insert into r select jsonb_array_length(j -> 'languages') = 2, '2 idiomas (frances+mandarim, ignora chaves soltas/_meta)' from o;
insert into r select (j -> 'languages' -> 0 ->> 'key') = 'frances', 'idioma vinculado vem primeiro' from o;
insert into r select (j -> 'languages' -> 0 ->> 'xp')::int = 321 and (j -> 'languages' -> 0 ->> 'streak')::int = 4, 'xp e streak' from o;
insert into r select (j -> 'languages' -> 0 -> 'unitsCompleted') = '["A1-1"]'::jsonb, 'unidades concluídas' from o;
insert into r select (j -> 'languages' -> 0 ->> 'unitsStarted')::int = 2, 'unidades iniciadas' from o;
insert into r select (j -> 'languages' -> 0 -> 'checkpoints') ? 'M1' and not ((j -> 'languages' -> 0 -> 'checkpoints') ? 'M2'), 'checkpoints só com nota/concluídos' from o;
insert into r select (select count(*) from jsonb_object_keys(j -> 'languages' -> 0 -> 'activityDays')) = 2, 'activityLog: só últimos 40 dias e chaves de data' from o;
insert into r select (j -> 'languages' -> 0 ->> 'challengesCompleted')::int = 2, 'desafios concluídos (só true)' from o;
insert into r select (j -> 'languages' -> 0 -> 'dictations' -> 0 ->> 'bestScore')::int = 90, 'ditados' from o;
insert into r select (j -> 'languages' -> 0 -> 'queue') = '{"total":6,"new":2,"learning":2,"review":2,"due":2,"weak":2}'::jsonb,
  'fila: new/learning/review/due/weak (K1) -> ' || (j -> 'languages' -> 0 -> 'queue')::text from o;
insert into r select (j -> 'languages' -> 0 ->> 'ownCardsActive')::int = 2 and (j -> 'languages' -> 1 ->> 'ownCardsActive')::int = 1, 'cartões próprios: só a contagem de ativos por idioma' from o;
insert into r select jsonb_array_length(j -> 'timeline') = 3, 'timeline: sem técnico, sem review_answer, sem outro usuário' from o;
insert into r select not ((j -> 'timeline' -> 1 -> 'meta') ? 'secret') and (j -> 'timeline' -> 1 -> 'meta' ->> 'scorePct')::int = 80, 'timeline: meta reduzida' from o;
insert into r select (j -> 'timeline' -> 0 ->> 'name') = 'review', 'timeline: mais recente primeiro' from o;
insert into r select (j -> 'answers' ->> 'last7Total')::int = 2 and (j -> 'answers' ->> 'last7Correct')::int = 1
  and (j -> 'answers' ->> 'last30Total')::int = 3 and (j -> 'answers' ->> 'last30Correct')::int = 2, 'acertos 7/30 dias' from o;
insert into r select (j -> 'lessonScores' ->> 'last30Count')::int = 2 and (j -> 'lessonScores' ->> 'last30AvgPct')::int = 70, 'média de lições/checkpoints' from o;

-- vínculo 'portugues' sem progresso em portugues: mostra o francês
insert into r select jsonb_array_length(j -> 'languages') = 1 and (j -> 'languages' -> 0 ->> 'key') = 'frances',
  'vínculo portugues mostra o francês'
  from (select public.get_teacher_student_overview('70000000-0000-0000-0000-0000000000d1', 'portugues') j) x;

-- sem vínculo ativo naquele idioma
insert into r select (public.get_teacher_student_overview('70000000-0000-0000-0000-0000000000b1', 'mandarim') ->> 'error') = 'not_authorized', 'idioma sem vínculo -> not_authorized';
do $$ begin perform set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-0000000000c1', true); end $$;
insert into r select (public.get_teacher_student_overview('70000000-0000-0000-0000-0000000000b1', 'mandarim') ->> 'error') = 'not_authorized', 'vínculo removed -> not_authorized';
do $$ begin perform set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-0000000000b1', true); end $$;
insert into r select (public.get_teacher_student_overview('70000000-0000-0000-0000-0000000000b1', 'frances') ->> 'error') = 'not_authorized', 'o próprio aluno -> not_authorized';
reset role;

insert into r select not has_function_privilege('anon', 'public.get_teacher_student_overview(uuid,text)', 'execute'), 'anon sem EXECUTE';
insert into r select has_function_privilege('authenticated', 'public.get_teacher_student_overview(uuid,text)', 'execute'), 'authenticated com EXECUTE';
insert into r select (select prosecdef from pg_proc where proname = 'get_teacher_student_overview'), 'security definer';
-- a 059 continua existindo e intacta
insert into r select exists(select 1 from pg_proc where proname = 'get_teacher_student_metrics'), 'get_teacher_student_metrics (059) continua';

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'total=' || count(*) || ' falhas=' || count(*) filter (where not ok) from r;
rollback;
