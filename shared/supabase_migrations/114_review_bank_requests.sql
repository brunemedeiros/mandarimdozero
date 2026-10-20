-- 114: Pedidos da aluna sobre um item do Banco (decisão da autora, 2026-10-20; docs/banco-revisao-proposta-v2.md).
--
-- * A aluna NÃO corta nem corrige nada sozinha: ela faz um pedido (cortar, sugerir correção ou "parece errado") e a
--   professora decide. O Banco continua sincronizado: cortar vale para todos (inclusive todos os membros de uma Turma).
-- * Enquanto o pedido de corte ou de "parece errado" está aberto, o cartão fica pausado (arquivado) SÓ para quem pediu.
--   Pedido de correção não pausa nada. Recusado ou mantido: o cartão da aluna volta.
-- * Corrigir o conteúdo continua pelo fluxo atual (sync_review_bank_item_cards); aqui só se registra a decisão.
--
-- Aditiva e idempotente; sem DROP. Não altera linhas existentes.
-- Desfazer (manual): drop das funções request_bank_item_change e decide_bank_request e da tabela review_bank_requests.

create table if not exists public.review_bank_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.review_bank_items(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  bank_student_id uuid not null references public.review_bank_students(id) on delete cascade,
  kind text not null check (kind in ('cortar', 'corrigir', 'errado')),
  proposal jsonb,
  reason text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'mantido')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null
);
create unique index if not exists review_bank_requests_open_uidx
  on public.review_bank_requests (item_id, requester_id) where status = 'pendente';
create index if not exists review_bank_requests_teacher_idx
  on public.review_bank_requests (teacher_id, status, created_at desc);
alter table public.review_bank_requests enable row level security;

-- Leitura direta: a professora dona (com a permissão). A aluna só escreve pela função abaixo e não lê a tabela.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_bank_requests'
                  and policyname = 'review_bank_requests_teacher_read') then
    create policy review_bank_requests_teacher_read on public.review_bank_requests for select to authenticated
      using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'));
  end if;
end $$;
revoke insert, update, delete on public.review_bank_requests from anon, authenticated;

-- ---------- Aluna: faz o pedido (pelo cartão dela) ----------
create or replace function public.request_bank_item_change(
  p_teacher_flashcard_id bigint, p_kind text, p_proposal jsonb, p_reason text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_card public.teacher_flashcards%rowtype;
  v_item public.review_bank_items%rowtype;
  v_id uuid;
  v_prop jsonb;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  if p_kind not in ('cortar', 'corrigir', 'errado') then raise exception 'kind_invalido'; end if;
  select * into v_card from public.teacher_flashcards
   where id = p_teacher_flashcard_id and student_id = v_me and bank_item_id is not null;
  if not found then raise exception 'not_authorized'; end if;
  select * into v_item from public.review_bank_items where id = v_card.bank_item_id for update;
  if not found or v_item.status <> 'aprovado'
     or not public.teacher_link_is_active(v_item.teacher_id, v_me, v_item.language_app_key) then
    raise exception 'not_authorized';
  end if;
  -- Só campos conhecidos e curtos entram na sugestão.
  v_prop := case when p_kind = 'corrigir' and p_proposal is not null then
    jsonb_strip_nulls(jsonb_build_object(
      'question', left(btrim(coalesce(p_proposal ->> 'question', '')), 500),
      'answer', left(btrim(coalesce(p_proposal ->> 'answer', '')), 500),
      'note', left(btrim(coalesce(p_proposal ->> 'note', '')), 500)))
    else null end;
  insert into public.review_bank_requests (item_id, teacher_id, requester_id, bank_student_id, kind, proposal, reason)
  values (v_item.id, v_item.teacher_id, v_me, v_item.bank_student_id, p_kind, v_prop,
          nullif(left(btrim(coalesce(p_reason, '')), 500), ''))
  on conflict (item_id, requester_id) where status = 'pendente'
  do update set kind = excluded.kind, proposal = excluded.proposal, reason = excluded.reason, created_at = now()
  returning id into v_id;
  -- Pausa só o cartão de quem pediu (corte e "parece errado"); correção não pausa. Se o pedido anterior pausava e o novo
  -- não, o cartão volta.
  update public.teacher_flashcards
     set status = case when p_kind in ('cortar', 'errado') then 'archived' else 'active' end
   where id = v_card.id and status is distinct from (case when p_kind in ('cortar', 'errado') then 'archived' else 'active' end);
  return v_id;
end;
$$;

-- ---------- Professora: decide ----------
-- 'cortar'   = corta o item para todos (cartões de todos arquivados); todos os pedidos abertos do item ficam aprovados.
-- 'resolver' = a correção já foi aplicada pelo fluxo de edição; o pedido fica aprovado e o cartão de quem pediu volta.
-- 'recusar'  = recusa (kind errado/ cortar/ corrigir: "mantido" quando era "parece errado"); o cartão de quem pediu volta.
create or replace function public.decide_bank_request(p_request_id uuid, p_decision text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_req public.review_bank_requests%rowtype;
  v_status text;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  if p_decision not in ('cortar', 'resolver', 'recusar') then raise exception 'decisao_invalida'; end if;
  select * into v_req from public.review_bank_requests where id = p_request_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if v_req.status <> 'pendente' then return v_req.status; end if;

  if p_decision = 'cortar' then
    update public.teacher_flashcards set status = 'archived' where bank_item_id = v_req.item_id and status <> 'archived';
    update public.review_bank_items set status = 'cortado', updated_at = now() where id = v_req.item_id;
    update public.review_bank_requests set status = 'aprovado', decided_at = now(), decided_by = v_teacher
     where item_id = v_req.item_id and status = 'pendente';
    return 'aprovado';
  end if;

  v_status := case when p_decision = 'resolver' then 'aprovado'
                   when v_req.kind = 'errado' then 'mantido' else 'recusado' end;
  update public.review_bank_requests set status = v_status, decided_at = now(), decided_by = v_teacher
   where id = v_req.id;
  -- O cartão de quem pediu volta, se o item ainda vale.
  update public.teacher_flashcards t set status = 'active'
   where t.bank_item_id = v_req.item_id and t.student_id = v_req.requester_id and t.status = 'archived'
     and exists (select 1 from public.review_bank_items i where i.id = v_req.item_id and i.status = 'aprovado');
  return v_status;
end;
$$;

revoke execute on function public.request_bank_item_change(bigint, text, jsonb, text),
  public.decide_bank_request(uuid, text) from public, anon;
grant execute on function public.request_bank_item_change(bigint, text, jsonb, text),
  public.decide_bank_request(uuid, text) to authenticated;
