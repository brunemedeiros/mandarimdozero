-- 115: Etapa 4 do plano "Voz da Prof. Brune": tira o "aluno/a" dos avisos montados pelo banco e do badge da professora.
-- Aprovado pela dona em 2026-10-19 (seção 3.2 de docs/i18n/etapa4-auditoria-escrita.md).
--
-- Base: definição ATUAL de cada função na produção (pg_get_functiondef em 2026-10-19; Staging idêntico, mesmo md5).
-- Só muda o texto; a lógica, as checagens e os grants ficam iguais (CREATE OR REPLACE mantém o ACL). Nada é removido.
--   teacher_invite_student : "{professora} te convidou para as aulas de {idioma} 🎓"
--   respond_teacher_invite : "{aluno} aceitou seu convite e agora estuda {idioma} com você 🎉"
--   accept_invite_code     : "{aluno} entrou pelo seu link e agora estuda {idioma} com você 🎉"
--   join_classroom_code    : "🏫 {aluno} entrou pelo link na turma {turma} e agora estuda {idioma} com você 🎉"
--   _teacher_badge_id      : badge novo "Turma de {nome}" / "Estuda com esta professora." (badges já criados: UPDATE de
--                            dado à parte, fora desta migration)
--   _notif_text_en e _teacher_notice_params: reconhecem a frase NOVA e a ANTIGA (avisos já gravados continuam
--                            traduzidos/estruturados); o inglês sai sempre na forma nova ("now studies X with you",
--                            "invited you to their X classes"). _teacher_notice_params também lê o modelo novo de
--                            "aluno sumido" da 114 ("Uns dias sem prática por aí: ... Um recado seu ...").

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public._notif_text_en(p_event text, p_body text)
 returns text
 language plpgsql
 immutable
 set search_path to 'public'
as $function$
declare
  m text[];
  b text := coalesce(p_body, '');
  n text;
begin
  if p_event = 'mural_post' then
    m := regexp_match(b, '^📌 (.+?) postou no mural(?: \(turma (.+?)\))?: (.*)$', 's');
    if m is not null then
      return '📌 ' || m[1] || ' posted on the board' || coalesce(' (class ' || m[2] || ')', '') || ': ' || m[3];
    end if;
  elsif p_event = 'mural_comment' then
    m := regexp_match(b, '^💬 (.+?) comentou no mural: (.*)$', 's');
    if m is not null then return '💬 ' || m[1] || ' commented on the board: ' || m[2]; end if;
  elsif p_event = 'mural_classroom' then
    m := regexp_match(b, '^🏫 (.+?) colocou você na turma (.*)\.$', 's');
    if m is not null then return '🏫 ' || m[1] || ' added you to the class ' || m[2] || '.'; end if;
  elsif p_event = 'mural_classroom_join' then
    -- frase nova (115)
    m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?) e agora estuda (francês|chinês|português|mandarim) com você 🎉$', 's');
    if m is null then
      -- frase antiga (até a 114), com ou sem vínculo novo
      m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?)(?: e agora é seu aluno/a de (francês|chinês|português))? 🎉$', 's');
    end if;
    if m is not null then
      return '🏫 ' || m[1] || ' joined the class ' || m[2] || ' through your link'
        || coalesce(' and now studies ' || _lang_label_en(m[3]) || ' with you', '') || ' 🎉';
    end if;
  elsif p_event = 'teacher_invite_accepted' then
    m := regexp_match(b, '^(.+?) entrou pelo seu link e agora (?:estuda (?:francês|chinês|português|mandarim) com você|é seu aluno/a de (?:francês|chinês|português)) 🎉$', 's');
    if m is not null then
      return m[1] || ' joined through your link and now studies '
        || _lang_label_en((regexp_match(b, '(francês|chinês|português|mandarim)(?: com você)? 🎉$'))[1]) || ' with you 🎉';
    end if;
    m := regexp_match(b, '^(.+?) aceitou seu convite e agora (?:estuda (?:francês|chinês|português|mandarim) com você|é seu aluno/a de (?:francês|chinês|português)) 🎉$', 's');
    if m is not null then
      return m[1] || ' accepted your invitation and now studies '
        || _lang_label_en((regexp_match(b, '(francês|chinês|português|mandarim)(?: com você)? 🎉$'))[1]) || ' with you 🎉';
    end if;
  elsif p_event = 'teacher_invite_declined' then
    m := regexp_match(b, '^(.+?) recusou o convite para as aulas de (francês|chinês|português)\.$', 's');
    if m is not null then return m[1] || ' declined the invitation to ' || _lang_label_en(m[2]) || ' classes.'; end if;
  elsif p_event = 'teacher_invite' then
    -- frase nova (115) e antiga
    m := regexp_match(b, '^(.+?) te convidou (?:para as aulas de|para ser aluno/a de) (francês|chinês|português|mandarim) 🎓$', 's');
    if m is not null then
      -- _teacher_display_name usa 'Professora' quando a conta não tem nome nem @
      n := case when m[1] = 'Professora' then 'Your teacher' else m[1] end;
      return n || ' invited you to their ' || _lang_label_en(m[2]) || ' classes 🎓';
    end if;
  end if;
  return null;
end;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public._teacher_notice_params(p_event text, p_body text)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'public'
as $function$
declare
  m text[];
  b text := coalesce(p_body, '');
  v_list jsonb;
begin
  if p_event = 'mural_post' then
    m := regexp_match(b, '^📌 (.+?) postou no mural(?: \(turma (.+?)\))?: (.*)$', 's');
    if m is not null then return jsonb_strip_nulls(jsonb_build_object('name', m[1], 'classroom', m[2], 'snippet', m[3])); end if;
  elsif p_event = 'mural_comment' then
    m := regexp_match(b, '^💬 (.+?) comentou no mural: (.*)$', 's');
    if m is not null then return jsonb_build_object('name', m[1], 'snippet', m[2]); end if;
  elsif p_event = 'mural_classroom_join' then
    -- frase nova (115): sempre vínculo novo
    m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?) e agora estuda (francês|chinês|português|mandarim) com você 🎉$', 's');
    if m is null then
      -- frase antiga (até a 114)
      m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?)(?: e agora é seu aluno/a de (francês|chinês|português))? 🎉$', 's');
    end if;
    if m is not null then
      return jsonb_build_object('name', m[1], 'classroom', m[2], 'new_link', m[3] is not null);
    end if;
  elsif p_event = 'teacher_invite_accepted' then
    m := regexp_match(b, '^(.+?) entrou pelo seu link e agora (?:estuda (?:francês|chinês|português|mandarim) com você|é seu aluno/a de (?:francês|chinês|português)) 🎉$', 's');
    if m is not null then return jsonb_build_object('name', m[1], 'via', 'link'); end if;
    m := regexp_match(b, '^(.+?) aceitou seu convite e agora (?:estuda (?:francês|chinês|português|mandarim) com você|é seu aluno/a de (?:francês|chinês|português)) 🎉$', 's');
    if m is not null then return jsonb_build_object('name', m[1], 'via', 'invite'); end if;
  elsif p_event = 'teacher_invite_declined' then
    m := regexp_match(b, '^(.+?) recusou o convite para as aulas de (francês|chinês|português)\.$', 's');
    if m is not null then return jsonb_build_object('name', m[1]); end if;
  elsif p_event = 'student_inactive_alert' then
    m := regexp_match(b, '^(?:Sem aparecer há alguns dias|Passou uns dias sem prática por aí|Uns dias sem prática por aí|Haven''t shown up in a few days'
                         || '|A few days without practice over there): (.+?)\. (?:Talvez seja hora|Um lembrete seu|Um recado seu|Maybe it''s time'
                         || '|A reminder from you)', 's');
    if m is not null then
      select jsonb_agg(jsonb_build_object('name', x[1], 'days', x[2]::int) order by n) into v_list
        from regexp_matches(m[1], '(.+?) \((\d+) (?:dias|days|day)\)(?:, |$)', 'g') with ordinality as t(x, n);
      if v_list is not null then return jsonb_build_object('students', v_list); end if;
    end if;
  end if;
  return null;
end;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public._teacher_badge_id(p_teacher uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id text; v_name text;
begin
  select id into v_id from public.badge_catalog where teacher_id = p_teacher;
  if v_id is not null then return v_id; end if;
  v_id := 'student_' || substr(replace(p_teacher::text, '-', ''), 1, 24);
  v_name := left('Turma de ' || split_part(btrim(public._teacher_display_name(p_teacher)), ' ', 1), 40);
  insert into public.badge_catalog (id, name, icon, description, created_by, teacher_id)
  values (v_id, v_name, '🎓', 'Estuda com esta professora.', 'convite', p_teacher)
  on conflict (id) do update set teacher_id = excluded.teacher_id;
  return v_id;
end $function$;

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.teacher_invite_student(p_student uuid, p_lang text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_row public.teacher_students%rowtype; v_existing boolean;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if p_lang not in ('frances', 'mandarim', 'portugues') then return jsonb_build_object('error', 'invalid_language'); end if;
  if p_student is null or p_student = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if not exists (select 1 from public.profiles where user_id = p_student) then return jsonb_build_object('error', 'not_found'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || p_student::text || p_lang, 0));
  if exists (select 1 from public.teacher_students where student_id = p_student and language_app_key = p_lang and status = 'active') then
    return jsonb_build_object('error', case when exists (select 1 from public.teacher_students where student_id = p_student
      and language_app_key = p_lang and status = 'active' and teacher_id = v_me) then 'already_student' else 'student_has_teacher' end);
  end if;
  select * into v_row from public.teacher_students where teacher_id = v_me and student_id = p_student and language_app_key = p_lang;
  v_existing := found;
  if v_existing and v_row.status = 'invited' and v_row.invited_at > now() - interval '14 days' then
    return jsonb_build_object('error', 'already_invited');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tinvlog:' || v_me::text, 0));
  if (select count(*) from public.teacher_invite_log where teacher_id = v_me and sent_at > now() - interval '24 hours') >= 30 then
    return jsonb_build_object('error', 'daily_invite_limit');
  end if;
  insert into public.teacher_invite_log (teacher_id, student_id) values (v_me, p_student);
  if v_existing then
    update public.teacher_students set status = 'invited', invited_at = now(), responded_at = null where id = v_row.id;
  else
    insert into public.teacher_students (teacher_id, student_id, language_app_key, status, invited_at)
    values (v_me, p_student, p_lang, 'invited', now());
  end if;
  perform public._teacher_notify(p_student, p_lang, 'sistema', 'teacher_invite',
    public._teacher_display_name(v_me) || ' te convidou para as aulas de ' || public._lang_label(p_lang) || ' 🎓', 'path');
  return jsonb_build_object('ok', true, 'status', 'invited');
end $function$;

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.respond_teacher_invite(p_link_id bigint, p_accept boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_row public.teacher_students%rowtype; v_name text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_row from public.teacher_students where id = p_link_id and student_id = v_me for update;
  if not found or v_row.status <> 'invited' or v_row.invited_at <= now() - interval '14 days' then
    return jsonb_build_object('error', 'no_pending_invite');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || v_me::text || v_row.language_app_key, 0));
  v_name := public._teacher_display_name(v_me);
  if p_accept then
    if exists (select 1 from public.teacher_students where student_id = v_me and language_app_key = v_row.language_app_key and status = 'active') then
      return jsonb_build_object('error', 'student_has_teacher');
    end if;
    update public.teacher_students set status = 'active', responded_at = now() where id = v_row.id;
    perform public._teacher_notify(v_row.teacher_id, v_row.language_app_key, 'supervisao', 'teacher_invite_accepted',
      v_name || ' aceitou seu convite e agora estuda ' || public._lang_label(v_row.language_app_key) || ' com você 🎉', 'teacher-panel');
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;
  update public.teacher_students set status = 'removed', responded_at = now() where id = v_row.id;
  perform public._teacher_notify(v_row.teacher_id, v_row.language_app_key, 'supervisao', 'teacher_invite_declined',
    v_name || ' recusou o convite para as aulas de ' || public._lang_label(v_row.language_app_key) || '.', 'teacher-panel');
  return jsonb_build_object('ok', true, 'status', 'removed');
end $function$;

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.accept_invite_code(p_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_c public.teacher_invite_codes%rowtype; v_row public.teacher_students%rowtype;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_c from public.teacher_invite_codes where code = lower(btrim(p_code)) and revoked_at is null;
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  if v_c.teacher_id = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || v_me::text || v_c.language_app_key, 0));
  if exists (select 1 from public.teacher_students where student_id = v_me and language_app_key = v_c.language_app_key and status = 'active') then
    return jsonb_build_object('error', case when exists (select 1 from public.teacher_students where student_id = v_me
      and language_app_key = v_c.language_app_key and status = 'active' and teacher_id = v_c.teacher_id) then 'already_student' else 'student_has_teacher' end);
  end if;
  select * into v_row from public.teacher_students where teacher_id = v_c.teacher_id and student_id = v_me and language_app_key = v_c.language_app_key;
  if found then
    update public.teacher_students set status = 'active', responded_at = now() where id = v_row.id;
  else
    insert into public.teacher_students (teacher_id, student_id, language_app_key, status, invited_at, responded_at)
    values (v_c.teacher_id, v_me, v_c.language_app_key, 'active', now(), now());
  end if;
  perform public._teacher_notify(v_c.teacher_id, v_c.language_app_key, 'supervisao', 'teacher_invite_accepted',
    public._teacher_display_name(v_me) || ' entrou pelo seu link e agora estuda ' || public._lang_label(v_c.language_app_key) || ' com você 🎉', 'teacher-panel');
  return jsonb_build_object('ok', true, 'status', 'active', 'language_app_key', v_c.language_app_key);
end $function$;

-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.join_classroom_code(p_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_c public.classrooms%rowtype; v_row public.teacher_students%rowtype; v_new_link boolean := false;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_c from public.classrooms where join_code = lower(btrim(p_code));
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  if v_c.teacher_id = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  perform pg_advisory_xact_lock(hashtextextended('tinv:' || v_me::text || v_c.language_app_key, 0));
  if exists (select 1 from public.teacher_students where student_id = v_me and language_app_key = v_c.language_app_key
              and status = 'active' and teacher_id <> v_c.teacher_id) then
    return jsonb_build_object('error', 'student_has_teacher');
  end if;
  if not public._mural_active_link(v_c.teacher_id, v_me, v_c.language_app_key) then
    select * into v_row from public.teacher_students where teacher_id = v_c.teacher_id and student_id = v_me and language_app_key = v_c.language_app_key;
    if found then
      update public.teacher_students set status = 'active', responded_at = now() where id = v_row.id;
    else
      insert into public.teacher_students (teacher_id, student_id, language_app_key, status, invited_at, responded_at)
      values (v_c.teacher_id, v_me, v_c.language_app_key, 'active', now(), now());
    end if;
    v_new_link := true;
  end if;
  insert into public.classroom_members (classroom_id, student_id) values (v_c.id, v_me) on conflict do nothing;
  if not found and not v_new_link then
    return jsonb_build_object('ok', true, 'already_member', true, 'language_app_key', v_c.language_app_key, 'classroom_id', v_c.id, 'classroom_name', v_c.name);
  end if;
  perform public._mural_notify(v_c.teacher_id, v_c.language_app_key, 'mural_classroom_join',
    '🏫 ' || public._teacher_display_name(v_me) || ' entrou pelo link na turma ' || v_c.name
    || case when v_new_link then ' e agora estuda ' || public._lang_label(v_c.language_app_key) || ' com você' else '' end || ' 🎉', 'teacher-mural');
  return jsonb_build_object('ok', true, 'new_link', v_new_link, 'language_app_key', v_c.language_app_key, 'classroom_id', v_c.id, 'classroom_name', v_c.name);
end $function$;

-- Grants: CREATE OR REPLACE mantém o ACL de antes (conferido na produção em 2026-10-19):
--   _notif_text_en, _teacher_notice_params, _teacher_badge_id: só postgres e service_role.
--   teacher_invite_student, respond_teacher_invite, accept_invite_code, join_classroom_code: authenticated e service_role.
-- Reforço idempotente (não muda nada se já estiver assim):
revoke all on function public._notif_text_en(text, text) from public, anon, authenticated;
revoke all on function public._teacher_notice_params(text, text) from public, anon, authenticated;
revoke all on function public._teacher_badge_id(uuid) from public, anon, authenticated;
revoke all on function public.teacher_invite_student(uuid, text) from public, anon;
revoke all on function public.respond_teacher_invite(bigint, boolean) from public, anon;
revoke all on function public.accept_invite_code(text) from public, anon;
revoke all on function public.join_classroom_code(text) from public, anon;
grant execute on function public.teacher_invite_student(uuid, text) to authenticated;
grant execute on function public.respond_teacher_invite(bigint, boolean) to authenticated;
grant execute on function public.accept_invite_code(text) to authenticated;
grant execute on function public.join_classroom_code(text) to authenticated;
