-- 104 -- Avisos do Mural e do convite da professora no idioma de quem recebe (2026-10-15).
--
-- Decisão da autora (2026-10-15): site em inglês não tem NADA em português. A 102 resolveu os avisos de Amigos;
-- aqui ficam os outros dois lugares que gravavam frase pronta em português no sino:
--   _mural_notify (087): post no mural, comentário, "colocou você na turma", "entrou pelo link na turma";
--   _teacher_notify (077): convite da professora, aceite pelo link ou pelo convite, recusa.
-- As funções que chamam (mural_create_post, mural_add_comment, mural_set_classroom_members, join_classroom_code,
-- teacher_invite_student, respond_teacher_invite, accept_invite_code) são de outras conversas e algumas têm DELETE
-- (a ferramenta de migration trava esperando confirmação): não são recriadas. Em vez disso, as duas funções de aviso
-- reconhecem as frases (mesmos textos da produção em 2026-10-15) e, se quem recebe usa o site em inglês
-- (_ui_lang, 102), gravam a versão em inglês. Frase nova que não estiver na lista fica como veio: ao criar aviso novo,
-- acrescentar a tradução em _notif_text_en (e o teste em tests/avisos-idioma/).
-- Sem DROP. Nenhuma linha existente muda.
-- ROLLBACK: _mural_notify e _teacher_notify de volta às versões da 087/077; drop function _notif_text_en(text, text),
--   _lang_label_en(text).

create or replace function public._lang_label_en(p_label text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_label when 'francês' then 'French' when 'chinês' then 'Chinese' when 'português' then 'Portuguese'
                      when 'frances' then 'French' when 'mandarim' then 'Chinese' when 'portugues' then 'Portuguese'
                      else p_label end;
$$;
revoke all on function public._lang_label_en(text) from public, anon, authenticated;

-- Frase pronta em português -> inglês. null = frase desconhecida.
create or replace function public._notif_text_en(p_event text, p_body text)
returns text
language plpgsql
immutable
set search_path = public
as $$
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
    m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?)(?: e agora é seu aluno/a de (francês|chinês|português))? 🎉$', 's');
    if m is not null then
      return '🏫 ' || m[1] || ' joined the class ' || m[2] || ' through your link'
        || coalesce(' and is now your ' || _lang_label_en(m[3]) || ' student', '') || ' 🎉';
    end if;
  elsif p_event = 'teacher_invite_accepted' then
    m := regexp_match(b, '^(.+?) entrou pelo seu link e agora é seu aluno/a de (francês|chinês|português) 🎉$', 's');
    if m is not null then return m[1] || ' joined through your link and is now your ' || _lang_label_en(m[2]) || ' student 🎉'; end if;
    m := regexp_match(b, '^(.+?) aceitou seu convite e agora é seu aluno/a de (francês|chinês|português) 🎉$', 's');
    if m is not null then return m[1] || ' accepted your invitation and is now your ' || _lang_label_en(m[2]) || ' student 🎉'; end if;
  elsif p_event = 'teacher_invite_declined' then
    m := regexp_match(b, '^(.+?) recusou o convite para as aulas de (francês|chinês|português)\.$', 's');
    if m is not null then return m[1] || ' declined the invitation to ' || _lang_label_en(m[2]) || ' classes.'; end if;
  elsif p_event = 'teacher_invite' then
    m := regexp_match(b, '^(.+?) te convidou para ser aluno/a de (francês|chinês|português) 🎓$', 's');
    if m is not null then
      -- _teacher_display_name usa 'Professora' quando a conta não tem nome nem @
      n := case when m[1] = 'Professora' then 'Your teacher' else m[1] end;
      return n || ' invited you to be their ' || _lang_label_en(m[2]) || ' student 🎓';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public._notif_text_en(text, text) from public, anon, authenticated;

-- Mesma regra da 087; só troca o texto para quem usa o site em inglês.
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
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
  values (p_user, p_lang, 'mural', p_event, null, left(v_body, 300), p_tab);
end;
$$;
revoke all on function public._mural_notify(uuid, text, text, text, text) from public, anon, authenticated;

-- Mesma regra da 077; só troca o texto para quem usa o site em inglês.
create or replace function public._teacher_notify(p_user uuid, p_lang text, p_category text, p_event text, p_body text, p_tab text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := p_body;
begin
  if p_lang not in ('frances', 'mandarim') then return; end if;
  if public._ui_lang(p_user) = 'en' then v_body := coalesce(public._notif_text_en(p_event, p_body), p_body); end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
  values (p_user, p_lang, p_category, p_event, null, v_body, p_tab);
end;
$$;
revoke all on function public._teacher_notify(uuid, text, text, text, text, text) from public, anon, authenticated;
