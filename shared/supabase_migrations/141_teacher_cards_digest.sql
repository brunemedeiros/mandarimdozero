-- 141: e-mail diário "cartões novos da professora" (proposta aprovada em 2026-11-23; docs/email-cartoes-professora-proposta.md).
-- Por quê: quem entra no site responde os cartões da professora, mas poucos voltam (0 de 14 ativaram notificações no celular e
-- não existia e-mail de aviso de cartões novos). A Edge Function `teacher-cards-digest` (11:00 UTC = 08h de Brasília) manda no
-- máximo 1 e-mail por dia por aluno: "cartões novos" ou, para quem está parado há 7 dias ou mais, um lembrete.
--
-- Esta migration só cria as tabelas de apoio e a função que o agendamento chamará. NADA é enviado por ela:
--   * `teacher_cards_digest_settings`: por professora, modo `desligado` (padrão) | `teste` (só `test_student_ids`) | `todos`;
--   * `teacher_cards_digest_log`: 1 linha por aluno por dia (índice único = trava de "no máximo 1 por dia") e histórico do que foi enviado.
-- Só a service role (a Edge Function) lê e grava: RLS ligada, sem política, sem grant para anon/authenticated.
-- A preferência do aluno usa a matriz já existente (`notification_preferences.channels.cartoes_professora`): sem nada salvo = ligado.
-- O agendamento (cron `teacher-cards-digest-diario`) NÃO é criado aqui: só depois do teste da dona. Valores no Vault: `cards_digest_url`
-- (endereço da função), `notif_cron_anon` e `notif_cron_token` (os mesmos da 140). Aditiva, sem DROP.
-- Desfazer (manual): drop da função e das 2 tabelas.

create table if not exists public.teacher_cards_digest_settings (
  teacher_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'desligado' check (mode in ('desligado', 'teste', 'todos')),
  test_student_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.teacher_cards_digest_log (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('novos', 'lembrete')),
  cards_count int not null default 0,
  sent_on date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'error')),
  error text,
  created_at timestamptz not null default now()
);
create unique index if not exists teacher_cards_digest_log_one_per_day on public.teacher_cards_digest_log (student_id, sent_on);
create index if not exists teacher_cards_digest_log_student_idx on public.teacher_cards_digest_log (student_id, kind, created_at desc);

alter table public.teacher_cards_digest_settings enable row level security;
alter table public.teacher_cards_digest_log enable row level security;
revoke all on public.teacher_cards_digest_settings from anon, authenticated;
revoke all on public.teacher_cards_digest_log from anon, authenticated;

create or replace function public._cards_digest_post()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url   text := public._rb_agent_secret('cards_digest_url');
  v_anon  text := public._rb_agent_secret('notif_cron_anon');
  v_token text := public._rb_agent_secret('notif_cron_token');
begin
  if coalesce(v_url, '') = '' or coalesce(v_anon, '') = '' or coalesce(v_token, '') = '' then
    raise exception 'cards_digest_nao_configurado: faltam segredos no Vault (cards_digest_url, notif_cron_anon, notif_cron_token)';
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon, 'x-cron-token', v_token),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
end;
$$;
revoke execute on function public._cards_digest_post() from public, anon, authenticated;
