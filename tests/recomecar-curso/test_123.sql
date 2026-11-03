-- Teste da 123 (recomeçar o curso do zero). Transação + ROLLBACK, Postgres local (tests/recomecar-curso/run.sh).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table v(k text primary key, val text) on commit drop;
grant all on v to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;

-- ===== 1. Estrutura =====
insert into r select (select relrowsecurity from pg_class where relname = 'course_restart_backups'), 'RLS ligada na tabela das cópias';
insert into r select (select count(*) from pg_policies where tablename = 'course_restart_backups') = 1
  and exists (select 1 from pg_policies where tablename = 'course_restart_backups' and policyname = 'course_restart_backups_owner_select' and cmd = 'SELECT'),
  'uma política só: o dono lê (123 aplicada duas vezes)';
insert into r select (select count(*) from pg_trigger where tgname = 'progress_guard_restart_epoch') = 1, 'gatilho da época criado uma vez só';
insert into r select has_function_privilege('authenticated', 'public.restart_course(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.undo_restart_course(bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.get_teacher_student_restarts(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.restart_course(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.undo_restart_course(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_teacher_student_restarts(uuid,text)', 'EXECUTE'), 'RPCs: authenticated sim, anon não';
insert into r select not has_function_privilege('authenticated', 'public.purge_expired_course_restart_backups()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._restart_notify_teachers(uuid,text,text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._is_account_badge(text)', 'EXECUTE'), 'funções internas fechadas';
insert into r select (select bool_and(prosecdef) from pg_proc where proname in ('restart_course', 'undo_restart_course', 'get_teacher_student_restarts', 'purge_expired_course_restart_backups', '_restart_notify_teachers'))
  and (select bool_and(proconfig::text like '%search_path=public%') from pg_proc where proname in ('restart_course', 'undo_restart_course', 'get_teacher_student_restarts', '_progress_guard_restart_epoch')),
  'security definer + search_path';
insert into r select public._is_account_badge('streak.2') and public._is_account_badge('first_step') and public._is_account_badge('days.1')
  and not public._is_account_badge('course1.1') and not public._is_account_badge('unit_1') and not public._is_account_badge('multitasker')
  and not public._is_account_badge(null), 'conquista da conta x do curso';

-- ===== 2. Contas =====
-- T professora (site em inglês) com vínculo de francês com S; S aluna (francês + mandarim + zh antigo na raiz);
-- U aluna com dois cursos de francês (frances e frances@en); X outra conta.
insert into v values ('T', '12300000-0000-0000-0000-0000000000a1'), ('S', '12300000-0000-0000-0000-0000000000b1'),
                     ('U', '12300000-0000-0000-0000-0000000000b2'), ('X', '12300000-0000-0000-0000-0000000000b3');
insert into auth.users(id, email) select val::uuid, k || '123@x.invalid' from v;
insert into profiles(user_id, display_name) values (pg_temp.g('T')::uuid, 'Tereza Prof'), (pg_temp.g('S')::uuid, 'Sofia'),
  (pg_temp.g('U')::uuid, 'Úrsula'), (pg_temp.g('X')::uuid, 'Xavier')
  on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values (pg_temp.g('T')::uuid, 'teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values (pg_temp.g('T')::uuid, pg_temp.g('S')::uuid, 'frances', 'active');

insert into progress(user_id, data) values
 (pg_temp.g('T')::uuid, '{"_meta":{"uiLanguage":"en"},"frances@en":{"xp":1}}'),
 (pg_temp.g('S')::uuid, $j${
   "_meta": {"uiLanguage": "pt-BR", "currentCourse": "frances@pt-BR", "courses": {"frances@pt-BR": {"storageKey": "frances", "startedAt": null}}},
   "_account": {"streak": 5, "lastStudyDay": "2026-10-29", "bestStreak": 12, "activityLog": {"2026-10-28": 2, "2026-10-29": 3}},
   "_lang": {"frances": {"v": 1, "cards": [{"id": "t1", "origin": "teacher", "rowId": 1, "reps": 3, "stability": 2.5}], "updatedAt": "2026-10-29T10:00:00Z"}},
   "frances": {
     "cards": [{"id": "u1", "origin": "study", "reps": 4, "released": true, "stability": 3.1, "due": 1},
               {"id": "t1", "origin": "teacher", "rowId": 1, "flashcardStatus": "active", "reps": 3, "stability": 2.5},
               {"id": "u2", "reps": 1, "released": true},
               {"id": "s2", "origin": "self", "rowId": 2, "reps": 1},
               {"id": "t9", "reps": 2}],
     "unitProgress": {"1": {"started": true, "completed": true, "lessonIdx": 0}}, "checkpointProgress": {"m1": {"completed": true, "bestScore": 90}},
     "levelTestProgress": {"a1": {"passed": true}}, "reviewMilestones": {"m1": {"done": 1}},
     "xp": 500, "totalReviews": 50, "totalAudioPlays": 70, "everUsedSpeedReview": true, "modesUsed": {"speed": true},
     "reviewRecords": {"speedBestScore": 9}, "reviewTimeStats": {"cards": 5, "ms": 9000}, "dailyMinutesLog": {"2026-10-29": 12},
     "periodXp": {"weekStart": "2026-10-26", "amount": 40}, "daily": {"date": "2026-10-29", "missions": ["a"]},
     "completedChallenges": {"c1": true}, "challengeReviews": {"c1": {"due": 5}}, "dictations": {"d1": {"bestScore": 90}}, "dictationsAced": 2,
     "welcome": {"a": "2026-10-01"}, "retiredStudyCards": [{"id": "u0", "reps": 2}], "_curriculumVersion": 3, "cardVariants": {"u1": {"x": {"reps": 1}}},
     "progressSummary": {"levelId": "a1", "pct": 20},
     "streak": 5, "lastStudyDay": "2026-10-29", "lastReviewReminderDay": "2026-10-28", "activityLog": {"2026-10-29": 3},
     "dailyLessonsLog": {"2026-10-29": 1}, "hadStreakComeback": true, "bestStreak": 12,
     "studyGoal": {"minutes": 10, "reminder": "19:00"}, "studySettings": {"newCardsPerDay": 10}
   },
   "mandarim": {"cards": [{"id": "u5", "reps": 2, "stability": 1}], "hanziCards": [{"id": "h1", "reps": 1}], "hanziLessonProgress": {"1": {"done": true}},
                "storyProgress": {"s1": {"done": true}}, "xp": 100, "periodXp": {"weekStart": "2026-10-26", "amount": 10}, "streak": 2},
   "cards": [{"id": "raiz-antiga", "reps": 9}], "xp": 77
 }$j$),
 (pg_temp.g('U')::uuid, $j${
   "_meta": {"uiLanguage": "en"},
   "frances": {"cards": [{"id": "u1", "reps": 2}], "xp": 300, "periodXp": {"weekStart": "2026-10-26", "amount": 30}, "unitProgress": {"1": {"completed": true}}},
   "frances@en": {"cards": [{"id": "u1", "reps": 1}], "xp": 50, "periodXp": {"weekStart": "2026-10-26", "amount": 20}, "unitProgress": {"1": {"started": true}}}
 }$j$),
 (pg_temp.g('X')::uuid, '{"frances":{"xp":9,"cards":[{"id":"u1","reps":1}]}}');

insert into weekly_xp(user_id, week_start, language_app_key, amount, updated_at) values
 (pg_temp.g('S')::uuid, '2026-10-19', 'frances', 100, '2026-10-25 10:00Z'), (pg_temp.g('S')::uuid, '2026-10-26', 'frances', 40, '2026-10-29 10:00Z'),
 (pg_temp.g('S')::uuid, '2026-10-26', 'mandarim', 10, '2026-10-29 11:00Z'),
 (pg_temp.g('U')::uuid, '2026-10-19', 'frances', 80, '2026-10-25 10:00Z'), (pg_temp.g('U')::uuid, '2026-10-26', 'frances', 50, '2026-10-29 10:00Z'),
 (pg_temp.g('X')::uuid, '2026-10-26', 'frances', 9, '2026-10-29 10:00Z');
insert into earned_badges(user_id, language_app_key, badge_id, earned_at) values
 (pg_temp.g('S')::uuid, 'frances', 'course1.1', '2026-10-02Z'), (pg_temp.g('S')::uuid, 'frances', 'ear.1', '2026-10-03Z'),
 (pg_temp.g('S')::uuid, 'frances', 'unit_1', '2026-10-04Z'), (pg_temp.g('S')::uuid, 'frances', 'streak.2', '2026-10-05Z'),
 (pg_temp.g('S')::uuid, 'frances', 'first_step', '2026-10-01Z'), (pg_temp.g('S')::uuid, 'mandarim', 'course1.1', '2026-10-06Z'),
 (pg_temp.g('U')::uuid, 'frances', 'course1.1', '2026-10-02Z'), (pg_temp.g('U')::uuid, 'frances', 'vocab.1', '2026-10-03Z'),
 (pg_temp.g('X')::uuid, 'frances', 'course1.1', '2026-10-02Z');

create temp table snap on commit drop as
  select user_id, data, (select md5(string_agg(concat_ws('|', week_start, language_app_key, amount, updated_at), ',' order by week_start, language_app_key)) from weekly_xp w where w.user_id = p.user_id) wx,
         (select md5(string_agg(concat_ws('|', language_app_key, badge_id, earned_at), ',' order by language_app_key, badge_id)) from earned_badges b where b.user_id = p.user_id) eb
    from progress p;
grant all on snap to public;
create or replace function pg_temp.before_data(u text) returns jsonb language sql as $$ select data from snap where user_id = u::uuid $$;
grant execute on function pg_temp.before_data(text) to public;
create or replace function pg_temp.wx(u text) returns text language sql as $$ select md5(string_agg(concat_ws('|', week_start, language_app_key, amount, updated_at), ',' order by week_start, language_app_key)) from weekly_xp where user_id = u::uuid $$;
create or replace function pg_temp.eb(u text) returns text language sql as $$ select md5(string_agg(concat_ws('|', language_app_key, badge_id, earned_at), ',' order by language_app_key, badge_id)) from earned_badges where user_id = u::uuid $$;
grant execute on function pg_temp.wx(text), pg_temp.eb(text) to public;

-- ===== 3. Quem pode =====
select pg_temp.as_user(null); set local role authenticated;
insert into r select (public.restart_course('frances')->>'error') = 'not_authenticated', 'sem login: not_authenticated';
reset role;
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into r select (public.restart_course('_lang')->>'error') = 'invalid_course' and (public.restart_course('_account')->>'error') = 'invalid_course'
  and (public.restart_course('ingles')->>'error') = 'invalid_course' and (public.restart_course('frances''; select 1')->>'error') = 'invalid_course'
  and (public.restart_course(null)->>'error') = 'invalid_course', 'chave inválida (_lang, _account, idioma fora da lista, injeção, null)';
insert into r select (public.restart_course('frances@en')->>'error') = 'no_course', 'curso sem bloco: no_course';
insert into r select pg_temp.try($q$insert into course_restart_backups(user_id, course_key, app_key, epoch, only_course) values (auth.uid(), 'frances', 'frances', 1, true)$q$) = '42501'
  and pg_temp.try($q$update course_restart_backups set restored_at = now()$q$) = '42501'
  and pg_temp.try($q$delete from course_restart_backups$q$) = '42501', 'aluna não escreve na tabela das cópias direto';
reset role;
insert into r select (select data from progress where user_id = pg_temp.g('S')::uuid) = pg_temp.before_data(pg_temp.g('S')), 'nada mudou depois das recusas';

-- ===== 4. Recomeçar o francês da S =====
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into v select 'res1', public.restart_course('frances')::text;
reset role;
insert into v select 'b1', (pg_temp.g('res1')::jsonb->>'backup_id');
insert into r select (pg_temp.g('res1')::jsonb->>'ok') = 'true' and (pg_temp.g('res1')::jsonb->>'epoch') = '1'
  and (pg_temp.g('res1')::jsonb->>'only_course') = 'true', 'recomeço ok, época 1, único curso de francês';
create temp table after1 on commit drop as select data d from progress where user_id = pg_temp.g('S')::uuid;
insert into r select (select d->'frances'->'cards' from after1) = '[{"id": "t1", "origin": "teacher", "rowId": 1, "flashcardStatus": "active", "reps": 3, "stability": 2.5},
   {"id": "s2", "origin": "self", "rowId": 2, "reps": 1}, {"id": "t9", "reps": 2}]'::jsonb,
  'ficam só os cartões da professora e próprios, com a memória igual e na mesma ordem (u1/u2 da trilha saem, released junto)';
insert into r select (select (d->'frances') - array['cards', 'restartEpoch', 'restartedAt'] from after1)
  = (pg_temp.before_data(pg_temp.g('S'))->'frances') - array(select k from jsonb_object_keys(pg_temp.before_data(pg_temp.g('S'))->'frances') k
        where k not in ('streak', 'lastStudyDay', 'lastReviewReminderDay', 'activityLog', 'dailyLessonsLog', 'hadStreakComeback', 'bestStreak', 'studyGoal', 'studySettings', '_curriculumVersion')),
  'ficam iguais: espelho da sequência, recorde, meta/lembrete, ajustes da Revisão, versão do currículo';
insert into r select not ((select d->'frances' from after1) ?| array['unitProgress', 'checkpointProgress', 'levelTestProgress', 'reviewMilestones', 'xp', 'totalReviews',
  'totalAudioPlays', 'everUsedSpeedReview', 'modesUsed', 'reviewRecords', 'reviewTimeStats', 'dailyMinutesLog', 'periodXp', 'daily', 'completedChallenges',
  'challengeReviews', 'dictations', 'dictationsAced', 'welcome', 'retiredStudyCards', 'cardVariants', 'progressSummary']),
  'zeram: trilha, pontos de verificação, Teste de Nível, XP, contadores, missões, Desafios, Ditados, boas-vindas, arquivo e gaveta';
insert into r select (select (d->'frances'->>'restartEpoch')::int = 1 and (d->'frances'->>'restartedAt') is not null from after1), 'bloco ganha restartEpoch 1 e restartedAt';
insert into r select (select d - 'frances' from after1) = pg_temp.before_data(pg_temp.g('S')) - 'frances',
  'resto da linha byte a byte: _account (recorde), _lang, _meta, mandarim, zh antigo da raiz';
insert into r select (select (d->'_account'->>'bestStreak')::int = 12 and (d->'_lang') = pg_temp.before_data(pg_temp.g('S'))->'_lang' from after1), '_account.bestStreak e _lang intactos';
insert into r select (select block from course_restart_backups where id = pg_temp.g('b1')::bigint) = pg_temp.before_data(pg_temp.g('S'))->'frances'
  and (select (block)::text from course_restart_backups where id = pg_temp.g('b1')::bigint) = (pg_temp.before_data(pg_temp.g('S'))->'frances')::text,
  'cópia fiel do bloco (igual e mesmo texto)';
insert into r select (select expires_at - created_at = interval '30 days' and epoch = 1 and only_course and restored_at is null and app_key = 'frances'
                        and jsonb_array_length(weekly_xp) = 2 and jsonb_array_length(earned_badges) = 3 from course_restart_backups where id = pg_temp.g('b1')::bigint),
  'cópia vale 30 dias e guarda as 2 semanas e as 3 conquistas apagadas';
insert into r select (select count(*) from weekly_xp where user_id = pg_temp.g('S')::uuid and language_app_key = 'frances') = 0
  and (select amount from weekly_xp where user_id = pg_temp.g('S')::uuid and language_app_key = 'mandarim') = 10, 'Ranking: semanas do francês saem; mandarim fica';
insert into r select (select array_agg(language_app_key || ':' || badge_id order by language_app_key, badge_id)::text from earned_badges where user_id = pg_temp.g('S')::uuid)
  = '{frances:first_step,frances:streak.2,mandarim:course1.1}', 'conquistas: saem as do curso (course1, ear, unit_1); ficam as da conta e as do mandarim';
insert into r select (select data from progress where user_id = pg_temp.g('U')::uuid) = pg_temp.before_data(pg_temp.g('U'))
  and (select data from progress where user_id = pg_temp.g('X')::uuid) = pg_temp.before_data(pg_temp.g('X'))
  and pg_temp.wx(pg_temp.g('U')) = (select wx from snap where user_id = pg_temp.g('U')::uuid) and pg_temp.eb(pg_temp.g('X')) = (select eb from snap where user_id = pg_temp.g('X')::uuid),
  'outras contas intactas (progresso, Ranking, conquistas)';
insert into r select (select count(*) = 1 and bool_and(audience = 'teacher' and category = 'supervisao' and language_app_key = 'frances'
                        and body = 'Sofia restarted the French course from zero.' and params->>'name' = 'Sofia' and params->>'course' = 'frances')
                        from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'student_course_restart'),
  'professora avisada no sino dela, no idioma do site dela (inglês)';
insert into r select (select count(*) from notifications where user_id = pg_temp.g('S')::uuid) = 0, 'aluna não recebe aviso';

-- RLS de leitura
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into r select (select count(*) from course_restart_backups) = 1, 'a dona vê a própria cópia';
reset role;
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select (select count(*) from course_restart_backups) = 0, 'outra conta não vê a cópia';
insert into r select (public.undo_restart_course(pg_temp.g('b1')::bigint)->>'error') = 'not_found', 'outra conta não desfaz (not_found)';
insert into r select (public.get_teacher_student_restarts(pg_temp.g('S')::uuid, 'frances')->>'error') = 'not_authorized', 'conta sem vínculo não vê os recomeços da aluna';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select jsonb_array_length(public.get_teacher_student_restarts(pg_temp.g('S')::uuid, 'frances')->'restarts') = 1
  and (public.get_teacher_student_restarts(pg_temp.g('S')::uuid, 'frances')->'restarts'->0->>'course_key') = 'frances'
  and (public.get_teacher_student_restarts(pg_temp.g('S')::uuid, 'mandarim')->>'error') = 'not_authorized', 'professora vinculada vê "recomeçou em" (só no idioma do vínculo)';
reset role;

-- ===== 5. Aba antiga =====
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
-- aba com o código antigo: grava o bloco velho (sem época) e mexe no _account na mesma gravação
update progress set data = jsonb_set(jsonb_set(data, '{frances}', pg_temp.before_data(pg_temp.g('S'))->'frances'), '{_account,streak}', '6') where user_id = auth.uid();
reset role;
insert into r select (select data->'frances' from progress where user_id = pg_temp.g('S')::uuid) = (select d->'frances' from after1)
  and (select (data->'_account'->>'streak')::int from progress where user_id = pg_temp.g('S')::uuid) = 6,
  'aba antiga (sem época) não grava o bloco por cima; o resto da gravação passa';
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
update progress set data = jsonb_set(data, '{frances}', (pg_temp.before_data(pg_temp.g('S'))->'frances') || '{"restartEpoch": 0}') where user_id = auth.uid();
update progress set data = data - 'frances' where user_id = auth.uid();
reset role;
insert into r select (select data->'frances' from progress where user_id = pg_temp.g('S')::uuid) = (select d->'frances' from after1), 'época menor ou bloco sumido: o servidor fica com o bloco recomeçado';
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
update progress set data = jsonb_set(data, '{frances}', (data->'frances') || '{"xp": 12, "periodXp": {"weekStart": "2026-10-26", "amount": 12}}') where user_id = auth.uid();
reset role;
insert into r select (select (data->'frances'->>'xp')::int from progress where user_id = pg_temp.g('S')::uuid) = 12, 'aba nova (mesma época) grava normalmente';
insert into weekly_xp(user_id, week_start, language_app_key, amount, updated_at) values (pg_temp.g('S')::uuid, '2026-10-26', 'frances', 12, now());
update progress set data = jsonb_set(data, '{_account,streak}', '5') where user_id = pg_temp.g('S')::uuid;

-- ===== 6. Desfazer =====
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into v select 'undo1', public.undo_restart_course(pg_temp.g('b1')::bigint)::text;
reset role;
insert into r select (pg_temp.g('undo1')::jsonb->>'ok') = 'true' and (pg_temp.g('undo1')::jsonb->>'epoch') = '2', 'desfazer ok, época 2';
insert into r select ((select data->'frances' from progress where user_id = pg_temp.g('S')::uuid) - 'restartEpoch')::text = (pg_temp.before_data(pg_temp.g('S'))->'frances')::text
  and (select (data->'frances'->>'restartEpoch')::int from progress where user_id = pg_temp.g('S')::uuid) = 2,
  'bloco volta byte a byte (só ganha restartEpoch 2); o estudo feito depois do recomeço é descartado';
insert into r select (select data from progress where user_id = pg_temp.g('S')::uuid) - 'frances' = pg_temp.before_data(pg_temp.g('S')) - 'frances', 'resto da linha igual ao de antes';
insert into r select pg_temp.wx(pg_temp.g('S')) = (select wx from snap where user_id = pg_temp.g('S')::uuid), 'Ranking volta igual (semanas, valores e datas)';
insert into r select pg_temp.eb(pg_temp.g('S')) = (select eb from snap where user_id = pg_temp.g('S')::uuid), 'conquistas voltam iguais (com a data de antes)';
insert into r select (select restored_at is not null from course_restart_backups where id = pg_temp.g('b1')::bigint), 'cópia marcada como desfeita';
insert into r select (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'student_course_restart_undo'
                        and body = 'Sofia undid the restart of the French course.') = 1, 'professora avisada do desfazer';
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into r select (public.undo_restart_course(pg_temp.g('b1')::bigint)->>'error') = 'already_restored', 'desfazer duas vezes: already_restored';
-- aba aberta durante o recomeço (época 1) não grava por cima do desfeito
update progress set data = jsonb_set(data, '{frances}', '{"restartEpoch": 1, "xp": 3}') where user_id = auth.uid();
reset role;
insert into r select ((select data->'frances' from progress where user_id = pg_temp.g('S')::uuid) - 'restartEpoch')::text = (pg_temp.before_data(pg_temp.g('S'))->'frances')::text,
  'aba que carregou o curso recomeçado (época 1) não grava por cima do desfeito (época 2)';

-- ===== 7. Recomeçar de novo; só o último se desfaz =====
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into v select 'b2', public.restart_course('frances')->>'backup_id';
insert into v select 'b3', public.restart_course('frances')->>'backup_id';
insert into r select (public.undo_restart_course(pg_temp.g('b2')::bigint)->>'error') = 'superseded', 'cópia antiga (outro recomeço depois): superseded';
insert into r select (public.undo_restart_course(pg_temp.g('b3')::bigint)->>'ok') = 'true', 'a última desfaz';
reset role;
insert into r select (select (data->'frances'->>'restartEpoch')::int from progress where user_id = pg_temp.g('S')::uuid) = 5
  and (select data->'frances'->'cards' from progress where user_id = pg_temp.g('S')::uuid) = (select d->'frances'->'cards' from after1),
  'desfazer o 2º recomeço volta ao 1º recomeço (época 5)';

-- ===== 8. Mandarim (zh antigo na raiz) =====
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into v select 'z1', public.restart_course('mandarim')::text;
reset role;
insert into r select (select data ? 'mandarim' and data->'mandarim'->'cards' = '[]'::jsonb and not (data->'mandarim' ?| array['hanziCards', 'hanziLessonProgress', 'storyProgress', 'xp'])
                        and (data->'mandarim'->>'streak')::int = 2 and data->'cards' = '[{"id": "raiz-antiga", "reps": 9}]'::jsonb and (data->>'xp')::int = 77
                        from progress where user_id = pg_temp.g('S')::uuid),
  'zh: hanzi, lições de hanzi e histórias zeram; a chave fica (não ressuscita a raiz antiga), raiz intocada';
insert into r select (select count(*) from weekly_xp where user_id = pg_temp.g('S')::uuid and language_app_key = 'mandarim') = 0
  and (select count(*) from earned_badges where user_id = pg_temp.g('S')::uuid and language_app_key = 'mandarim') = 0
  and (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'student_course_restart') = 3,
  'zh: Ranking e conquistas do chinês saem; sem vínculo de chinês, a professora de francês não recebe aviso';

-- ===== 9. Vencida =====
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into v select 'b4', public.restart_course('frances')->>'backup_id';
reset role;
update course_restart_backups set expires_at = now() - interval '1 second' where id = pg_temp.g('b4')::bigint;
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into r select (public.undo_restart_course(pg_temp.g('b4')::bigint)->>'error') = 'expired', 'depois de 30 dias não desfaz (expired)';
reset role;
insert into r select (select block is null and weekly_xp is null and earned_badges is null and purged_at is not null from course_restart_backups where id = pg_temp.g('b4')::bigint),
  'cópia vencida é esvaziada (o registro "recomeçou em" fica)';
insert into r select (select count(*) from course_restart_backups where purged_at is null and expires_at <= now()) = 0, 'limpeza: nenhuma vencida com dados';

-- ===== 10. Dois cursos do mesmo idioma (U) =====
select pg_temp.as_user(pg_temp.g('U')); set local role authenticated;
insert into v select 'u1', public.restart_course('frances@en')::text;
reset role;
insert into r select (pg_temp.g('u1')::jsonb->>'only_course') = 'false'
  and (select amount from weekly_xp where user_id = pg_temp.g('U')::uuid and week_start = '2026-10-26') = 30
  and (select amount from weekly_xp where user_id = pg_temp.g('U')::uuid and week_start = '2026-10-19') = 80,
  'outro curso do francês: só a semana atual perde o XP deste curso (50 - 20 = 30); semanas passadas ficam';
insert into r select pg_temp.eb(pg_temp.g('U')) = (select eb from snap where user_id = pg_temp.g('U')::uuid)
  and (select data->'frances' from progress where user_id = pg_temp.g('U')::uuid) = pg_temp.before_data(pg_temp.g('U'))->'frances',
  'outro curso: conquistas do idioma e o bloco frances intactos';
-- estudou 5 XP no curso recomeçado e desfaz
update progress set data = jsonb_set(data, '{frances@en}', (data->'frances@en') || '{"xp": 5, "periodXp": {"weekStart": "2026-10-26", "amount": 5}}') where user_id = pg_temp.g('U')::uuid;
update weekly_xp set amount = 35 where user_id = pg_temp.g('U')::uuid and week_start = '2026-10-26';
select pg_temp.as_user(pg_temp.g('U')); set local role authenticated;
insert into r select (public.undo_restart_course((pg_temp.g('u1')::jsonb->>'backup_id')::bigint)->>'ok') = 'true', 'outro curso: desfazer ok';
reset role;
insert into r select (select amount from weekly_xp where user_id = pg_temp.g('U')::uuid and week_start = '2026-10-26') = 50
  and ((select data->'frances@en' from progress where user_id = pg_temp.g('U')::uuid) - 'restartEpoch') = pg_temp.before_data(pg_temp.g('U'))->'frances@en',
  'outro curso: semana volta a 50 (35 - 5 + 20) e o bloco volta igual';
insert into r select (select count(*) from notifications where user_id = pg_temp.g('U')::uuid or event_type like 'student_course_restart%' and params->>'name' = 'Úrsula') = 0,
  'sem vínculo: ninguém é avisado';

-- ===== 11. Professora com site em português =====
update progress set data = jsonb_set(data, '{_meta,uiLanguage}', '"pt-BR"') where user_id = pg_temp.g('T')::uuid;
select pg_temp.as_user(pg_temp.g('S')); set local role authenticated;
insert into v select 'last', public.restart_course('frances')::text;
reset role;
insert into r select (select body from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'student_course_restart' order by id desc limit 1)
  = 'Sofia recomeçou do zero o curso de francês.', 'professora com site em português recebe a frase em português';

select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
select 'RESULTADO 123 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
