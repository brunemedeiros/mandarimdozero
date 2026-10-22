-- 116 -- Etapa 5 ("Voz da Prof. Brune"): o site passa a obedecer à tabela Admin > Planos.
-- Decisões da dona em 2026-10-22: docs/i18n/etapa5-auditoria-premium.md, seções 7 e 8.
--
-- Fonte única das permissões efetivas da conta: my_permissions() (075), que já soma os papéis ativos
-- (account_roles com validade + 'student' derivado do vínculo ativo em teacher_students) e devolve, por
-- permissão, o valor mais permissivo. Esta migration NÃO cria função paralela; ela:
--   1) acrescenta 'free' na resposta de my_permissions(): as permissões só do plano Grátis (linha 'user'),
--      para a admin com o Admin Mode desligado ver o site como uma conta grátis (só a interface muda);
--   2) cria a permissão 'conj_games' (Jogos da Conjugação), com os mesmos valores de 'challenges_premium'
--      (Grátis desligado; Aluno, Premium Basic, Premium Pro e Professora ligados);
--   3) DADO: liga 'trail_skip_locked' (pular unidades) para Premium Basic e Premium Pro (Aluno já estava ligado);
--   4) DADO: rótulos do catálogo (label_pt, reserva da tela) alinhados ao que cada linha faz de verdade;
--   5) troca, nas 5 RPCs de Deck público, a checagem `plan_tier = 'premium'` pela permissão efetiva
--      'public_deck_import' (passa a valer para o Aluno e para quem a tabela liberar). Só essa linha muda
--      em cada função; o resto do corpo é o que está no banco (reescrito por replace, com conferência).
--
-- Aditiva: nenhum DROP, nenhum DELETE. Idempotente (rodar de novo não muda nada).
-- Desfazer: docs/i18n/etapa5-auditoria-premium.md, seção 8 (rollback).

-- ---------- 2) Permissão nova: Jogos da Conjugação ----------
insert into public.permission_catalog (key, kind, label_pt, sort)
values ('conj_games', 'bool', 'Jogos da Conjugação', 65)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, enabled, limit_value)
select v.role, 'conj_games', v.enabled, null from (values
  ('user', false), ('student', true), ('premium_basic', true), ('premium_pro', true), ('teacher', true)
) as v(role, enabled)
on conflict (role, permission_key) do nothing;

-- ---------- 3) Pular unidades: Premium e Aluno (decisão 2 da dona) ----------
update public.role_permissions
   set enabled = true, updated_at = now()
 where permission_key = 'trail_skip_locked' and role in ('premium_basic', 'premium_pro') and not enabled;

-- ---------- 4) Rótulos de reserva (a tela usa o catálogo de textos perm.*; isto é só a reserva) ----------
update public.permission_catalog set label_pt = 'Todos os tipos de cartão (com reverso, múltipla escolha, digite a resposta, completar a frase)'
 where key = 'rich_card_formats' and label_pt is distinct from 'Todos os tipos de cartão (com reverso, múltipla escolha, digite a resposta, completar a frase)';
update public.permission_catalog set label_pt = 'Áudio por texto e gravação no microfone (áudios por texto por mês)'
 where key = 'tts_monthly_quota' and label_pt is distinct from 'Áudio por texto e gravação no microfone (áudios por texto por mês)';
update public.permission_catalog set label_pt = 'Pular unidades (Ponto de verificação)'
 where key = 'trail_skip_locked' and label_pt is distinct from 'Pular unidades (Ponto de verificação)';
update public.permission_catalog set label_pt = 'Cartões próprios (quantidade, somando todos os cursos)'
 where key = 'own_cards_limit' and label_pt is distinct from 'Cartões próprios (quantidade, somando todos os cursos)';

-- ---------- 1) my_permissions(): + 'free' (linha Grátis) ----------
create or replace function public.my_permissions()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_perms jsonb; v_free jsonb;
begin
  if v_uid is null then return jsonb_build_object('roles', '[]'::jsonb, 'admin', false, 'permissions', '{}'::jsonb, 'free', '{}'::jsonb); end if;
  select coalesce(jsonb_object_agg(c.key, jsonb_build_object(
           'enabled', public._has_permission(v_uid, c.key),
           'limit', case when c.kind = 'limit' then to_jsonb(public._permission_limit(v_uid, c.key)) else 'null'::jsonb end)),
         '{}'::jsonb)
    into v_perms from public.permission_catalog c;
  -- Só a linha Grátis (sem soma de papéis): o que uma conta sem plano nenhum tem. NULL = sem limite; 0 = sem acesso.
  select coalesce(jsonb_object_agg(c.key, jsonb_build_object(
           'enabled', coalesce(rp.enabled, false),
           'limit', case when c.kind <> 'limit' then 'null'::jsonb
                         when not coalesce(rp.enabled, false) then to_jsonb(0)
                         else to_jsonb(rp.limit_value) end)),
         '{}'::jsonb)
    into v_free
    from public.permission_catalog c
    left join public.role_permissions rp on rp.permission_key = c.key and rp.role = 'user';
  return jsonb_build_object(
    'roles', to_jsonb(public._account_role_keys(v_uid)),
    'admin', public._is_admin_uid(v_uid),
    'permissions', v_perms,
    'free', v_free);
end $$;
revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.my_permissions() to authenticated;

-- ---------- 5) Deck público: plan_tier -> permissão efetiva 'public_deck_import' ----------
do $mig$
declare
  v_fn text; v_def text; v_new text;
  v_old_line constant text := 'select (plan_tier = ''premium'') into v_premium from public.profiles where user_id = v_uid;';
  v_new_line constant text := 'v_premium := public._has_permission(v_uid, ''public_deck_import'');';
begin
  foreach v_fn in array array['get_public_deck', 'get_public_deck_notes', 'get_public_deck_media_manifest',
                              'check_public_deck_duplicates', 'copy_public_deck'] loop
    select pg_get_functiondef(p.oid) into v_def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_fn;
    if v_def is null then raise exception '116: função % não existe', v_fn; end if;
    if position(v_new_line in v_def) > 0 then continue; end if;          -- já aplicada
    if (length(v_def) - length(replace(v_def, v_old_line, ''))) / length(v_old_line) <> 1 then
      raise exception '116: % não tem exatamente 1 checagem de plan_tier no formato esperado', v_fn;
    end if;
    v_new := replace(v_def, v_old_line, v_new_line);
    if position('plan_tier' in v_new) > 0 then raise exception '116: % ainda cita plan_tier', v_fn; end if;
    execute v_new;
  end loop;
end
$mig$;
