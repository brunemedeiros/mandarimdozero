-- Teste de regressão IDOR (aluno A x aluno B) -- auditoria de segurança de 2026-11-25.
-- Rodar SÓ NO STAGING (ilfjzizjfcmhibkhwber), pelo MCP execute_sql ou pelo SQL Editor.
-- Tudo roda numa transação que termina com RAISE EXCEPTION: nada fica gravado (nem os
-- usuários fictícios zz-idor-*@example.invalid). Não usa dado real de aluno.
--
-- Resultado: a mensagem de erro final diz
--   IDOR_OK passou=N        -> tudo certo
--   IDOR_FALHOU passou=N falhou=M {...}  -> lista do que abriu (ou do que o dono deixou de ver)
-- Como funciona e o que cada linha testa: tests/seguranca-idor/README.md
do $$
declare
  a uuid := gen_random_uuid();   -- aluno A (atacante)
  b uuid := gen_random_uuid();   -- aluno B (vítima)
  t uuid := gen_random_uuid();   -- professora fictícia do B
  lang text := 'frances';
  ok int := 0; falhas jsonb := '{}'::jsonb;
  q text; n bigint; res text; k text; i int; tbl text; col text;
  tabs text[][] := array[
    ['progress','user_id'],['own_flashcards','owner_id'],['decks','owner_id'],
    ['notifications','user_id'],['push_subscriptions','user_id'],['profile_private','user_id'],
    ['profiles','user_id'],['notification_preferences','user_id'],['friend_settings','user_id'],
    ['tts_generation_log','user_id'],['course_restart_backups','user_id'],['reports','user_id'],
    ['teacher_flashcards','student_id'],['teacher_students','student_id'],['account_roles','user_id']];
  -- ler permitido de propósito (Ranking/conquistas): só editar/apagar precisam dar 0
  leitura_publica text[] := array['weekly_xp','earned_badges'];
begin
  -- ---------- preparação (dona do banco, sem RLS) ----------
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x.e, '{}', '{}', now(), now()
  from (values (a,'zz-idor-a@example.invalid'),(b,'zz-idor-b@example.invalid'),(t,'zz-idor-t@example.invalid')) x(id,e);
  insert into public.profiles(user_id,username,public_profile) values (a,'zz_idor_a',false),(b,'zz_idor_b',false),(t,'zz_idor_t',false) on conflict do nothing;
  insert into public.account_roles(user_id,role,source) values (t,'teacher','grant'),(b,'premium_basic','grant');
  insert into public.teacher_students(teacher_id,student_id,language_app_key,status) values (t,b,lang,'active');
  insert into public.teacher_flashcards(teacher_id,student_id,language_app_key,back_trans) values (t,b,lang,'cartão da prof para B');
  insert into public.progress(user_id) values (b) on conflict do nothing;
  insert into public.own_flashcards(owner_id,language_app_key,back_trans) values (b,lang,'segredo do B');
  insert into public.notifications(user_id,language_app_key,category,event_type,body) values (b,lang,'system','zz','aviso do B');
  insert into public.push_subscriptions(user_id,language_app_key,endpoint,keys) values (b,lang,'https://example.invalid/push','{}');
  insert into public.profile_private(user_id) values (b) on conflict do nothing;
  insert into public.weekly_xp(user_id,week_start,language_app_key,amount) values (b,current_date,lang,10);
  insert into public.earned_badges(user_id,language_app_key,badge_id) values (b,lang,'zz');
  insert into public.notification_preferences(user_id) values (b) on conflict do nothing;
  insert into public.friend_settings(user_id) values (b) on conflict do nothing;
  insert into public.tts_generation_log(user_id) values (b);
  insert into public.course_restart_backups(user_id,course_key,app_key,epoch,only_course) values (b,'zz',lang,1,true);
  insert into public.reports(user_id,language_app_key,category,kind,description) values (b,lang,'bug_tecnico','problema','report do B');

  -- decks do B pela própria função do site, logado como B
  perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.ensure_user_decks(b, lang);
  insert into public.decks(kind,name,language_app_key,owner_id,parent_deck_id)
  select 'personal','Deck do B',lang,b,id from public.decks where owner_id=b and kind='personal' and language_app_key=lang order by id limit 1;

  -- ---------- controle: B enxerga cada coisa sua (senão o teste não prova nada) ----------
  for i in 1..array_length(tabs,1) loop
    execute format('select count(*) from public.%I where %I = %L', tabs[i][1], tabs[i][2], b) into n;
    if n > 0 then ok := ok + 1; else falhas := falhas || jsonb_build_object('controle_B_nao_ve|'||tabs[i][1], n); end if;
  end loop;
  execute 'reset role';

  -- controle: a professora do B recebe o resumo do aluno
  perform set_config('request.jwt.claims', json_build_object('sub',t,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  execute format('select public.get_teacher_student_overview(%L,%L)::text', b, lang) into res;
  if res not like '%not_authorized%' then ok := ok + 1; else falhas := falhas || jsonb_build_object('controle_prof_sem_resumo', res); end if;
  execute 'reset role';

  -- ---------- ATAQUE: logado como A ----------
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  for i in 1..array_length(tabs,1) + array_length(leitura_publica,1) loop
    if i <= array_length(tabs,1) then tbl := tabs[i][1]; col := tabs[i][2];
    else tbl := leitura_publica[i - array_length(tabs,1)]; col := 'user_id'; end if;
    foreach k in array array['ler','editar','apagar'] loop
      continue when k = 'ler' and tbl = any(leitura_publica);
      begin
        if k = 'ler' then execute format('select count(*) from public.%I where %I = %L', tbl, col, b) into n;
        elsif k = 'editar' then execute format('update public.%I set %I = %I where %I = %L', tbl, col, col, col, b); get diagnostics n = row_count;
        else execute format('delete from public.%I where %I = %L', tbl, col, b); get diagnostics n = row_count; end if;
      exception when others then n := 0; end;   -- recusa = protegido
      if n = 0 then ok := ok + 1; else falhas := falhas || jsonb_build_object(tbl||'|A_consegue_'||k, n); end if;
    end loop;
  end loop;

  -- A cria linhas em nome do B / se dá poder
  foreach q in array array[
    format('insert into public.own_flashcards(owner_id,language_app_key,back_trans) values (%L,%L,''forjado'')', b, lang),
    format('insert into public.progress(user_id) values (%L)', t),   -- t existe e não tem progresso
    format('insert into public.notifications(user_id,language_app_key,category,event_type,body) values (%L,%L,''system'',''zz'',''forjado'')', b, lang),
    format('insert into public.weekly_xp(user_id,week_start,language_app_key,amount) values (%L,current_date - 7,%L,99999)', b, lang),
    format('insert into public.earned_badges(user_id,language_app_key,badge_id) values (%L,%L,''forjado'')', b, lang),
    format('insert into public.teacher_students(teacher_id,student_id,language_app_key) values (%L,%L,%L)', a, b, lang),
    format('insert into public.account_roles(user_id,role,source) values (%L,''admin'',''grant'')', a),
    format('insert into public.reports(user_id,language_app_key,category,kind,description) values (%L,%L,''bug_tecnico'',''problema'',''forjado'')', b, lang),
    format('insert into public.reports(user_id,language_app_key,category,kind,description,status,internal_note,admin_reply) values (%L,%L,''bug_tecnico'',''problema'',''forjado'',''resolvido'',''x'',''x'')', a, lang),
    format('insert into public.reports(user_id,reporter_email,language_app_key,category,kind,description) values (%L,''atacante@example.invalid'',%L,''bug_tecnico'',''problema'',''forjado'')', a, lang)
  ] loop
    begin execute q; res := 'ACEITO'; exception when others then res := 'recusado'; end;
    if res = 'recusado' then ok := ok + 1; else falhas := falhas || jsonb_build_object('A_insere|'||left(q,70), res); end if;
  end loop;

  -- funções que recebem o id do B
  foreach q in array array[
    format('select public.get_teacher_student_overview(%L,%L)::text', b, lang),
    format('select public.get_teacher_student_metrics(%L,%L)::text', b, lang),
    format('select public.get_teacher_student_deck_counts(%L,%L)::text', b, lang),
    format('select public.get_teacher_student_restarts(%L,%L)::text', b, lang),
    format('select public.ensure_user_decks(%L,%L)::text', b, lang),
    format('select public.ensure_teacher_decks(%L,%L)::text', b, lang),
    format('select public.admin_get_account_roles(%L)::text', b)
  ] loop
    begin execute q into res; exception when others then res := 'not_authorized'; end;
    if coalesce(res,'') like '%not_authorized%' then ok := ok + 1; else falhas := falhas || jsonb_build_object('rpc|'||left(q,60), left(res,80)); end if;
  end loop;

  -- envio legítimo de report, igual ao site (precisa continuar passando)
  begin
    insert into public.reports(user_id,language_app_key,category,kind,description,severity_reported,context,dedup_hash)
    values (a,lang,'bug_tecnico','problema','report legítimo de A','dificulta','{}','h');
    ok := ok + 1;
  exception when others then falhas := falhas || jsonb_build_object('legitimo_logado_recusado', left(sqlerrm,80)); end;
  execute 'reset role';

  -- ---------- visitante sem conta ----------
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  execute 'set local role anon';
  foreach q in array array[
    format('select count(*) from public.own_flashcards where owner_id=%L', b),
    format('select count(*) from public.progress where user_id=%L', b),
    format('select count(*) from public.teacher_flashcards where student_id=%L', b),
    format('select count(*) from public.reports where user_id=%L', b)
  ] loop
    begin execute q into n; exception when others then n := 0; end;
    if n = 0 then ok := ok + 1; else falhas := falhas || jsonb_build_object('anon_le|'||left(q,50), n); end if;
  end loop;
  foreach q in array array[
    format('insert into public.reports(user_id,language_app_key,category,kind,description) values (%L,%L,''bug_tecnico'',''problema'',''forjado'')', b, lang),
    format('insert into public.reports(guest_id,language_app_key,category,kind,description,status) values (''g'',%L,''bug_tecnico'',''problema'',''forjado'',''resolvido'')', lang)
  ] loop
    begin execute q; res := 'ACEITO'; exception when others then res := 'recusado'; end;
    if res = 'recusado' then ok := ok + 1; else falhas := falhas || jsonb_build_object('anon_insere|'||left(q,70), res); end if;
  end loop;
  begin
    insert into public.reports(guest_id,reporter_email,language_app_key,category,kind,description)
    values ('g','visitante@example.invalid',lang,'bug_tecnico','problema','report legítimo de visitante');
    ok := ok + 1;
  exception when others then falhas := falhas || jsonb_build_object('legitimo_visitante_recusado', left(sqlerrm,80)); end;
  execute 'reset role';

  if falhas = '{}'::jsonb then raise exception 'IDOR_OK passou=%', ok;
  else raise exception 'IDOR_FALHOU passou=% falhou=% %', ok, (select count(*) from jsonb_object_keys(falhas)), falhas::text; end if;
end $$;
