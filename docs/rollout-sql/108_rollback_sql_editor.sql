-- Desfaz a 108 (sino da professora). Colar no SQL Editor SÓ se for preciso voltar atrás.
-- Antes: publicar a versão do app sem o sino da professora (ou deixar a nova: ela funciona sem a coluna audience).
-- Os avisos continuam todos na tabela; só voltam a aparecer juntos no sino normal.
begin;
drop trigger if exists notifications_audience_fill on public.notifications;
drop function if exists public._notifications_audience_fill();

-- _teacher_notify e _mural_notify como na 104 (aviso de aluno de português volta a ser descartado em _teacher_notify).
create or replace function public._mural_notify(p_user uuid, p_lang text, p_event text, p_body text, p_tab text)
returns void language plpgsql security definer set search_path = public as $$
declare v_body text := p_body;
begin
  if p_user is null or p_lang not in ('frances', 'mandarim', 'portugues') then return; end if;
  if public._ui_lang(p_user) = 'en' then v_body := coalesce(public._notif_text_en(p_event, p_body), p_body); end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
  values (p_user, p_lang, 'mural', p_event, null, left(v_body, 300), p_tab);
end; $$;
revoke all on function public._mural_notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public._teacher_notify(p_user uuid, p_lang text, p_category text, p_event text, p_body text, p_tab text)
returns void language plpgsql security definer set search_path = public as $$
declare v_body text := p_body;
begin
  if p_lang not in ('frances', 'mandarim') then return; end if;
  if public._ui_lang(p_user) = 'en' then v_body := coalesce(public._notif_text_en(p_event, p_body), p_body); end if;
  insert into public.notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
  values (p_user, p_lang, p_category, p_event, null, v_body, p_tab);
end; $$;
revoke all on function public._teacher_notify(uuid, text, text, text, text, text) from public, anon, authenticated;

drop function if exists public._teacher_notice_params(text, text);
drop index if exists public.notifications_user_audience_created_idx;
alter table public.notifications drop constraint if exists notifications_audience_check;
alter table public.notifications drop column if exists audience;
alter table public.notifications drop column if exists params;
delete from public.notification_templates where created_by = 'teacher-bell-108';
commit;
