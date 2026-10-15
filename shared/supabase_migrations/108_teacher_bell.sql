-- 108 -- Sino da professora (Menu Professora), separado do sino do aluno (2026-10-15).
--
-- Decisão da autora (2026-10-15): os avisos sobre ALUNOS (aluno sumido, post/comentário de aluno no mural, aluno entrou
-- pela turma, convite aceito ou recusado) ficam num sino próprio dentro do Painel da professora, e não no sino normal.
-- A professora recebe o aviso de aluno de QUALQUER idioma de estudo, mesmo usando o site em outro idioma.
--
-- O que muda:
--   1. notifications.audience ('self' = sino normal, 'teacher' = sino da professora). Quem decide é o gatilho
--      notifications_audience_fill (BEFORE INSERT): categoria 'supervisao' ou aba 'teacher-mural'/'teacher-panel' = 'teacher'.
--      Assim o aviso "aluno sumido" da notification-cron (categoria supervisao) entra no sino certo SEM novo deploy.
--   2. notifications.params (jsonb, opcional): nome, turma, trecho do recado, lista de alunos sumidos, para o sino da
--      professora montar a frase no idioma do site de quem LÊ (t()), não no de quando foi gravada. Sem params, o app
--      mostra o body. O gatilho preenche params dos avisos da professora que chegam sem (ex.: os da notification-cron).
--   3. _teacher_notify passa a aceitar 'portugues' (antes descartava: aluno de português não gerava aviso nenhum).
--      Continua traduzindo para quem usa o site em inglês (104).
--   4. _mural_notify grava params (o resto igual à 104).
--   5. Modelos de 'student_inactive_alert' para 'portugues' (cópia dos de 'frances', mesmo ui_language e mesmo active):
--      sem eles a notification-cron não acha modelo e a professora de aluno de português nunca recebe "aluno sumido".
--   6. Avisos antigos da professora (mesma regra do gatilho): audience='teacher' e params lidos da frase, quando der.
--      Só as duas colunas novas mudam; texto, datas e leitura ficam iguais. Os do aluno ficam 'self' (o default).
--
-- O que é grátis e o que é Premium: tudo grátis (é ferramenta do papel Professora, que já é um plano à parte).
-- Sem remoção de objeto nem de linha (aplicável pela ferramenta de migration). Idempotente (pode rodar duas vezes).
-- Desfazer: docs/rollout-sql/108_rollback_sql_editor.sql (SQL Editor; o app novo continua funcionando sem a 108,
-- porque cai no comportamento antigo quando a coluna audience não existe).

-- 1. Colunas novas -------------------------------------------------------------------------------------------------
alter table public.notifications add column if not exists audience text not null default 'self';
alter table public.notifications add column if not exists params jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notifications_audience_check'
                  and conrelid = 'public.notifications'::regclass) then
    alter table public.notifications add constraint notifications_audience_check check (audience in ('self', 'teacher'));
  end if;
end $$;

create index if not exists notifications_user_audience_created_idx
  on public.notifications (user_id, audience, created_at desc);

-- 2. Parâmetros do aviso (lidos da frase que as funções do banco e a notification-cron montam) ----------------------
-- Frases do convite e do mural: as mesmas da 104 (_notif_text_en), sempre montadas em português.
-- "Aluno sumido": os 4 modelos de student_inactive_alert (030 em português, 056 em inglês) com {{studentList}} no formato
-- "Nome (N dias)" / "Nome (N days)" da notification-cron. null = frase desconhecida (o app mostra o body).
create or replace function public._teacher_notice_params(p_event text, p_body text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
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
    m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?)(?: e agora é seu aluno/a de (francês|chinês|português))? 🎉$', 's');
    if m is not null then
      return jsonb_build_object('name', m[1], 'classroom', m[2], 'new_link', m[3] is not null);
    end if;
  elsif p_event = 'teacher_invite_accepted' then
    m := regexp_match(b, '^(.+?) entrou pelo seu link e agora é seu aluno/a de (francês|chinês|português) 🎉$', 's');
    if m is not null then return jsonb_build_object('name', m[1], 'via', 'link'); end if;
    m := regexp_match(b, '^(.+?) aceitou seu convite e agora é seu aluno/a de (francês|chinês|português) 🎉$', 's');
    if m is not null then return jsonb_build_object('name', m[1], 'via', 'invite'); end if;
  elsif p_event = 'teacher_invite_declined' then
    m := regexp_match(b, '^(.+?) recusou o convite para as aulas de (francês|chinês|português)\.$', 's');
    if m is not null then return jsonb_build_object('name', m[1]); end if;
  elsif p_event = 'student_inactive_alert' then
    m := regexp_match(b, '^(?:Sem aparecer há alguns dias|Passou uns dias sem prática por aí|Haven''t shown up in a few days'
                         || '|A few days without practice over there): (.+?)\. (?:Talvez seja hora|Um lembrete seu|Maybe it''s time'
                         || '|A reminder from you)', 's');
    if m is not null then
      select jsonb_agg(jsonb_build_object('name', x[1], 'days', x[2]::int) order by n) into v_list
        from regexp_matches(m[1], '(.+?) \((\d+) (?:dias|days|day)\)(?:, |$)', 'g') with ordinality as t(x, n);
      if v_list is not null then return jsonb_build_object('students', v_list); end if;
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public._teacher_notice_params(text, text) from public, anon, authenticated;

-- 3. Quem decide o sino --------------------------------------------------------------------------------------------
-- Regra única (gatilho + avisos antigos). Aviso novo para a professora: usar categoria 'supervisao' ou a aba
-- 'teacher-mural'/'teacher-panel'; ou gravar audience='teacher' direto.
-- security definer: o app (authenticated) também grava em notifications, e o gatilho chama _teacher_notice_params.
create or replace function public._notifications_audience_fill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category = 'supervisao' or new.action_tab in ('teacher-mural', 'teacher-panel') then
    new.audience := 'teacher';
  end if;
  if new.audience = 'teacher' and new.params is null then
    new.params := public._teacher_notice_params(new.event_type, new.body);
  end if;
  return new;
end;
$$;
revoke all on function public._notifications_audience_fill() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'notifications_audience_fill'
                  and tgrelid = 'public.notifications'::regclass) then
    create trigger notifications_audience_fill before insert on public.notifications
      for each row execute function public._notifications_audience_fill();
  end if;
end $$;

-- Avisos antigos da professora (mesma regra). Só as duas colunas novas mudam; o resto da linha fica igual.
update public.notifications
   set audience = 'teacher', params = coalesce(params, public._teacher_notice_params(event_type, body))
 where audience = 'self' and (category = 'supervisao' or action_tab in ('teacher-mural', 'teacher-panel'));

-- 4. _teacher_notify: aceita português; grava params. Texto igual à 104 (inglês para quem usa o site em inglês).
create or replace function public._teacher_notify(p_user uuid, p_lang text, p_category text, p_event text, p_body text, p_tab text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := p_body;
begin
  if p_user is null or p_lang not in ('frances', 'mandarim', 'portugues') then return; end if;
  if public._ui_lang(p_user) = 'en' then v_body := coalesce(public._notif_text_en(p_event, p_body), p_body); end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab, params)
  values (p_user, p_lang, p_category, p_event, null, v_body, p_tab, public._teacher_notice_params(p_event, p_body));
end;
$$;
revoke all on function public._teacher_notify(uuid, text, text, text, text, text) from public, anon, authenticated;

-- 5. _mural_notify: igual à 104, mais params (só os avisos que vão para a professora usam).
create or replace function public._mural_notify(p_user uuid, p_lang text, p_event text, p_body text, p_tab text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := p_body;
begin
  if p_user is null or p_lang not in ('frances', 'mandarim', 'portugues') then return; end if;
  if public._ui_lang(p_user) = 'en' then v_body := coalesce(public._notif_text_en(p_event, p_body), p_body); end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab, params)
  values (p_user, p_lang, 'mural', p_event, null, left(v_body, 300), p_tab,
          case when p_tab = 'teacher-mural' then public._teacher_notice_params(p_event, p_body) end);
end;
$$;
revoke all on function public._mural_notify(uuid, text, text, text, text) from public, anon, authenticated;

-- 6. "Aluno sumido" para aluno de português: mesmos modelos do francês (mesmo idioma do site e mesmo active).
insert into public.notification_templates (event_type, channel, language_app_key, icon, title, body, active, ui_language, created_by)
select s.event_type, s.channel, 'portugues', s.icon, s.title, s.body, s.active, s.ui_language, 'teacher-bell-108'
  from public.notification_templates s
 where s.event_type = 'student_inactive_alert' and s.language_app_key = 'frances'
   and not exists (select 1 from public.notification_templates x
                    where x.event_type = s.event_type and x.channel = s.channel and x.language_app_key = 'portugues'
                      and x.ui_language = s.ui_language and x.body = s.body);
