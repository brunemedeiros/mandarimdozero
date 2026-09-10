-- Sistema de report de bugs/sugestões (bandeira ⚑) -- auditoria completa
-- na conversa que motivou esta migration. Mesmo padrão de `challenges`
-- (ver fr/scripts/supabase_migrations/001_create_challenges_table.sql):
-- enum de status com check constraint, RLS por e-mail de admin, trigger de
-- updated_at -- deliberadamente NÃO uma arquitetura nova.
--
-- user_id é NULLABLE de propósito: decisão de produto confirmada -- convi-
-- dados (CURRENT_USER === false, sem conta) também podem reportar. Sem
-- isso, quem encontra um bug ANTES de criar conta (o momento em que a
-- primeira impressão do produto está sendo formada) simplesmente não
-- consegue avisar.
--
-- kind ('problema'/'sugestao') é derivado da category no cliente
-- (shared/reports.js) e gravado já resolvido -- evita perguntar a mesma
-- coisa duas vezes pro usuário, e dá um filtro pronto pro admin sem
-- precisar reclassificar toda vez.
--
-- context (jsonb) guarda tudo que foi capturado automaticamente (url,
-- idioma, nível, módulo, unidade, lição, formato/posição do exercício,
-- trecho da pergunta, viewport) -- ver o comentário de captureReportContext()
-- em shared/reports.js pro porquê de não existir um id estável de
-- exercício pra referenciar em vez disso (buildExerciseSet() embaralha em
-- tempo real, sem persistir id).
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  guest_id text,
  language_app_key text not null,
  category text not null check (category in (
    'bug_tecnico', 'erro_conteudo', 'traducao', 'audio', 'visual',
    'comportamento_inesperado', 'sugestao_melhoria', 'outro'
  )),
  kind text not null check (kind in ('problema', 'sugestao')),
  description text not null check (char_length(trim(description)) > 0),
  expected_behavior text,
  -- Gravidade PERCEBIDA pelo usuário -- nunca a prioridade técnica final
  -- (essa só a admin define, ver `priority` abaixo). Rótulos literais da
  -- auditoria: "Impede continuar" / "Dificulta a atividade" / "Problema
  -- pequeno" / "Apenas sugestão".
  severity_reported text check (severity_reported in ('impede', 'dificulta', 'pequeno', 'sugestao')),
  priority text check (priority in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'novo' check (status in (
    'novo', 'em_analise', 'confirmado', 'em_desenvolvimento',
    'resolvido', 'nao_reproduzido', 'recusado', 'duplicado'
  )),
  internal_note text,
  screenshot_url text,
  context jsonb not null default '{}'::jsonb,
  browser text,
  os text,
  device_type text,
  app_version text,
  dedup_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_created_at_idx on public.reports (created_at desc);

alter table public.reports enable row level security;

-- Qualquer pessoa (logada ou convidada) pode criar um report -- é
-- literalmente o propósito da tabela. Sem "with check" adicional além do
-- schema: um convidado não tem auth.uid() pra validar contra user_id, e
-- forçar user_id = auth.uid() aqui bloquearia a linha inteira de
-- convidados escreverem.
drop policy if exists "reports_public_insert" on public.reports;
create policy "reports_public_insert"
  on public.reports
  for insert
  to anon, authenticated
  with check (true);

-- Quem está logada só vê os PRÓPRIOS reports (não os de outras contas) --
-- útil pra um futuro "meus reports" no Perfil, sem expor nada de outro
-- aluno. Convidados não conseguem reler o que enviaram (sem sessão pra
-- identificar "qual é a própria"), mas já viram a confirmação na hora.
drop policy if exists "reports_owner_read" on public.reports;
create policy "reports_owner_read"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Só a admin (mesmo e-mail já usado em challenges/notification_rules/etc.)
-- lê TUDO -- inclusive reports de convidados e de outras contas -- e
-- muda status/prioridade/nota interna.
drop policy if exists "reports_admin_read_all" on public.reports;
create policy "reports_admin_read_all"
  on public.reports
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update"
  on public.reports
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

create or replace function public.reports_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reports_set_updated_at on public.reports;
create trigger trg_reports_set_updated_at
  before update on public.reports
  for each row
  execute function public.reports_set_updated_at();
