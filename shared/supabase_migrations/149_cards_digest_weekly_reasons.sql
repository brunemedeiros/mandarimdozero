-- 149: página "Parar de receber" do e-mail de cartões novos (pedido da dona, 2026-11-26; prévia em docs/email/previas/sair-cartoes-previa.html).
-- Por quê: quem sai do e-mail diário ganha (1) um resumo por semana, sempre aos domingos de manhã (8h de Brasília, no mesmo
-- agendamento diário das 11h UTC), (2) o botão "Voltar a receber" e (3) a pergunta "qual é o motivo?", que alimenta melhorias no aviso.
-- Só a service role (a Edge Function `teacher-cards-digest`) escreve; RLS ligada, sem política e sem grant para anon/authenticated.
--   * `teacher_cards_digest_prefs`: 1 linha por conta que escolheu o resumo semanal (`frequency` = 'semanal'); sem linha = diário.
--   * `cards_digest_exit_reasons`: motivos de saída, SEM user_id e SEM e-mail (a tela promete "não fica no seu perfil de estudo");
--     `other_text` é o texto livre do "Outro motivo" (até 200 caracteres).
--   * `teacher_cards_digest_log.frequency`: 'diario' (padrão, tudo o que já existe) ou 'semanal'.
--   * `cards_digest_exit_summary()`: contagem por motivo e por ação para a professora/admin ver (só `is_teacher()`).
-- Aditiva, sem DROP. Desfazer (manual): drop da função, das 2 tabelas e da coluna `frequency` do log.

create table if not exists public.teacher_cards_digest_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency text not null default 'diario' check (frequency in ('diario', 'semanal')),
  updated_at timestamptz not null default now()
);
create table if not exists public.cards_digest_exit_reasons (
  id bigint generated always as identity primary key,
  reason text not null check (reason in ('muitos_emails', 'sem_tempo', 'cartoes_nao_servem', 'sem_interesse', 'prefiro_site', 'outro')),
  other_text text check (other_text is null or char_length(other_text) <= 200),
  action text not null check (action in ('sair', 'semanal')),
  lang text not null default 'pt' check (lang in ('pt', 'en')),
  created_at timestamptz not null default now()
);
alter table public.teacher_cards_digest_log add column if not exists frequency text not null default 'diario' check (frequency in ('diario', 'semanal'));

alter table public.teacher_cards_digest_prefs enable row level security;
alter table public.cards_digest_exit_reasons enable row level security;
revoke all on public.teacher_cards_digest_prefs from anon, authenticated;
revoke all on public.cards_digest_exit_reasons from anon, authenticated;

create or replace function public.cards_digest_exit_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'por_motivo', coalesce((select jsonb_agg(jsonb_build_object('reason', reason, 'action', action, 'total', n) order by n desc)
                              from (select reason, action, count(*) n from public.cards_digest_exit_reasons group by 1, 2) x), '[]'::jsonb),
    'outros', coalesce((select jsonb_agg(jsonb_build_object('texto', other_text, 'quando', created_at) order by created_at desc)
                          from (select other_text, created_at from public.cards_digest_exit_reasons
                                 where reason = 'outro' and other_text is not null and other_text <> '' order by created_at desc limit 50) y), '[]'::jsonb),
    'semanal_ativos', (select count(*) from public.teacher_cards_digest_prefs where frequency = 'semanal'));
end;
$$;
revoke execute on function public.cards_digest_exit_summary() from public, anon;
grant execute on function public.cards_digest_exit_summary() to authenticated;
