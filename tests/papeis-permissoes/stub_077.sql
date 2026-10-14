-- Complemento do schema mínimo para a 077: o que a produção tem e o stub da 075/076 não tinha.
alter table public.teacher_students add column if not exists created_at timestamptz not null default now();
alter table public.teacher_students add constraint ts_status_chk check (status in ('active','invited','removed'));
alter table public.teacher_students add constraint ts_uniq unique (teacher_id, student_id, language_app_key);
alter table public.profiles add column if not exists display_name text, add column if not exists avatar_url text;
create table public.badge_catalog (id text primary key check (id ~ '^[a-z0-9_]{2,32}$'),
  name text not null check (char_length(name) <= 40), icon text not null check (char_length(icon) <= 8),
  description text check (char_length(description) <= 120), created_at timestamptz not null default now(), created_by text);
create table public.badge_grants (id bigint generated always as identity primary key, user_id uuid not null, badge_id text not null,
  granted_at timestamptz not null default now(), granted_by text, note text, unique (user_id, badge_id));
alter table public.badge_grants enable row level security;
create policy badge_grants_read on public.badge_grants for select using (true);
create table public.notifications (id bigint generated always as identity primary key, user_id uuid not null,
  language_app_key text not null, category text not null, event_type text not null, title text, body text not null,
  action_tab text, read_at timestamptz, created_at timestamptz not null default now());
alter table public.notifications enable row level security;
create policy notifications_owner_read on public.notifications for select to authenticated using (auth.uid() = user_id);
insert into public.badge_catalog (id, name, icon) values ('student', 'Aluno/a da Prof. Brune', '🎓');
insert into public.badge_grants (user_id, badge_id) values ('00000000-0000-0000-0000-00000000000b', 'student');
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
