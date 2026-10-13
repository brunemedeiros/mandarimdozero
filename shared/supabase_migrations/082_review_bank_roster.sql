-- Banco de Revisão, parte 2: lista própria de alunos do Banco (com ou sem conta no site), configurações e manual.
-- Decisão da autora (2026-10-12): o Banco funciona para qualquer aluno da lista (Modo aula, Récap, Visão geral),
-- mas só GERA cartões em "Cartões da professora" quando o aluno está vinculado a uma conta com vínculo ativo
-- (teacher_students) no mesmo idioma. A fonte de verdade da conta é review_bank_students.linked_student_id.
--
-- Aditiva e idempotente; nenhum DROP. A 081 só existia no Staging, sem linhas nas tabelas do Banco, então
-- bank_student_id pode ser NOT NULL. Policies trocadas por ALTER POLICY (a ferramenta de migration trava com DROP).
-- Desfazer (manual): remover as funções novas/redefinidas, as colunas bank_student_id e as 2 tabelas novas.

-- ---------- Configurações da professora (geração automática + manual de anotações) ----------
create table if not exists public.review_bank_settings (
  teacher_id uuid primary key references auth.users(id) on delete cascade,
  auto_generate boolean not null default true,
  manual_markdown text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.review_bank_settings enable row level security;

-- ---------- Alunos do Banco ----------
create table if not exists public.review_bank_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  reference_language text not null default 'pt' check (reference_language in ('pt', 'en', 'fr')),
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  linked_student_id uuid references auth.users(id) on delete set null,
  notebook_id text,
  agenda_names text[] not null default '{}',
  lesson_dates date[] not null default '{}',
  last_entry_read date,
  started_on date,
  import_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists review_bank_students_import_uidx
  on public.review_bank_students (teacher_id, import_key) where import_key is not null;
create unique index if not exists review_bank_students_linked_uidx
  on public.review_bank_students (teacher_id, linked_student_id, language_app_key) where linked_student_id is not null;
alter table public.review_bank_students enable row level security;

-- ---------- Itens, recaps e respostas passam a apontar para o aluno do Banco ----------
alter table public.review_bank_items
  add column if not exists bank_student_id uuid references public.review_bank_students(id) on delete cascade,
  add column if not exists import_key text,
  add column if not exists proposal jsonb;
alter table public.review_bank_items alter column student_id drop not null;
alter table public.review_bank_items alter column bank_student_id set not null;
create unique index if not exists review_bank_items_import_uidx
  on public.review_bank_items (bank_student_id, import_key) where import_key is not null;
create index if not exists review_bank_items_bank_student_idx on public.review_bank_items (bank_student_id, status);

alter table public.review_bank_recaps
  add column if not exists bank_student_id uuid references public.review_bank_students(id) on delete cascade;
alter table public.review_bank_recaps alter column student_id drop not null;
alter table public.review_bank_recaps alter column bank_student_id set not null;
create unique index if not exists review_bank_recaps_bank_student_uidx
  on public.review_bank_recaps (bank_student_id, class_date);

alter table public.review_bank_reviews
  add column if not exists bank_student_id uuid references public.review_bank_students(id) on delete cascade;
alter table public.review_bank_reviews alter column student_id drop not null;
alter table public.review_bank_reviews alter column bank_student_id set not null;
create index if not exists review_bank_reviews_bank_student_idx on public.review_bank_reviews (bank_student_id, created_at desc);

-- ---------- RLS ----------
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='review_bank_students' and policyname='review_bank_students_teacher_all') then
    create policy review_bank_students_teacher_all on public.review_bank_students for all to authenticated
      using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
      with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank')
        and (linked_student_id is null or exists (select 1 from public.teacher_students ts
              where ts.teacher_id = auth.uid() and ts.student_id = review_bank_students.linked_student_id
                and ts.language_app_key = review_bank_students.language_app_key and ts.status = 'active')));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='review_bank_settings' and policyname='review_bank_settings_teacher_all') then
    create policy review_bank_settings_teacher_all on public.review_bank_settings for all to authenticated
      using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
      with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'));
  end if;
end $$;

alter policy review_bank_items_teacher_all on public.review_bank_items
  using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
  with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank')
    and exists (select 1 from public.review_bank_students s where s.id = review_bank_items.bank_student_id
      and s.teacher_id = auth.uid() and s.language_app_key = review_bank_items.language_app_key));
alter policy review_bank_recaps_teacher_all on public.review_bank_recaps
  using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
  with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank')
    and exists (select 1 from public.review_bank_students s where s.id = review_bank_recaps.bank_student_id
      and s.teacher_id = auth.uid() and s.language_app_key = review_bank_recaps.language_app_key));
alter policy review_bank_reviews_teacher_all on public.review_bank_reviews
  using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
  with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank')
    and exists (select 1 from public.review_bank_students s where s.id = review_bank_reviews.bank_student_id
      and s.teacher_id = auth.uid() and s.language_app_key = review_bank_reviews.language_app_key));

-- ---------- Vincular / desvincular o aluno do Banco a uma conta ----------
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
  update public.review_bank_students set linked_student_id = p_student_id, updated_at = now() where id = p_bank_student_id;
  update public.review_bank_items set student_id = p_student_id where bank_student_id = p_bank_student_id and teacher_flashcard_id is null;
end;
$$;

create or replace function public.unlink_review_bank_student(p_bank_student_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  update public.review_bank_students set linked_student_id = null, updated_at = now()
   where id = p_bank_student_id and teacher_id = auth.uid();
  if not found then raise exception 'not_authorized'; end if;
end;
$$;

-- ---------- Aprovar (agora pelo aluno do Banco; exige conta vinculada) ----------
create or replace function public.approve_review_bank_item(
  p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_item public.review_bank_items%rowtype;
  v_s public.review_bank_students%rowtype;
  v_deck bigint;
  v_card bigint;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if v_item.teacher_flashcard_id is not null then
    update public.teacher_flashcards set status = 'active' where id = v_item.teacher_flashcard_id;
    update public.review_bank_items set status = 'aprovado', updated_at = now() where id = p_item_id;
    return v_item.teacher_flashcard_id;
  end if;
  select * into v_s from public.review_bank_students where id = v_item.bank_student_id;
  if v_s.linked_student_id is null then raise exception 'student_not_linked'; end if;
  select teacher_root_deck_id into v_deck from public.ensure_teacher_decks(v_s.linked_student_id, v_s.language_app_key);
  insert into public.teacher_flashcards
    (teacher_id, student_id, language_app_key, front, back_trans, note, status, fields, card_generation_mode, tags, deck_id, bank_item_id)
  values
    (v_teacher, v_s.linked_student_id, v_s.language_app_key, p_front, p_back_trans, nullif(btrim(coalesce(p_note, '')), ''),
     'active', p_fields, p_mode, coalesce(p_tags, '{}'::text[]), v_deck, p_item_id)
  returning id into v_card;
  update public.review_bank_items
     set status = 'aprovado', teacher_flashcard_id = v_card, student_id = v_s.linked_student_id, updated_at = now()
   where id = p_item_id;
  return v_card;
end;
$$;

-- Aluno sem conta: aprovar só marca o item (entra no Récap e no Modo aula). Aluno vinculado: aprovar sem cartão exige approve.
create or replace function public.set_review_bank_item_status(p_item_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_item public.review_bank_items%rowtype;
  v_linked uuid;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('pendente', 'aprovado', 'cortado') then raise exception 'status_invalido'; end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  select linked_student_id into v_linked from public.review_bank_students where id = v_item.bank_student_id;
  if p_status = 'aprovado' and v_item.teacher_flashcard_id is null and v_linked is not null then
    raise exception 'use_approve_review_bank_item';
  end if;
  if v_item.teacher_flashcard_id is not null then
    update public.teacher_flashcards
       set status = case when p_status = 'aprovado' then 'active' else 'archived' end
     where id = v_item.teacher_flashcard_id;
  end if;
  update public.review_bank_items set status = p_status, updated_at = now() where id = p_item_id;
end;
$$;

-- ---------- Aluno: eventos do Modo aula (agora pela conta vinculada) ----------
create or replace function public.get_my_pending_bank_reviews(p_language_app_key text)
returns table (id uuid, teacher_flashcard_id bigint, outcome text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, i.teacher_flashcard_id, r.outcome, r.created_at
    from public.review_bank_reviews r
    join public.review_bank_items i on i.id = r.item_id
    join public.review_bank_students s on s.id = r.bank_student_id
   where s.linked_student_id = auth.uid() and s.language_app_key = p_language_app_key and r.applied_at is null
     and i.teacher_flashcard_id is not null
     and public.teacher_link_is_active(s.teacher_id, s.linked_student_id, s.language_app_key)
   order by r.created_at;
$$;

create or replace function public.ack_my_bank_reviews(p_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  update public.review_bank_reviews r set applied_at = now()
   where r.applied_at is null and r.id = any(p_ids)
     and exists (select 1 from public.review_bank_students s where s.id = r.bank_student_id and s.linked_student_id = auth.uid());
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.link_review_bank_student(uuid, uuid), public.unlink_review_bank_student(uuid) from public, anon;
grant execute on function public.link_review_bank_student(uuid, uuid), public.unlink_review_bank_student(uuid) to authenticated;
