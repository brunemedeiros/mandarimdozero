-- Banco de Revisão, parte 6: rotina automática da madrugada (tarefa agendada do Claude -> Edge Function `review-bank-agent`).
-- A tarefa lê o caderno e a agenda e entrega itens/datas de aula à função; a função grava só no Banco (service role,
-- sempre com o teacher_id fixo do secret) e gera os cartões dos alunos vinculados. Cada aluno tem UM dono por vez:
-- `agent_managed = true` quer dizer "este aluno é atualizado pelo site"; false = ainda é do artifact antigo.
-- Aditiva e idempotente; nenhum DROP.
-- Desfazer (manual): remover a função agent_approve_review_bank_item, a tabela review_bank_agent_runs e a coluna agent_managed.

alter table public.review_bank_students add column if not exists agent_managed boolean not null default false;

-- Registro de cada rodada da rotina (auditoria de uma tarefa que roda sem supervisão). Só a professora lê; só a função grava.
create table if not exists public.review_bank_agent_runs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  ran_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb
);
create index if not exists review_bank_agent_runs_idx on public.review_bank_agent_runs (teacher_id, ran_at desc);
alter table public.review_bank_agent_runs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='review_bank_agent_runs' and policyname='review_bank_agent_runs_teacher_select') then
    create policy review_bank_agent_runs_teacher_select on public.review_bank_agent_runs for select to authenticated
      using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'));
  end if;
end $$;

-- Mesma regra de approve_review_bank_item, mas para a Edge Function (service role, sem auth.uid()): o teacher vem do
-- parâmetro e a permissão é conferida por usuário. Nenhum cliente (anon/authenticated) pode executar.
create or replace function public.agent_approve_review_bank_item(
  p_teacher uuid, p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_item public.review_bank_items%rowtype;
  v_s public.review_bank_students%rowtype;
  v_deck bigint;
  v_card bigint;
begin
  if p_teacher is null or not (public._is_admin_uid(p_teacher) or 'teacher' = any(public._account_role_keys(p_teacher)))
     or not public._has_permission(p_teacher, 'review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = p_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if v_item.teacher_flashcard_id is not null then
    return v_item.teacher_flashcard_id;
  end if;
  select * into v_s from public.review_bank_students where id = v_item.bank_student_id and teacher_id = p_teacher;
  if not found or v_s.linked_student_id is null then raise exception 'student_not_linked'; end if;
  if not public.teacher_link_is_active(p_teacher, v_s.linked_student_id, v_s.language_app_key) then raise exception 'link_inactive'; end if;
  select teacher_root_deck_id into v_deck from public.ensure_teacher_decks(v_s.linked_student_id, v_s.language_app_key);
  insert into public.teacher_flashcards
    (teacher_id, student_id, language_app_key, front, back_trans, note, status, fields, card_generation_mode, tags, deck_id, bank_item_id)
  values
    (p_teacher, v_s.linked_student_id, v_s.language_app_key, p_front, p_back_trans, nullif(btrim(coalesce(p_note, '')), ''),
     'active', p_fields, p_mode, coalesce(p_tags, '{}'::text[]), v_deck, p_item_id)
  returning id into v_card;
  update public.review_bank_items
     set status = 'aprovado', teacher_flashcard_id = v_card, student_id = v_s.linked_student_id, updated_at = now()
   where id = p_item_id;
  return v_card;
end;
$$;

revoke execute on function public.agent_approve_review_bank_item(uuid, uuid, text, text, jsonb, text, text[], text) from public, anon, authenticated;
grant execute on function public.agent_approve_review_bank_item(uuid, uuid, text, text, jsonb, text, text[], text) to service_role;
