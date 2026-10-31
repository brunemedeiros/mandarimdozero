-- 123 -- Recomeçar o curso do zero, com cópia de segurança de 30 dias para desfazer (2026-10-30).
--
-- Decisões da dona (2026-10-29/30, docs/recomecar-curso-opcoes.md, seção "Decisões da dona" e "Implementação"):
--   - Só existe "recomeçar do zero" do curso aberto (o par idioma estudado x idioma do site = um bloco de progress.data).
--   - ZERA no bloco: trilha (unitProgress, Ponto de verificação, Teste de Nível, Revisão do módulo; zh: hanzi, lições de hanzi,
--     histórias), memória FSRS dos cartões DA TRILHA (e a marca `released`, o arquivo `retiredStudyCards`, a gaveta
--     `cardVariants`), XP e XP da semana do curso, contadores (revisões, áudios, modos, recordes, tempo), missões do dia,
--     Desafios, Ditados, boas-vindas da 1ª lição.
--   - FICA no bloco: cartões da professora e próprios com a memória (origin teacher/self; a cópia do idioma em `_lang` nem é
--     tocada), espelho da sequência da conta (streak, lastStudyDay, activityLog, dailyLessonsLog, hadStreakComeback,
--     lastReviewReminderDay, bestStreak), preferências (studyGoal = meta e lembrete, studySettings = ajustes da Revisão) e
--     _curriculumVersion. Fora do bloco nada da conta muda: `_account`, `_lang`, `_meta`, outros cursos, Decks, cartões,
--     vínculo, Banco de Revisão, amigos, study_days, missões em dupla, badge_grants.
--   - Ranking (weekly_xp) e conquistas (earned_badges) são por IDIOMA estudado, não por curso:
--       * único curso com progresso desse idioma: apaga TODAS as linhas de weekly_xp do idioma e as conquistas do idioma
--         que não são da conta (as da conta, como sequência e dias estudados, valem em todos os idiomas e ficam);
--       * existe outro curso do mesmo idioma com XP (ex.: frances + frances@en): não dá para separar o que foi de cada
--         curso nas semanas passadas nem nas conquistas, então só a semana atual perde o XP deste curso; o resto fica.
--     Tudo o que é apagado ou mudado vai para a cópia.
--   - Cópia por 30 dias; desfazer devolve o bloco exatamente como era (só ganha a nova época) e as linhas de weekly_xp e
--     earned_badges. Depois de 30 dias a cópia é esvaziada (o registro "recomeçou em" fica para o painel da professora).
--   - Aluno vinculado recomeça sozinho; a professora recebe aviso no sino dela (108), no idioma do site dela.
--   - Tudo grátis.
--
-- Época (aba antiga): o bloco recomeçado ganha `restartEpoch` (+1 a cada recomeço ou desfazer). O site novo lembra a época
-- que carregou e se recusa a gravar (e recarrega) quando o servidor tem uma maior. Para abas abertas com o código ANTIGO
-- (que não conhecem a época), o gatilho progress_guard_restart_epoch devolve o bloco do servidor quando a gravação traz
-- uma época menor (o resto da linha grava normalmente). Bloco sem `restartEpoch` (todos hoje) não é afetado.
--
-- Sem DROP. Contém DELETE (weekly_xp e earned_badges, dentro das funções). Idempotente.

-- 1. Tabela das cópias ------------------------------------------------------------------------------------------
create table if not exists public.course_restart_backups (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_key text not null,                 -- chave do bloco em progress.data (frances, frances@en, mandarim...)
  app_key text not null,                    -- idioma estudado (frances, mandarim, portugues)
  epoch integer not null,                   -- época gravada no bloco pelo recomeço
  only_course boolean not null,             -- era o único curso com XP desse idioma (decide weekly_xp/earned_badges)
  block jsonb,                              -- bloco do curso como estava (null depois de vencer)
  weekly_xp jsonb,                          -- linhas de weekly_xp do idioma antes do recomeço
  weekly_adjust jsonb,                      -- {week, amount}: o que saiu da semana atual quando há outro curso do idioma
  earned_badges jsonb,                      -- conquistas do idioma apagadas
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  restored_at timestamptz,                  -- desfeito
  superseded_at timestamptz,                -- outro recomeço do mesmo curso veio depois: esta cópia não desfaz mais
  purged_at timestamptz                     -- venceu: os dados da cópia foram apagados
);
create index if not exists course_restart_backups_user_course_idx
  on public.course_restart_backups (user_id, course_key, created_at desc);

alter table public.course_restart_backups enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_restart_backups'
                  and policyname = 'course_restart_backups_owner_select') then
    create policy course_restart_backups_owner_select on public.course_restart_backups
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
-- Escrita só pelas funções abaixo (security definer).
revoke insert, update, delete, truncate on public.course_restart_backups from public, anon, authenticated;
revoke select on public.course_restart_backups from anon;
grant select on public.course_restart_backups to authenticated;

-- 2. Ajudantes ----------------------------------------------------------------------------------------------------
-- Conquista da CONTA (vale em todos os idiomas; AccountProgress.isAccountBadge + BadgeTracks scope 'account').
create or replace function public._is_account_badge(p_id text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_id in ('first_step', 'streak_3', 'streak_7', 'xp_100', 'xp_500', 'reviews_100', 'comeback', 'weekend')
    or p_id ~ '^(days|review|streak|xp|weekend|podium|duo|friends|comeback)\.[0-9]+$', false);
$$;
revoke all on function public._is_account_badge(text) from public, anon, authenticated;

create or replace function public._restart_epoch_of(p_block jsonb)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when jsonb_typeof(p_block) = 'object' and jsonb_typeof(p_block->'restartEpoch') = 'number'
              then floor((p_block->>'restartEpoch')::numeric)::integer else 0 end;
$$;
revoke all on function public._restart_epoch_of(jsonb) from public, anon, authenticated;

-- XP da semana p_week guardado num bloco (periodXp), 0 se for de outra semana.
create or replace function public._block_week_xp(p_block jsonb, p_week date)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when jsonb_typeof(p_block) = 'object' and jsonb_typeof(p_block->'periodXp') = 'object'
               and p_block->'periodXp'->>'weekStart' = p_week::text
               and jsonb_typeof(p_block->'periodXp'->'amount') = 'number'
              then greatest(0, floor((p_block->'periodXp'->>'amount')::numeric))::integer else 0 end;
$$;
revoke all on function public._block_week_xp(jsonb, date) from public, anon, authenticated;

-- Cópias vencidas: apaga os dados (bloco, linhas), fica o registro de que houve recomeço.
create or replace function public.purge_expired_course_restart_backups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  update public.course_restart_backups
     set block = null, weekly_xp = null, weekly_adjust = null, earned_badges = null, purged_at = now()
   where purged_at is null and expires_at <= now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.purge_expired_course_restart_backups() from public, anon, authenticated;

-- Aviso no sino da professora (108: categoria supervisao -> audience teacher), no idioma do site DELA.
create or replace function public._restart_notify_teachers(p_student uuid, p_app text, p_course_key text, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_name text;
  v_label text := public._lang_label(p_app);
  v_body text;
begin
  select coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), '')) into v_name from public.profiles where user_id = p_student;
  for r in select teacher_id from public.teacher_students
            where student_id = p_student and language_app_key = p_app and status = 'active' and teacher_id <> p_student loop
    if public._ui_lang(r.teacher_id) = 'en' then
      v_body := coalesce(v_name, 'A student') || case when p_event = 'student_course_restart'
        then ' restarted the ' || public._lang_label_en(v_label) || ' course from zero.'
        else ' undid the restart of the ' || public._lang_label_en(v_label) || ' course.' end;
    else
      v_body := coalesce(v_name, 'Um aluno') || case when p_event = 'student_course_restart'
        then ' recomeçou do zero o curso de ' || v_label || '.'
        else ' desfez o recomeço do curso de ' || v_label || '.' end;
    end if;
    insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab, params, audience)
    values (r.teacher_id, p_app, 'supervisao', p_event, null, v_body, 'teacher-panel',
            jsonb_build_object('name', coalesce(v_name, ''), 'course', p_course_key, 'student_id', p_student), 'teacher');
  end loop;
end;
$$;
revoke all on function public._restart_notify_teachers(uuid, text, text, text) from public, anon, authenticated;

-- 3. Recomeçar ----------------------------------------------------------------------------------------------------
create or replace function public.restart_course(p_course_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_app text;
  v_data jsonb;
  v_block jsonb;
  v_epoch integer;
  v_new jsonb;
  v_cards jsonb;
  v_other boolean;
  v_weekly jsonb;
  v_badges jsonb;
  v_adjust jsonb;
  v_week date;
  v_amount integer;
  v_id bigint;
  v_now timestamptz := now();
  k text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_course_key is null or p_course_key !~ '^[a-z]+(@[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?)?$' then
    return jsonb_build_object('error', 'invalid_course');
  end if;
  v_app := split_part(p_course_key, '@', 1);
  if v_app not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_course'); end if;

  select data into v_data from public.progress where user_id = v_me for update;
  v_block := v_data -> p_course_key;
  if v_block is null or jsonb_typeof(v_block) <> 'object' then return jsonb_build_object('error', 'no_course'); end if;

  perform public.purge_expired_course_restart_backups();

  v_epoch := public._restart_epoch_of(v_block) + 1;

  -- Cartões que ficam: os da professora e os próprios (mesma regra de tests/p1-memoria-por-idioma).
  select coalesce(jsonb_agg(x.c order by x.ord), '[]'::jsonb) into v_cards
    from jsonb_array_elements(case when jsonb_typeof(v_block->'cards') = 'array' then v_block->'cards' else '[]'::jsonb end)
         with ordinality as x(c, ord)
   where jsonb_typeof(x.c) = 'object'
     and (coalesce(x.c->>'origin', '') in ('teacher', 'self') or (x.c->>'origin' is null and x.c->>'id' ~ '^[ts][0-9]'));

  v_new := jsonb_build_object('cards', v_cards, 'restartEpoch', v_epoch, 'restartedAt', to_jsonb(v_now));
  foreach k in array array['streak', 'lastStudyDay', 'lastReviewReminderDay', 'activityLog', 'dailyLessonsLog',
                           'hadStreakComeback', 'bestStreak', 'studyGoal', 'studySettings', '_curriculumVersion'] loop
    if v_block ? k then v_new := v_new || jsonb_build_object(k, v_block -> k); end if;
  end loop;

  -- Outro curso do mesmo idioma com XP?
  select exists (
    select 1 from jsonb_each(v_data) e
     where left(e.key, 1) <> '_' and e.key <> p_course_key and split_part(e.key, '@', 1) = v_app
       and jsonb_typeof(e.value) = 'object' and jsonb_typeof(e.value->'xp') = 'number' and (e.value->>'xp')::numeric > 0
  ) into v_other;

  select coalesce(jsonb_agg(to_jsonb(w) order by w.week_start), '[]'::jsonb) into v_weekly
    from public.weekly_xp w where w.user_id = v_me and w.language_app_key = v_app;

  if not v_other then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.badge_id), '[]'::jsonb) into v_badges
      from public.earned_badges b
     where b.user_id = v_me and b.language_app_key = v_app and not public._is_account_badge(b.badge_id);
    delete from public.weekly_xp where user_id = v_me and language_app_key = v_app;
    delete from public.earned_badges
     where user_id = v_me and language_app_key = v_app and not public._is_account_badge(badge_id);
  else
    v_badges := '[]'::jsonb;
    begin
      v_week := (v_block->'periodXp'->>'weekStart')::date;
    exception when others then v_week := null;
    end;
    v_amount := case when v_week is null then 0 else public._block_week_xp(v_block, v_week) end;
    if v_amount > 0 then
      update public.weekly_xp set amount = greatest(0, amount - v_amount), updated_at = v_now
       where user_id = v_me and language_app_key = v_app and week_start = v_week;
      v_adjust := jsonb_build_object('week', v_week, 'amount', v_amount);
    end if;
  end if;

  -- Uma cópia anterior do mesmo curso não desfaz mais (desfazer volta só o último recomeço).
  update public.course_restart_backups set superseded_at = v_now
   where user_id = v_me and course_key = p_course_key and restored_at is null and superseded_at is null;

  insert into public.course_restart_backups (user_id, course_key, app_key, epoch, only_course, block, weekly_xp, weekly_adjust,
                                             earned_badges, created_at, expires_at)
  values (v_me, p_course_key, v_app, v_epoch, not v_other, v_block, v_weekly, v_adjust, v_badges, v_now, v_now + interval '30 days')
  returning id into v_id;

  -- A chave nunca é apagada (no zh antigo, sem o bloco o site leria o progresso velho da raiz): o bloco é regravado.
  update public.progress set data = jsonb_set(data, array[p_course_key], v_new) where user_id = v_me;

  perform public._restart_notify_teachers(v_me, v_app, p_course_key, 'student_course_restart');

  return jsonb_build_object('ok', true, 'backup_id', v_id, 'epoch', v_epoch, 'restarted_at', v_now,
                            'expires_at', v_now + interval '30 days', 'only_course', not v_other);
end;
$$;
revoke all on function public.restart_course(text) from public, anon;
grant execute on function public.restart_course(text) to authenticated;

-- 4. Desfazer -----------------------------------------------------------------------------------------------------
create or replace function public.undo_restart_course(p_backup_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  b public.course_restart_backups%rowtype;
  v_data jsonb;
  v_cur jsonb;
  v_epoch integer;
  v_week date;
  v_now timestamptz := now();
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  perform public.purge_expired_course_restart_backups();
  select * into b from public.course_restart_backups where id = p_backup_id and user_id = v_me for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if b.restored_at is not null then return jsonb_build_object('error', 'already_restored'); end if;
  if b.superseded_at is not null then return jsonb_build_object('error', 'superseded'); end if;
  if b.purged_at is not null or b.block is null or b.expires_at <= v_now then return jsonb_build_object('error', 'expired'); end if;

  select data into v_data from public.progress where user_id = v_me for update;
  v_cur := v_data -> b.course_key;
  -- Outro recomeço ou desfazer mexeu no bloco depois desta cópia: não desfaz por cima.
  if v_cur is null or public._restart_epoch_of(v_cur) <> b.epoch then return jsonb_build_object('error', 'superseded'); end if;
  v_epoch := b.epoch + 1;

  if b.only_course then
    delete from public.weekly_xp where user_id = v_me and language_app_key = b.app_key;
    insert into public.weekly_xp (user_id, week_start, language_app_key, amount, updated_at)
    select v_me, (r->>'week_start')::date, b.app_key, (r->>'amount')::integer, (r->>'updated_at')::timestamptz
      from jsonb_array_elements(coalesce(b.weekly_xp, '[]'::jsonb)) r;
    insert into public.earned_badges (user_id, language_app_key, badge_id, earned_at)
    select v_me, b.app_key, r->>'badge_id', (r->>'earned_at')::timestamptz
      from jsonb_array_elements(coalesce(b.earned_badges, '[]'::jsonb)) r
    on conflict (user_id, language_app_key, badge_id) do update set earned_at = least(public.earned_badges.earned_at, excluded.earned_at);
  elsif b.weekly_adjust is not null then
    -- Semana que perdeu o XP deste curso: devolve o que saiu e tira o que o curso recomeçado ganhou nela (é descartado).
    v_week := (b.weekly_adjust->>'week')::date;
    update public.weekly_xp
       set amount = greatest(0, amount - public._block_week_xp(v_cur, v_week) + (b.weekly_adjust->>'amount')::integer), updated_at = v_now
     where user_id = v_me and language_app_key = b.app_key and week_start = v_week;
    if not found then
      insert into public.weekly_xp (user_id, week_start, language_app_key, amount, updated_at)
      values (v_me, v_week, b.app_key, (b.weekly_adjust->>'amount')::integer, v_now);
    end if;
  end if;

  update public.progress set data = jsonb_set(data, array[b.course_key], b.block || jsonb_build_object('restartEpoch', v_epoch))
   where user_id = v_me;
  update public.course_restart_backups set restored_at = v_now where id = b.id;

  perform public._restart_notify_teachers(v_me, b.app_key, b.course_key, 'student_course_restart_undo');
  return jsonb_build_object('ok', true, 'course_key', b.course_key, 'epoch', v_epoch);
end;
$$;
revoke all on function public.undo_restart_course(bigint) from public, anon;
grant execute on function public.undo_restart_course(bigint) to authenticated;

-- 5. Painel da professora: "Recomeçou em DD/MM" ---------------------------------------------------------------------
create or replace function public.get_teacher_student_restarts(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then return jsonb_build_object('error', 'not_authorized'); end if;
  if not (coalesce(auth.jwt()->>'email', '') = 'brunemed1310@gmail.com'
          or exists (select 1 from public.teacher_students where teacher_id = v_me and student_id = p_student_id
                      and language_app_key = p_language_app_key and status = 'active')) then
    return jsonb_build_object('error', 'not_authorized');
  end if;
  return jsonb_build_object('restarts', coalesce((
    select jsonb_agg(jsonb_build_object('course_key', x.course_key, 'created_at', x.created_at, 'restored_at', x.restored_at)
                     order by x.created_at desc)
      from (select course_key, created_at, restored_at from public.course_restart_backups
             where user_id = p_student_id and app_key = p_language_app_key
             order by created_at desc limit 5) x), '[]'::jsonb));
end;
$$;
revoke all on function public.get_teacher_student_restarts(uuid, text) from public, anon;
grant execute on function public.get_teacher_student_restarts(uuid, text) to authenticated;

-- 6. Guarda da época (abas abertas com o código antigo) ---------------------------------------------------------------
-- security definer: o gatilho roda na gravação da própria aluna (authenticated) e chama _restart_epoch_of (fechada).
create or replace function public._progress_guard_restart_epoch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare e record;
begin
  if jsonb_typeof(old.data) <> 'object' or jsonb_typeof(new.data) <> 'object' then return new; end if;
  for e in select key, value from jsonb_each(old.data)
            where left(key, 1) <> '_' and jsonb_typeof(value) = 'object' and jsonb_typeof(value->'restartEpoch') = 'number' loop
    if public._restart_epoch_of(new.data -> e.key) < public._restart_epoch_of(e.value) then
      new.data := jsonb_set(new.data, array[e.key], e.value);
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public._progress_guard_restart_epoch() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'progress_guard_restart_epoch' and tgrelid = 'public.progress'::regclass) then
    create trigger progress_guard_restart_epoch before update on public.progress
      for each row execute function public._progress_guard_restart_epoch();
  end if;
end $$;

-- 7. Limpeza diária das cópias vencidas (o recomeço e o desfazer também limpam) ----------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-course-restart-backups', '17 7 * * *', 'select public.purge_expired_course_restart_backups()');
  end if;
end $$;
