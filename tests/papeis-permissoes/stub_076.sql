-- Complemento do schema mínimo para a 076: tabelas/policies da professora como estão na produção (2026-10-08).
alter table public.teacher_students enable row level security;
create policy teacher_students_admin_write on public.teacher_students for all to authenticated
  using ((auth.jwt() ->> 'email') = 'brunemed1310@gmail.com') with check ((auth.jwt() ->> 'email') = 'brunemed1310@gmail.com');
create policy teacher_students_student_read on public.teacher_students for select to authenticated using (auth.uid() = student_id);
create policy teacher_students_teacher_read on public.teacher_students for select to authenticated using (auth.uid() = teacher_id);

create table public.teacher_flashcards (id bigint generated always as identity primary key, teacher_id uuid not null,
  student_id uuid not null, language_app_key text not null, front text, status text default 'active');
alter table public.teacher_flashcards enable row level security;
create policy teacher_flashcards_admin_write on public.teacher_flashcards for all
  using ((auth.jwt() ->> 'email') = 'brunemed1310@gmail.com') with check ((auth.jwt() ->> 'email') = 'brunemed1310@gmail.com');
create policy teacher_flashcards_student_read on public.teacher_flashcards for select using (auth.uid() = student_id);
create policy teacher_flashcards_teacher_read on public.teacher_flashcards for select using (auth.uid() = teacher_id);

create table public.teacher_class_logs (id bigint generated always as identity primary key, teacher_id uuid not null,
  student_id uuid not null, language_app_key text not null, class_date date default current_date, topic text, homework text,
  observations text, notes text, created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.teacher_class_logs enable row level security;
create policy teacher_class_logs_owner_all on public.teacher_class_logs for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

create table public.teacher_support_materials (id bigint generated always as identity primary key, teacher_id uuid not null,
  student_id uuid not null, language_app_key text not null, title text);
alter table public.teacher_support_materials enable row level security;
create policy teacher_support_materials_student_read on public.teacher_support_materials for select using (auth.uid() = student_id);
create policy teacher_support_materials_teacher_all on public.teacher_support_materials for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

create table public.decks (id bigint generated always as identity primary key, owner_id uuid, teacher_id uuid, parent_deck_id bigint,
  kind text not null, name text, language_app_key text);
alter table public.decks enable row level security;
create policy decks_admin_write on public.decks for all
  using ((auth.jwt() ->> 'email') = 'brunemed1310@gmail.com') with check ((auth.jwt() ->> 'email') = 'brunemed1310@gmail.com');
create policy decks_course_select on public.decks for select using (kind = 'course');
create policy decks_owner_select on public.decks for select using (auth.uid() = owner_id);
create policy decks_teacher_select on public.decks for select using (auth.uid() = teacher_id);
create policy decks_teacher_write on public.decks for all using (auth.uid() = teacher_id and kind = 'teacher') with check (auth.uid() = teacher_id and kind = 'teacher');
insert into public.decks(kind, name, language_app_key) values ('course','Francês geral','frances');

create or replace function public.teacher_link_is_active(p_teacher uuid, p_student uuid, p_lang text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from teacher_students where teacher_id = p_teacher and student_id = p_student
                 and language_app_key = p_lang and status = 'active'); $$;

revoke execute on function public.teacher_link_is_active(uuid, uuid, text) from public, anon, authenticated;
create schema if not exists storage;
create table storage.objects (id bigint generated always as identity primary key, bucket_id text, name text);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
alter table storage.objects enable row level security;
create policy support_materials_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'support-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy support_materials_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'support-materials');

create or replace function public.profiles_protect_plan_role() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (new.plan_tier is distinct from old.plan_tier or new.role is distinct from old.role)
     and current_user in ('anon','authenticated','authenticator')
     and coalesce(auth.jwt()->>'email','') <> 'brunemed1310@gmail.com' then
    raise exception 'plan_role_protected' using errcode = '42501';
  end if; return new; end $$;
create trigger trg_profiles_protect_plan_role before update on public.profiles for each row execute function public.profiles_protect_plan_role();
alter table public.profiles enable row level security;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_owner_update on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Supabase dá DML a anon/authenticated (065); a RLS decide.
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant usage, select on all sequences in schema public, storage to anon, authenticated;
