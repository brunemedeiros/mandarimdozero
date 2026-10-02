-- 064 -- Versiona a tabela `progress` (e o que ela precisa), criada à mão no Dashboard da produção.
--
-- Por quê: nenhuma migration 001..063 cria `progress`, mas o app (shared/auth.js, language-pref.js,
-- profile.js, notification-cron) e as funções 029/037/058/059 dependem dela. Sem isto a cadeia de
-- migrations não recria o banco do zero (staging, dev, recuperação).
--
-- Contrato (extraído da PRODUÇÃO em 2026-10-02, somente leitura; o código só faz
-- select data / upsert {user_id,data} onConflict user_id / select user_id,data via service role):
--   progress(user_id uuid PK -> auth.users(id) ON DELETE CASCADE,
--            data jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now())
--   RLS ligado; 3 policies (TO public, como na produção): SELECT / INSERT / UPDATE só da própria
--   linha (auth.uid() = user_id); sem policy de DELETE (a linha só some por cascata da conta);
--   trigger progress_set_updated_at BEFORE UPDATE -> public.set_updated_at().
--   Privilégios de tabela: os defaults do Supabase (anon/authenticated/service_role) -- não repetidos aqui.
--
-- Idempotente e NÃO destrutiva: onde o objeto já existe (produção), cada passo é um no-op estrito
-- (nada é dropado, recriado ou substituído; policies/função/trigger só são criados se NÃO existirem
-- pelo nome). Tabela pré-existente parcial recebe apenas ajustes ADITIVOS (colunas faltantes,
-- RLS, policies, trigger); tipos, NOT NULL e FK de colunas existentes NÃO são alterados
-- (poderiam falhar com dados reais).

create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tabela já existente com colunas faltando: só adiciona (default preenche as linhas atuais).
alter table public.progress add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.progress add column if not exists updated_at timestamptz not null default now();

alter table public.progress enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress'
                 and policyname = 'Usuário lê o próprio progresso') then
    create policy "Usuário lê o próprio progresso" on public.progress
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress'
                 and policyname = 'Usuário insere o próprio progresso') then
    create policy "Usuário insere o próprio progresso" on public.progress
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress'
                 and policyname = 'Usuário atualiza o próprio progresso') then
    create policy "Usuário atualiza o próprio progresso" on public.progress
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- Função genérica da produção (corpo idêntico); só criada se não existir.
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'set_updated_at' and p.pronargs = 0) then
    create function public.set_updated_at() returns trigger language plpgsql as $f$
begin
  new.updated_at = now();
  return new;
end;
$f$;
  end if;

  if not exists (select 1 from pg_trigger where tgrelid = 'public.progress'::regclass
                 and tgname = 'progress_set_updated_at' and not tgisinternal) then
    create trigger progress_set_updated_at before update on public.progress
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- rollback (apenas se criada por esta migration num banco novo; NUNCA na produção):
--   drop table public.progress;  drop function public.set_updated_at();
