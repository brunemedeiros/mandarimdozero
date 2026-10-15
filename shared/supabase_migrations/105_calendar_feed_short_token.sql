-- 105 -- Link de agenda com senha curta (pedido da autora, 2026-10-15: o link de 64 caracteres "parecia vírus").
-- Senha nova: 16 caracteres de um alfabeto sem letras/números que se confundem (sem i, l, o, 0, 1): ~79 bits,
-- impossível de adivinhar por tentativa. Endereço final: https://agenda.profbrune.com.br/<senha> (Netlify repassa para
-- a Edge Function class-calendar-feed). Senha antiga (64 hex) continua aceita até a pessoa abrir o bloco da agenda,
-- quando é trocada sozinha pela curta (o link velho para; a pessoa assina o novo).
-- Idioma do .ics: o do site de quem é dono do link (_ui_lang, 102), sem depender de parâmetro na URL.
-- Única parte com DROP: troca da restrição do formato da senha (drop constraint + add). Rollback: voltar a restrição
-- para '^[0-9a-f]{64}$' depois de gerar senhas longas de novo; drop function _calendar_feed_new_token(),
-- class_calendar_feed_lang(text).

alter table public.calendar_feed_tokens drop constraint if exists calendar_feed_tokens_token_check;
alter table public.calendar_feed_tokens add constraint calendar_feed_tokens_token_check
  check (token ~ '^([0-9a-f]{64}|[a-z2-9]{16})$');

-- 16 caracteres de 'abcdefghjkmnpqrstuvwxyz23456789' (31 símbolos), a partir de 2 UUIDs aleatórios.
create or replace function public._calendar_feed_new_token()
returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  raw bytea := decode(md5(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text), 'hex');
  out text := '';
begin
  for i in 0..15 loop
    out := out || substr(alphabet, (get_byte(raw, i) % 31) + 1, 1);
  end loop;
  return out;
end $$;
revoke execute on function public._calendar_feed_new_token() from public, anon, authenticated;

create or replace function public.my_calendar_feed_token(p_regenerate boolean default false)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_tok text;
  v_try int := 0;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  select token into v_tok from public.calendar_feed_tokens where user_id = v_me;
  -- Já tem senha curta e não pediu outra: devolve a mesma.
  if v_tok is not null and not p_regenerate and v_tok ~ '^[a-z2-9]{16}$' then return v_tok; end if;
  loop
    v_try := v_try + 1;
    begin
      insert into public.calendar_feed_tokens (user_id, token) values (v_me, public._calendar_feed_new_token())
        on conflict (user_id) do update set token = excluded.token, created_at = now(), last_fetched_at = null
        returning token into v_tok;
      return v_tok;
    exception when unique_violation then
      if v_try >= 5 then raise; end if;  -- senha repetida (chance desprezível): tenta outra
    end;
  end loop;
end $$;
revoke execute on function public.my_calendar_feed_token(boolean) from public, anon;
grant execute on function public.my_calendar_feed_token(boolean) to authenticated;

-- class_calendar_feed: igual à 103, aceitando também a senha curta.
create or replace function public.class_calendar_feed(p_token text)
returns table (id bigint, role text, language_app_key text, class_date date, start_at timestamptz,
               duration_minutes smallint, topic text, homework text, attendance_name text,
               who text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if p_token is null or p_token !~ '^([0-9a-f]{64}|[a-z2-9]{16})$' then return; end if;
  update public.calendar_feed_tokens set last_fetched_at = now()
   where token = p_token returning user_id into v_user;
  if v_user is null then return; end if;

  return query
  select l.id,
         case when l.teacher_id = v_user then 'teacher' else 'student' end,
         l.language_app_key, l.class_date,
         -- Sem horário: 7h no fuso da aula (padrão da autora; a professora ajusta no site, a agenda assinada é só leitura).
         ((l.class_date + coalesce(l.start_time, time '07:00')) at time zone coalesce(l.time_zone, 'America/Sao_Paulo')),
         l.duration_minutes, l.topic, l.homework, a.name,
         case when l.teacher_id = v_user then coalesce(c.name, nullif(btrim(ps.display_name), ''), ps.username)
              else coalesce(c.name, nullif(btrim(pt.display_name), ''), pt.username) end,
         l.updated_at
    from public.teacher_class_logs l
    left join public.class_attendance_labels a on a.id = l.attendance_label_id
    left join public.classrooms c on c.id = l.classroom_id
    left join public.profiles ps on ps.user_id = l.student_id
    left join public.profiles pt on pt.user_id = l.teacher_id
   where l.class_date >= current_date - 120
     and (l.teacher_id = v_user
          or (public.teacher_link_is_active(l.teacher_id, v_user, l.language_app_key)
              and (l.student_id = v_user
                   or (l.classroom_id is not null and exists (select 1 from public.classroom_members m
                                                               where m.classroom_id = l.classroom_id and m.student_id = v_user)))))
   order by l.class_date, l.start_time nulls first, l.id;
end $$;
revoke execute on function public.class_calendar_feed(text) from public, anon, authenticated;
grant execute on function public.class_calendar_feed(text) to service_role;

-- Idioma do site do dono do link ('en' ou 'pt-BR'); null se a senha não existe.
create or replace function public.class_calendar_feed_lang(p_token text)
returns text
language sql stable security definer set search_path = public as $$
  select public._ui_lang(t.user_id) from public.calendar_feed_tokens t
   where p_token ~ '^([0-9a-f]{64}|[a-z2-9]{16})$' and t.token = p_token;
$$;
revoke execute on function public.class_calendar_feed_lang(text) from public, anon, authenticated;
grant execute on function public.class_calendar_feed_lang(text) to service_role;
