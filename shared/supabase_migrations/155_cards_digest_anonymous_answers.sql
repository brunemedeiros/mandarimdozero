-- 155: motivos de saída do e-mail de cartões ANÔNIMOS DE VERDADE e resumo semanal junto das outras preferências (P-025 e P-026 da revisão diária).
-- P-026: a 149 guardava `created_at` com hora e `id` sequencial; como `teacher_cards_digest_prefs.updated_at` e `notification_preferences.updated_at`
-- recebiam a hora do mesmo clique, dava para cruzar a hora (e a ordem dos ids) com a conta. Agora a resposta guarda só a SEMANA (segunda-feira,
-- horário de Brasília) e um id aleatório; nada que se cruze com a conta. O texto livre do "Outro motivo" continua sendo o que a pessoa escreveu.
-- P-025: quem escolhe o resumo semanal passa a ter a escolha em `notification_preferences.channels.cartoes_professora_semanal` (['email'] = ligado),
-- ao lado do aviso do dia (`cartoes_professora`): Configurações mostra a escolha certa e qualquer "desligar e-mails" desliga os dois.
-- `teacher_cards_digest_prefs` (149) deixa de ser usada. Aditiva, sem apagar nada: as tabelas antigas ficam vazias e sem uso
-- (apagar depois pelo SQL Editor). Desfazer: voltar a função para a versão da 149.

create table if not exists public.cards_digest_exit_answers (
  id uuid primary key default gen_random_uuid(),
  week_of date not null default ((date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date),
  reason text not null check (reason in ('muitos_emails', 'sem_tempo', 'cartoes_nao_servem', 'sem_interesse', 'prefiro_site', 'outro')),
  other_text text check (other_text is null or char_length(other_text) <= 200),
  action text not null check (action in ('sair', 'semanal')),
  lang text not null default 'pt' check (lang in ('pt', 'en'))
);
alter table public.cards_digest_exit_answers enable row level security;
revoke all on public.cards_digest_exit_answers from anon, authenticated;

-- Respostas já gravadas na tabela antiga (nenhuma na produção em 2026-11-27): passam só com a semana e id novo.
insert into public.cards_digest_exit_answers (week_of, reason, other_text, action, lang)
select (date_trunc('week', created_at at time zone 'America/Sao_Paulo'))::date, reason, other_text, action, lang
  from public.cards_digest_exit_reasons order by random();

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
                              from (select reason, action, count(*) n from public.cards_digest_exit_answers group by 1, 2) x), '[]'::jsonb),
    'outros', coalesce((select jsonb_agg(jsonb_build_object('texto', other_text, 'quando', week_of) order by week_of desc, md5(other_text))
                          from (select other_text, week_of from public.cards_digest_exit_answers
                                 where reason = 'outro' and other_text is not null and other_text <> '' order by week_of desc limit 50) y), '[]'::jsonb),
    'semanal_ativos', (select count(*) from public.notification_preferences where channels -> 'cartoes_professora_semanal' ? 'email'));
end;
$$;
revoke execute on function public.cards_digest_exit_summary() from public, anon;
grant execute on function public.cards_digest_exit_summary() to authenticated;
