-- 096: Banco de Revisão ligado a uma Turma (plano aprovado pela autora em 2026-10-15: docs/banco-revisao-turmas-plano.md).
--
-- * Um aluno do Banco é ligado a UMA conta (linked_student_id) OU a UMA turma (classroom_id), nunca às duas.
-- * Cada item continua existindo uma vez; cada destinatário (a conta, ou cada membro da turma com vínculo ativo)
--   recebe a própria cópia do cartão em "Cartões da professora", com o próprio progresso (FSRS).
-- * Aprovar, reaprovar, cortar e corrigir valem para as cópias de todos.
-- * Modo aula: a resposta vale para todos os membros que já estavam na turma na hora da resposta; cada um confirma a sua
--   (tabela review_bank_review_acks). Quem entra depois recebe todos os cartões, mas não as respostas antigas.
-- * Quem sai da turma (ou perde o vínculo) fica com os cartões que já recebeu; só deixa de receber os novos.
-- * O modo agente (089/090, agent_approve_review_bank_item) não é tocado: ele exige conta vinculada e recusa aluno de turma.
--
-- Tem DROP INDEX (o índice único "1 cartão por item" vira "1 cartão por item por aluno"): aplicar pelo SQL Editor
-- (skill migration-supabase). Idempotente.
-- Desfazer: drop das funções _rb_*, link_review_bank_classroom, sync_review_bank_item_cards, do trigger
-- trg_classroom_members_review_bank e da tabela review_bank_review_acks; recriar 081/082 (approve, status, pendentes,
-- ack, link, unlink); drop da coluna classroom_id; recriar teacher_flashcards_bank_item_uidx (só se não houver item com
-- mais de 1 cartão).

-- ---------- Aluno do Banco -> turma ----------
alter table public.review_bank_students
  add column if not exists classroom_id bigint references public.classrooms(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'review_bank_students_one_target_check') then
    alter table public.review_bank_students add constraint review_bank_students_one_target_check
      check (linked_student_id is null or classroom_id is null);
  end if;
end $$;
create index if not exists review_bank_students_classroom_idx on public.review_bank_students (classroom_id) where classroom_id is not null;

-- Escrita direta: a turma precisa ser da própria professora, no mesmo idioma (helper da 094: classrooms é fechada
-- para leitura direta, então a policy não pode consultar a tabela).
alter policy review_bank_students_teacher_all on public.review_bank_students to authenticated
  using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
  with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank')
    and (linked_student_id is null or exists (select 1 from public.teacher_students ts
          where ts.teacher_id = auth.uid() and ts.student_id = review_bank_students.linked_student_id
            and ts.language_app_key = review_bank_students.language_app_key and ts.status = 'active'))
    and (classroom_id is null
         or public._teacher_owns_classroom(review_bank_students.classroom_id, review_bank_students.language_app_key)));

-- ---------- 1 cartão por item POR ALUNO ----------
create unique index if not exists teacher_flashcards_bank_item_student_uidx
  on public.teacher_flashcards (bank_item_id, student_id) where bank_item_id is not null;
drop index if exists public.teacher_flashcards_bank_item_uidx;

-- ---------- Confirmação de resposta do Modo aula, por aluno ----------
create table if not exists public.review_bank_review_acks (
  review_id uuid not null references public.review_bank_reviews(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (review_id, student_id)
);
alter table public.review_bank_review_acks enable row level security;
revoke all on public.review_bank_review_acks from anon, authenticated;

-- ---------- Destinatários de um aluno do Banco ----------
-- A conta vinculada (desde sempre) ou cada membro da turma com vínculo ativo (desde a entrada na turma).
create or replace function public._rb_recipients(p_bank_student_id uuid)
returns table (student_id uuid, since timestamptz)
language sql stable security definer set search_path = public as $$
  select s.linked_student_id, '-infinity'::timestamptz
    from public.review_bank_students s
   where s.id = p_bank_student_id and s.linked_student_id is not null
     and public.teacher_link_is_active(s.teacher_id, s.linked_student_id, s.language_app_key)
  union all
  select m.student_id, m.added_at
    from public.review_bank_students s
    join public.classrooms c on c.id = s.classroom_id and c.teacher_id = s.teacher_id and c.language_app_key = s.language_app_key
    join public.classroom_members m on m.classroom_id = c.id
   where s.id = p_bank_student_id
     and public.teacher_link_is_active(s.teacher_id, m.student_id, s.language_app_key);
$$;
revoke execute on function public._rb_recipients(uuid) from public, anon, authenticated;

-- Deck "Cartões da professora" do aluno, agindo como a professora só durante a chamada (quem dispara pode ser o aluno,
-- ao entrar pelo link da turma). Mesmo recurso da 090.
create or replace function public._rb_teacher_root_deck(p_teacher uuid, p_student uuid, p_lang text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_deck bigint;
  v_prev_claims text := current_setting('request.jwt.claims', true);
  v_prev_sub text := current_setting('request.jwt.claim.sub', true);
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_teacher::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_teacher::text, true);
  select teacher_root_deck_id into v_deck from public.ensure_teacher_decks(p_student, p_lang);
  perform set_config('request.jwt.claims', coalesce(v_prev_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_prev_sub, ''), true);
  return v_deck;
end;
$$;
revoke execute on function public._rb_teacher_root_deck(uuid, uuid, text) from public, anon, authenticated;

-- Cria (ou reativa) a cópia do cartão de um item para um aluno. Devolve o id do cartão dele.
create or replace function public._rb_deliver(
  p_item public.review_bank_items, p_student uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text,
  p_tags text[], p_note text, p_revision integer
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_card bigint; v_deck bigint;
begin
  select id into v_card from public.teacher_flashcards where bank_item_id = p_item.id and student_id = p_student;
  if v_card is not null then
    update public.teacher_flashcards set status = 'active' where id = v_card and status <> 'active';
    return v_card;
  end if;
  v_deck := public._rb_teacher_root_deck(p_item.teacher_id, p_student, p_item.language_app_key);
  insert into public.teacher_flashcards
    (teacher_id, student_id, language_app_key, front, back_trans, note, status, fields, card_generation_mode, tags, deck_id,
     bank_item_id, revision)
  values
    (p_item.teacher_id, p_student, p_item.language_app_key, p_front, p_back_trans, nullif(btrim(coalesce(p_note, '')), ''),
     'active', p_fields, p_mode, coalesce(p_tags, '{}'::text[]), v_deck, p_item.id, coalesce(p_revision, 0))
  on conflict (bank_item_id, student_id) where bank_item_id is not null do update set status = 'active'
  returning id into v_card;
  return v_card;
end;
$$;
revoke execute on function public._rb_deliver(public.review_bank_items, uuid, text, text, jsonb, text, text[], text, integer)
  from public, anon, authenticated;

-- Dá a um aluno a cópia de UM item já entregue, copiando o conteúdo de um cartão irmão (o de referência primeiro).
create or replace function public._rb_backfill_item(p_item public.review_bank_items, p_student uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_src public.teacher_flashcards%rowtype;
begin
  if exists (select 1 from public.teacher_flashcards t where t.bank_item_id = p_item.id and t.student_id = p_student) then
    return false;
  end if;
  select * into v_src from public.teacher_flashcards t where t.bank_item_id = p_item.id
   order by (t.id = p_item.teacher_flashcard_id) desc, t.id limit 1;
  if not found then return false; end if;
  perform public._rb_deliver(p_item, p_student, v_src.front, v_src.back_trans, v_src.fields, v_src.card_generation_mode,
                             v_src.tags, v_src.note, v_src.revision);
  return true;
end;
$$;
revoke execute on function public._rb_backfill_item(public.review_bank_items, uuid) from public, anon, authenticated;

-- Dá a um aluno as cópias de todos os itens já entregues (aprovados) de um aluno do Banco.
-- Usado ao ligar a turma e quando alguém entra na turma.
create or replace function public._rb_backfill_student(p_bank_student_id uuid, p_student uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_item public.review_bank_items%rowtype; v_n integer := 0;
begin
  for v_item in
    select i.* from public.review_bank_items i
     where i.bank_student_id = p_bank_student_id and i.status = 'aprovado' and i.teacher_flashcard_id is not null
  loop
    if public._rb_backfill_item(v_item, p_student) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public._rb_backfill_student(uuid, uuid) from public, anon, authenticated;

-- ---------- Vincular a uma conta / a uma turma / desvincular ----------
create or replace function public.link_review_bank_student(p_bank_student_id uuid, p_student_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_s public.review_bank_students%rowtype;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into v_s from public.review_bank_students where id = p_bank_student_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if not exists (select 1 from public.teacher_students ts where ts.teacher_id = v_teacher
      and ts.student_id = p_student_id and ts.language_app_key = v_s.language_app_key and ts.status = 'active') then
    raise exception 'link_inactive';
  end if;
  update public.review_bank_students set linked_student_id = p_student_id, classroom_id = null, updated_at = now()
   where id = p_bank_student_id;
  update public.review_bank_items set student_id = p_student_id where bank_student_id = p_bank_student_id and teacher_flashcard_id is null;
end;
$$;

-- Liga à turma e já entrega a cada membro as cópias dos itens aprovados que ele ainda não tem.
-- Quem estava vinculado antes fica com os cartões que já tinha (se for membro, eles viram a cópia dele).
create or replace function public.link_review_bank_classroom(p_bank_student_id uuid, p_classroom_id bigint)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_s public.review_bank_students%rowtype;
  v_r record;
  v_n integer := 0;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into v_s from public.review_bank_students where id = p_bank_student_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if not exists (select 1 from public.classrooms c where c.id = p_classroom_id and c.teacher_id = v_teacher
                  and c.language_app_key = v_s.language_app_key) then
    raise exception 'classroom_invalid';
  end if;
  update public.review_bank_students set classroom_id = p_classroom_id, linked_student_id = null, updated_at = now()
   where id = p_bank_student_id;
  update public.review_bank_items set student_id = null where bank_student_id = p_bank_student_id and teacher_flashcard_id is null;
  for v_r in select * from public._rb_recipients(p_bank_student_id) loop
    v_n := v_n + public._rb_backfill_student(p_bank_student_id, v_r.student_id);
  end loop;
  return v_n;
end;
$$;

create or replace function public.unlink_review_bank_student(p_bank_student_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  update public.review_bank_students set linked_student_id = null, classroom_id = null, updated_at = now()
   where id = p_bank_student_id and teacher_id = auth.uid();
  if not found then raise exception 'not_authorized'; end if;
end;
$$;

-- ---------- Aprovar: uma cópia para cada destinatário ----------
-- Devolve o id do cartão "de referência" do item (o primeiro entregue), como antes.
create or replace function public.approve_review_bank_item(
  p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_item public.review_bank_items%rowtype;
  v_s public.review_bank_students%rowtype;
  v_r record;
  v_card bigint;
  v_first bigint;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  select * into v_s from public.review_bank_students where id = v_item.bank_student_id;
  -- Já entregue: reativa as cópias de todos e completa quem ainda não tem (com o conteúdo atual do cartão).
  if v_item.teacher_flashcard_id is not null then
    update public.teacher_flashcards set status = 'active' where bank_item_id = p_item_id and status <> 'active';
    update public.review_bank_items set status = 'aprovado', updated_at = now() where id = p_item_id;
    v_item.status := 'aprovado';
    for v_r in select * from public._rb_recipients(v_s.id) loop
      perform public._rb_backfill_item(v_item, v_r.student_id);
    end loop;
    return v_item.teacher_flashcard_id;
  end if;
  if v_s.linked_student_id is null and v_s.classroom_id is null then raise exception 'student_not_linked'; end if;
  for v_r in select * from public._rb_recipients(v_s.id) loop
    v_card := public._rb_deliver(v_item, v_r.student_id, p_front, p_back_trans, p_fields, p_mode, p_tags, p_note, 0);
    v_first := coalesce(v_first, v_card);
  end loop;
  if v_first is null then
    -- turma vazia (ou conta sem vínculo ativo): nada a entregar
    raise exception 'no_recipients';
  end if;
  update public.review_bank_items
     set status = 'aprovado', teacher_flashcard_id = v_first,
         student_id = case when v_s.classroom_id is null then v_s.linked_student_id else null end, updated_at = now()
   where id = p_item_id;
  return v_first;
end;
$$;

-- Status: cortar/voltar a pendente arquiva as cópias de todos; reaprovar reativa todas.
create or replace function public.set_review_bank_item_status(p_item_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_item public.review_bank_items%rowtype;
  v_s public.review_bank_students%rowtype;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('pendente', 'aprovado', 'cortado') then raise exception 'status_invalido'; end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  select * into v_s from public.review_bank_students where id = v_item.bank_student_id;
  if p_status = 'aprovado' and v_item.teacher_flashcard_id is null
     and (v_s.linked_student_id is not null or v_s.classroom_id is not null) then
    raise exception 'use_approve_review_bank_item';
  end if;
  update public.teacher_flashcards
     set status = case when p_status = 'aprovado' then 'active' else 'archived' end
   where bank_item_id = p_item_id
     and status is distinct from (case when p_status = 'aprovado' then 'active' else 'archived' end);
  update public.review_bank_items set status = p_status, updated_at = now() where id = p_item_id;
end;
$$;

-- Corrigir um item entregue: atualiza as cópias de todos de uma vez. p_bump_revision = "mudou o sentido" ou mudou o tipo
-- de cartão (o progresso recomeça); sem isso, é correção e o progresso fica.
create or replace function public.sync_review_bank_item_cards(
  p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text,
  p_bump_revision boolean
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_teacher uuid := auth.uid(); v_n integer;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from public.review_bank_items where id = p_item_id and teacher_id = v_teacher) then
    raise exception 'not_authorized';
  end if;
  update public.teacher_flashcards
     set front = p_front, back_trans = p_back_trans, fields = p_fields, card_generation_mode = p_mode,
         tags = coalesce(p_tags, '{}'::text[]), note = nullif(btrim(coalesce(p_note, '')), ''),
         revision = revision + case when p_bump_revision then 1 else 0 end
   where bank_item_id = p_item_id and teacher_id = v_teacher;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------- Aluno: respostas do Modo aula ----------
-- Conta vinculada: como antes (applied_at da resposta). Turma: só respostas do Modo aula dadas depois que o aluno entrou
-- na turma, cada um confirma a sua. Sempre pelo cartão do PRÓPRIO aluno.
create or replace function public.get_my_pending_bank_reviews(p_language_app_key text)
returns table (id uuid, teacher_flashcard_id bigint, outcome text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, t.id, r.outcome, r.created_at
    from public.review_bank_reviews r
    join public.review_bank_items i on i.id = r.item_id
    join public.review_bank_students s on s.id = r.bank_student_id
    join public.teacher_flashcards t on t.bank_item_id = i.id and t.student_id = auth.uid()
   where s.language_app_key = p_language_app_key
     and public.teacher_link_is_active(s.teacher_id, auth.uid(), s.language_app_key)
     and not exists (select 1 from public.review_bank_review_acks a where a.review_id = r.id and a.student_id = auth.uid())
     and (
       (s.linked_student_id = auth.uid() and r.applied_at is null)
       or (s.classroom_id is not null and r.source = 'modo_aula'
           and exists (select 1 from public.classroom_members m
                        where m.classroom_id = s.classroom_id and m.student_id = auth.uid() and m.added_at <= r.created_at))
     )
   order by r.created_at;
$$;

create or replace function public.ack_my_bank_reviews(p_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_n integer;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  insert into public.review_bank_review_acks (review_id, student_id)
  select r.id, v_me
    from public.review_bank_reviews r
    join public.review_bank_students s on s.id = r.bank_student_id
   where r.id = any(p_ids)
     and (s.linked_student_id = v_me
          or (s.classroom_id is not null and exists (select 1 from public.classroom_members m
                                                       where m.classroom_id = s.classroom_id and m.student_id = v_me)))
  on conflict do nothing;
  get diagnostics v_n = row_count;
  update public.review_bank_reviews r set applied_at = now()
   where r.applied_at is null and r.id = any(p_ids)
     and exists (select 1 from public.review_bank_students s where s.id = r.bank_student_id and s.linked_student_id = v_me);
  return v_n;
end;
$$;

-- ---------- Entrou na turma: recebe todos os cartões já entregues ----------
create or replace function public._classroom_members_review_bank()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_bs uuid;
begin
  for v_bs in
    select s.id from public.review_bank_students s join public.classrooms c on c.id = s.classroom_id
     where s.classroom_id = new.classroom_id and c.teacher_id = s.teacher_id
       and public.teacher_link_is_active(s.teacher_id, new.student_id, s.language_app_key)
  loop
    perform public._rb_backfill_student(v_bs, new.student_id);
  end loop;
  return null;
end $$;
revoke execute on function public._classroom_members_review_bank() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_classroom_members_review_bank') then
    create trigger trg_classroom_members_review_bank after insert on public.classroom_members
      for each row execute function public._classroom_members_review_bank();
  end if;
end $$;

-- ---------- Grants ----------
revoke execute on function public.link_review_bank_student(uuid, uuid), public.unlink_review_bank_student(uuid),
  public.link_review_bank_classroom(uuid, bigint),
  public.approve_review_bank_item(uuid, text, text, jsonb, text, text[], text),
  public.set_review_bank_item_status(uuid, text),
  public.sync_review_bank_item_cards(uuid, text, text, jsonb, text, text[], text, boolean),
  public.get_my_pending_bank_reviews(text), public.ack_my_bank_reviews(uuid[]) from public, anon;
grant execute on function public.link_review_bank_student(uuid, uuid), public.unlink_review_bank_student(uuid),
  public.link_review_bank_classroom(uuid, bigint),
  public.approve_review_bank_item(uuid, text, text, jsonb, text, text[], text),
  public.set_review_bank_item_status(uuid, text),
  public.sync_review_bank_item_cards(uuid, text, text, jsonb, text, text[], text, boolean),
  public.get_my_pending_bank_reviews(text), public.ack_my_bank_reviews(uuid[]) to authenticated;
