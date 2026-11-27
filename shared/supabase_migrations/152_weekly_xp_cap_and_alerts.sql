-- 152: teto do XP da semana e aviso de XP fora do normal na Visão Geral (decisão da autora, 2026-11-27; opções A e D da
-- auditoria de segurança, docs/historico/36-auditoria-seguranca-2026-11.md).
--
-- Por quê: o XP é somado no navegador e gravado inteiro em weekly_xp (upsert de shared/auth.js:saveState). A RLS só garante
-- que cada conta grava a PRÓPRIA linha; o valor vem da conta, então quem mexe no navegador podia se dar 99.999 XP e ir para
-- o topo do Ranking. Números reais (produção, 2026-11-26): 89 semanas com XP, maior 2.019, 95% abaixo de 1.336, média 423.
--
-- A) Teto de 8.000 XP por semana em cada idioma (escolha da autora): o banco SEGURA o número em 8.000 em vez de recusar a
--    gravação, para nada quebrar no site da aluna (o salvamento do progresso continua normal; só o Ranking não passa de 8.000).
-- D) admin_xp_alerts(): contas com 3.000 XP ou mais numa semana das últimas 2 (uns 50% acima do recorde real) para a Visão
--    Geral do Painel de Admin; só a admin chama (is_admin), o resto recebe not_authorized.

create or replace function public._weekly_xp_cap()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.amount is not null and new.amount > 8000 then
    new.amount := 8000;
  end if;
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'weekly_xp_cap' and tgrelid = 'public.weekly_xp'::regclass) then
    create trigger weekly_xp_cap before insert or update of amount on public.weekly_xp
      for each row execute function public._weekly_xp_cap();
  end if;
end $$;

create or replace function public.admin_xp_alerts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_rows jsonb;
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', w.user_id, 'username', p.username, 'display_name', p.display_name,
           'language_app_key', w.language_app_key, 'week_start', w.week_start, 'amount', w.amount,
           'capped', w.amount >= 8000) order by w.amount desc, w.week_start desc), '[]'::jsonb)
    into v_rows
    from (select * from public.weekly_xp
           where amount >= 3000 and week_start >= current_date - 13
           order by amount desc limit 50) w
    left join public.profiles p on p.user_id = w.user_id;
  return jsonb_build_object('threshold', 3000, 'cap', 8000, 'rows', v_rows);
end $$;

revoke all on function public.admin_xp_alerts() from public, anon;
grant execute on function public.admin_xp_alerts() to authenticated;

-- Voltar atrás (SQL Editor): drop trigger weekly_xp_cap on public.weekly_xp; drop function public._weekly_xp_cap();
--                           drop function public.admin_xp_alerts();
