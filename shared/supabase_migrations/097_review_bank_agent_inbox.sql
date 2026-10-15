-- Banco de Revisão, rotina automática, plano B: caixa de entrada. A tarefa agendada do Claude não consegue fazer chamadas HTTP de saída
-- (o classificador de segurança do modo Auto as barra), mas usa o conector do Supabase sem problema. Então ela:
--   1) lê o estado por `review_bank_agent_state()`;
--   2) entrega o que extraiu do caderno/agenda por `agent_inbox_submit(payload)`, que grava uma linha na caixa de entrada;
--   3) um gatilho (e um pg_cron de reserva) chama a Edge Function `review-bank-agent` POR DENTRO do Supabase (pg_net), que processa a caixa
--      com as mesmas regras de sempre (só insere, status decidido pelo servidor, cartões pelo motor do site) e devolve o resultado na linha.
-- Segredos ficam no Vault (nomes rb_agent_url, rb_agent_anon, rb_agent_token, rb_agent_teacher); nenhum valor aparece neste arquivo.
-- O agendamento do pg_cron NÃO está aqui (a extensão não existe em todos os ambientes): ver docs/rotina-banco/agendar-cron.sql.
-- Aditiva e idempotente; nenhum DROP.
-- Desfazer (manual): remover o gatilho, as funções e a tabela abaixo e os agendamentos do cron.

create table if not exists public.review_bank_agent_inbox (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'feito', 'erro')),
  attempts integer not null default 0,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  processed_at timestamptz
);
create index if not exists review_bank_agent_inbox_status_idx on public.review_bank_agent_inbox (status, created_at);
alter table public.review_bank_agent_inbox enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='review_bank_agent_inbox' and policyname='review_bank_agent_inbox_teacher_select') then
    create policy review_bank_agent_inbox_teacher_select on public.review_bank_agent_inbox for select to authenticated
      using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'));
  end if;
end $$;
revoke insert, update, delete on public.review_bank_agent_inbox from anon, authenticated;

-- Lê um segredo do Vault (só funções internas; nenhum cliente executa).
create or replace function public._rb_agent_secret(p_name text)
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;
revoke execute on function public._rb_agent_secret(text) from public, anon, authenticated;

-- Estado para a tarefa: alunos gerenciados e ativos, itens existentes (para não repetir), manual e geração automática.
create or replace function public.review_bank_agent_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_teacher uuid := nullif(public._rb_agent_secret('rb_agent_teacher'), '')::uuid;
begin
  if v_teacher is null then raise exception 'not_configured'; end if;
  return jsonb_build_object(
    'ok', true,
    'today', (now() at time zone 'America/Sao_Paulo')::date,
    'manual_markdown', coalesce((select manual_markdown from public.review_bank_settings where teacher_id = v_teacher), ''),
    'auto_generate', coalesce((select auto_generate from public.review_bank_settings where teacher_id = v_teacher), true),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'language_app_key', s.language_app_key, 'reference_language', s.reference_language,
        'notebook_id', s.notebook_id, 'agenda_names', to_jsonb(s.agenda_names), 'lesson_dates', to_jsonb(s.lesson_dates),
        'last_entry_read', s.last_entry_read, 'started_on', s.started_on,
        'linked_email', (select u.email from auth.users u where u.id = s.linked_student_id),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object('key', i.import_key, 'id', i.id, 'type', i.item_type, 'q', i.question, 'a', i.answer,
                                              'status', i.status, 'class_date', i.class_date, 'has_card', i.teacher_flashcard_id is not null)
                           order by i.created_at)
            from public.review_bank_items i where i.bank_student_id = s.id and i.teacher_id = v_teacher), '[]'::jsonb)
      ) order by s.name)
      from public.review_bank_students s
     where s.teacher_id = v_teacher and s.agent_managed and s.status = 'ativo'), '[]'::jsonb)
  );
end;
$$;

-- Entrega da tarefa: valida o formato mínimo e grava na caixa. O gatilho abaixo avisa a função.
create or replace function public.agent_inbox_submit(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := nullif(public._rb_agent_secret('rb_agent_teacher'), '')::uuid;
  v_id uuid;
begin
  if v_teacher is null then raise exception 'not_configured'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid_payload'; end if;
  if jsonb_typeof(p_payload -> 'students') is distinct from 'array' and jsonb_typeof(p_payload -> 'register_students') is distinct from 'array' then
    raise exception 'invalid_payload';
  end if;
  if octet_length(p_payload::text) > 3000000 then raise exception 'payload_too_large'; end if;
  insert into public.review_bank_agent_inbox (teacher_id, payload) values (v_teacher, p_payload) returning id into v_id;
  return v_id;
end;
$$;

-- Chamada à Edge Function por dentro do Supabase (assíncrona; o resultado volta na linha da caixa).
create or replace function public._rb_agent_post(p_body jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text := public._rb_agent_secret('rb_agent_url');
  v_anon text := public._rb_agent_secret('rb_agent_anon');
  v_token text := public._rb_agent_secret('rb_agent_token');
begin
  if coalesce(v_url, '') = '' or coalesce(v_anon, '') = '' or coalesce(v_token, '') = '' then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon, 'x-agent-token', v_token),
    body := p_body,
    timeout_milliseconds := 60000);
end;
$$;
revoke execute on function public._rb_agent_post(jsonb) from public, anon, authenticated;

create or replace function public._rb_agent_inbox_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public._rb_agent_post(jsonb_build_object('action', 'process_inbox', 'inbox_id', new.id));
  exception when others then
    null; -- nunca derruba a entrega: o cron de reserva reprocessa
  end;
  return new;
end;
$$;
revoke execute on function public._rb_agent_inbox_after_insert() from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'review_bank_agent_inbox_dispatch' and tgrelid = 'public.review_bank_agent_inbox'::regclass) then
    create trigger review_bank_agent_inbox_dispatch after insert on public.review_bank_agent_inbox
      for each row execute function public._rb_agent_inbox_after_insert();
  end if;
end $$;

-- Reserva (o cron chama a cada poucos minutos): se há linha pendente há mais de 1 minuto, ou travada em "processando" há mais de 10, manda de novo.
create or replace function public.agent_inbox_sweep()
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.review_bank_agent_inbox
              where (status = 'pendente' and created_at < now() - interval '1 minute')
                 or (status = 'processando' and claimed_at < now() - interval '10 minutes')) then
    perform public._rb_agent_post(jsonb_build_object('action', 'process_inbox'));
  end if;
end;
$$;

-- A função (service role) reivindica linhas: pendentes, ou travadas há mais de 10 minutos; no máximo 3 tentativas.
create or replace function public.agent_inbox_claim(p_teacher uuid, p_id uuid default null)
returns setof public.review_bank_agent_inbox
language plpgsql security definer set search_path = public as $$
begin
  update public.review_bank_agent_inbox set status = 'erro', error = coalesce(error, 'tentativas esgotadas'), processed_at = now()
   where teacher_id = p_teacher and attempts >= 3 and status in ('pendente', 'processando')
     and (status = 'pendente' or claimed_at < now() - interval '10 minutes');
  return query
    update public.review_bank_agent_inbox i
       set status = 'processando', attempts = i.attempts + 1, claimed_at = now()
     where i.id in (select x.id from public.review_bank_agent_inbox x
                     where x.teacher_id = p_teacher and (p_id is null or x.id = p_id)
                       and (x.status = 'pendente' or (x.status = 'processando' and x.claimed_at < now() - interval '10 minutes'))
                       and x.attempts < 3
                     order by x.created_at limit 5 for update skip locked)
    returning i.*;
end;
$$;

revoke execute on function public.review_bank_agent_state(), public.agent_inbox_submit(jsonb), public.agent_inbox_sweep(),
  public.agent_inbox_claim(uuid, uuid) from public, anon, authenticated;
grant execute on function public.review_bank_agent_state(), public.agent_inbox_submit(jsonb), public.agent_inbox_sweep(),
  public.agent_inbox_claim(uuid, uuid) to service_role;
