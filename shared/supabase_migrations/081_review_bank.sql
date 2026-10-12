-- Banco de Revisão da professora (docs/historico/15-auditoria-banco-revisao.md).
-- A professora registra itens por aluno (vocabulário, estrutura, verbo, erro, pronúncia); ao APROVAR, o item
-- vira um cartão em teacher_flashcards (deck "Cartões da professora" do aluno) na mesma transação.
-- O Modo aula grava respostas em review_bank_reviews; o app do aluno consome os eventos pendentes e aplica no
-- FSRS dele (o progresso só é escrito pelo dono, então a professora nunca grava em progress).
--
-- Aditiva e idempotente; nenhum DROP. Sem policy de leitura para o aluno nas tabelas do Banco: ele só enxerga
-- o que virou cartão e os eventos pendentes dele, por RPC. Observação do item (explanation) é visível ao aluno
-- depois de aprovada; check_note ("para conferir") é só da professora.
-- Desfazer (manual): remover as funções abaixo, a coluna teacher_flashcards.bank_item_id e as 3 tabelas.

-- ---------- Permissão (plano Professora) ----------
insert into public.permission_catalog (key, kind, label_pt, sort) values
  ('review_bank', 'bool', 'Banco de Revisão (cartões automáticos para o aluno)', 130)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, enabled, limit_value)
select r.role, 'review_bank', (r.role = 'teacher'), null::int
  from (values ('user'), ('student'), ('premium_basic'), ('premium_pro'), ('teacher')) as r(role)
on conflict (role, permission_key) do nothing;

-- ---------- Itens ----------
create table if not exists public.review_bank_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  class_date date,
  item_type text not null check (item_type in ('vocabulario', 'estrutura', 'verbo', 'erro', 'pronuncia')),
  question text not null,
  answer text not null,
  wrong_form text,
  gap_word text,
  explanation text,
  check_note text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'cortado')),
  teacher_flashcard_id bigint references public.teacher_flashcards(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists review_bank_items_student_idx
  on public.review_bank_items (teacher_id, student_id, language_app_key, status);
create index if not exists review_bank_items_class_date_idx
  on public.review_bank_items (student_id, language_app_key, class_date);
alter table public.review_bank_items enable row level security;

-- Um item gera no máximo 1 cartão (trava contra aprovar duas vezes / clique duplo).
alter table public.teacher_flashcards add column if not exists bank_item_id uuid;
create unique index if not exists teacher_flashcards_bank_item_uidx
  on public.teacher_flashcards (bank_item_id) where bank_item_id is not null;

-- ---------- Recaps (um por aula) ----------
create table if not exists public.review_bank_recaps (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  class_date date not null,
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id, language_app_key, class_date)
);
alter table public.review_bank_recaps enable row level security;

-- ---------- Respostas do Modo aula ----------
create table if not exists public.review_bank_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.review_bank_items(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  outcome text not null check (outcome in ('acertou', 'ajuda', 'errou')),
  reason text,
  source text not null default 'modo_aula' check (source in ('modo_aula', 'importado')),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
create index if not exists review_bank_reviews_item_idx on public.review_bank_reviews (item_id, created_at desc);
create index if not exists review_bank_reviews_pending_idx
  on public.review_bank_reviews (student_id, language_app_key) where applied_at is null;
alter table public.review_bank_reviews enable row level security;

-- ---------- RLS: só a professora dona, com a permissão e vínculo ativo na escrita ----------
do $$
declare t text;
begin
  foreach t in array array['review_bank_items', 'review_bank_recaps', 'review_bank_reviews'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname = t || '_teacher_all') then
      execute format($p$create policy %I on public.%I for all to authenticated
        using (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank'))
        with check (auth.uid() = teacher_id and public.is_teacher() and public.has_permission('review_bank')
          and exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid()
            and ts.student_id = %I.student_id and ts.language_app_key = %I.language_app_key and ts.status = 'active'))$p$,
        t || '_teacher_all', t, t, t);
    end if;
  end loop;
end $$;

-- ---------- Aprovar: cria o cartão e liga ao item, tudo numa transação (idempotente) ----------
-- O cliente monta o conteúdo nativo (fields/modo/tags/front/back) com o motor; aqui só autorização e atomicidade.
create or replace function public.approve_review_bank_item(
  p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_item public.review_bank_items%rowtype;
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
  select teacher_root_deck_id into v_deck from public.ensure_teacher_decks(v_item.student_id, v_item.language_app_key);
  insert into public.teacher_flashcards
    (teacher_id, student_id, language_app_key, front, back_trans, note, status, fields, card_generation_mode, tags, deck_id, bank_item_id)
  values
    (v_teacher, v_item.student_id, v_item.language_app_key, p_front, p_back_trans, nullif(btrim(coalesce(p_note, '')), ''),
     'active', p_fields, p_mode, coalesce(p_tags, '{}'::text[]), v_deck, p_item_id)
  returning id into v_card;
  update public.review_bank_items set status = 'aprovado', teacher_flashcard_id = v_card, updated_at = now() where id = p_item_id;
  return v_card;
end;
$$;

-- Mudar status depois: cortar arquiva o cartão (nunca apaga); re-aprovar item já entregue reativa o mesmo cartão.
create or replace function public.set_review_bank_item_status(p_item_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := auth.uid();
  v_item public.review_bank_items%rowtype;
begin
  if v_teacher is null or not public.is_teacher() or not public.has_permission('review_bank') then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('pendente', 'aprovado', 'cortado') then raise exception 'status_invalido'; end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = v_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if p_status = 'aprovado' and v_item.teacher_flashcard_id is null then raise exception 'use_approve_review_bank_item'; end if;
  if v_item.teacher_flashcard_id is not null then
    update public.teacher_flashcards
       set status = case when p_status = 'aprovado' then 'active' else 'archived' end
     where id = v_item.teacher_flashcard_id;
  end if;
  update public.review_bank_items set status = p_status, updated_at = now() where id = p_item_id;
end;
$$;

-- ---------- Aluno: eventos do Modo aula ainda não aplicados ao FSRS dele ----------
create or replace function public.get_my_pending_bank_reviews(p_language_app_key text)
returns table (id uuid, teacher_flashcard_id bigint, outcome text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, i.teacher_flashcard_id, r.outcome, r.created_at
    from public.review_bank_reviews r
    join public.review_bank_items i on i.id = r.item_id
   where r.student_id = auth.uid() and r.language_app_key = p_language_app_key and r.applied_at is null
     and i.teacher_flashcard_id is not null
     and public.teacher_link_is_active(r.teacher_id, r.student_id, r.language_app_key)
   order by r.created_at;
$$;

create or replace function public.ack_my_bank_reviews(p_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  update public.review_bank_reviews set applied_at = now()
   where student_id = auth.uid() and applied_at is null and id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.approve_review_bank_item(uuid, text, text, jsonb, text, text[], text),
  public.set_review_bank_item_status(uuid, text), public.get_my_pending_bank_reviews(text),
  public.ack_my_bank_reviews(uuid[]) from public, anon;
grant execute on function public.approve_review_bank_item(uuid, text, text, jsonb, text, text[], text),
  public.set_review_bank_item_status(uuid, text), public.get_my_pending_bank_reviews(text),
  public.ack_my_bank_reviews(uuid[]) to authenticated;
