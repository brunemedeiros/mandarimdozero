-- 145: Central de Controle, aba "Visão Geral" do Painel de Admin (plano: docs/central-de-controle-plano.md, seção 5).
-- Só LEITURA: quatro funções novas (duas internas, fechadas), nenhuma tabela muda. Só a admin chama (public.is_admin()); o resto recebe not_authorized.
--
-- Regras (decisões da autora de 2026-11-24 + revisão do plano):
--   * dia contado no fuso America/Sao_Paulo (o Analytics antigo conta em UTC);
--   * "dia com estudo" = só estudo de verdade (_is_study_event); abrir o site, trocar de aba, começar lição e o
--     review_answer 'class_mode' (gravado quando a aluna abre o site DEPOIS da aula) não contam;
--   * só eventos de actor_type 'user'/'student'; admin e professora ficam fora de todas as contagens;
--   * engajamento = dias com estudo nos ÚLTIMOS 7 DIAS (hoje + 6), em 5 faixas, qualquer que seja o período escolhido;
--   * revisões em dois números que não se repetem: Em casa = usage_events review_answer (sem class_mode);
--     Na aula = review_bank_reviews via 'aula' e source 'modo_aula' (nunca 'casa', que repete o Em casa, nem 'importado').
-- A Situação (Em dia/Atenção/Parado/Sem estudo) NÃO é calculada aqui: a tela reaproveita a da aba Alunos.

create or replace function public._is_study_event(p_type text, p_name text)
returns boolean language sql immutable set search_path = public as $$
  select (p_type = 'lesson_complete' and p_name in ('vocab_lesson', 'unit_checkpoint', 'flashcard_review', 'speed_review',
            'match_game', 'challenge', 'dictation', 'conjugation_session', 'conj_game', 'hanzi_lesson', 'hanzi_review'))
      or (p_type = 'review_answer' and p_name in ('flashcard', 'speed_review', 'hanzi'));
$$;

-- Contas da categoria escolhida, já sem admin/professora. 'mine' = vínculo ativo com quem chama (a admin);
-- 'others' = sem vínculo ativo com quem chama; 'all' = as duas. Com idioma: a conta entra se tiver vínculo, evento ou
-- bloco de progresso nesse idioma (chave 'frances' ou 'frances@en'...).
create or replace function public._admin_overview_accounts(p_scope text, p_language text)
returns table (user_id uuid, created_at timestamptz, display_name text, username text, plan_tier text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.created_at, p.display_name, p.username, coalesce(p.plan_tier, 'free')
    from public.profiles p
   where not public._is_admin_uid(p.user_id)
     and not ('teacher' = any(public._account_role_keys(p.user_id)))
     and (p_scope = 'all'
          or (p_scope = 'mine') = exists (select 1 from public.teacher_students ts
                                           where ts.teacher_id = auth.uid() and ts.student_id = p.user_id and ts.status = 'active'
                                             and (p_language = 'all' or ts.language_app_key = p_language)))
     and (p_language = 'all'
          or exists (select 1 from public.teacher_students ts
                      where ts.student_id = p.user_id and ts.status = 'active' and ts.language_app_key = p_language)
          or exists (select 1 from public.usage_events e where e.user_id = p.user_id and e.language_app_key = p_language)
          or exists (select 1 from public.progress pr, jsonb_object_keys(pr.data) k
                      where pr.user_id = p.user_id and (k = p_language or k like p_language || '@%')));
$$;
revoke all on function public._admin_overview_accounts(text, text) from public, anon, authenticated;

create or replace function public.admin_overview_stats(p_days int default 30, p_scope text default 'mine', p_language text default 'all')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_from date;
  v_since timestamptz;
  v_week_from date := (now() at time zone 'America/Sao_Paulo')::date - 6;
  v_week_since timestamptz;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_days is null or p_days not in (7, 30, 90) then raise exception 'invalid_days' using errcode = '22023'; end if;
  if p_scope is null or p_scope not in ('mine', 'others', 'all') then raise exception 'invalid_scope' using errcode = '22023'; end if;
  if p_language is null or p_language not in ('all', 'frances', 'mandarim', 'portugues') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  v_from := v_today - (p_days - 1);
  v_since := v_from::timestamp at time zone 'America/Sao_Paulo';
  v_week_since := v_week_from::timestamp at time zone 'America/Sao_Paulo';

  with contas as (
    select * from public._admin_overview_accounts(p_scope, p_language)
  ), eventos as (
    select e.user_id, e.event_type, e.event_name, e.session_id,
           (e.created_at at time zone 'America/Sao_Paulo')::date as dia
      from public.usage_events e
      join contas c on c.user_id = e.user_id
     where e.created_at >= v_since
       and e.actor_type in ('user', 'student')
       and e.event_type not like 'technical%'
       and (p_language = 'all' or e.language_app_key = p_language)
  ), estudo as (
    select distinct user_id, dia from eventos where public._is_study_event(event_type, event_name)
  ), semana as (
    -- dias com estudo nos últimos 7 dias, para TODAS as contas da categoria (quem não estudou fica com 0)
    select c.user_id, c.display_name, c.username, c.created_at,
           (select count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)
              from public.usage_events e
             where e.user_id = c.user_id and e.created_at >= v_week_since
               and e.actor_type in ('user', 'student')
               and (p_language = 'all' or e.language_app_key = p_language)
               and public._is_study_event(e.event_type, e.event_name))::int as dias
      from contas c
  ), faixas as (
    select s.*, case when s.dias = 0 then 'nenhum' when s.dias = 1 then 'baixo' when s.dias <= 3 then 'medio'
                     when s.dias <= 5 then 'alto' else 'altissimo' end as faixa
      from semana s
  ), dias as (
    select d::date as dia from generate_series(v_from, v_today, interval '1 day') d
  )
  select jsonb_build_object(
    'today', to_char(v_today, 'YYYY-MM-DD'),
    'from', to_char(v_from, 'YYYY-MM-DD'),
    'week_from', to_char(v_week_from, 'YYYY-MM-DD'),
    'days', p_days, 'scope', p_scope, 'language', p_language,
    'totals', jsonb_build_object(
      'accounts', (select count(*) from contas),
      'active', (select count(distinct user_id) from estudo),
      'new_accounts', (select count(*) from contas where created_at >= v_since),
      'premium', (select count(*) from contas where plan_tier = 'premium'),
      'engagement_avg', (select round(avg(dias)::numeric, 1) from semana)),
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(d.dia, 'YYYY-MM-DD'),
        'sessions', (select count(distinct session_id) from eventos e where e.dia = d.dia and e.session_id is not null),
        'active', (select count(*) from estudo s where s.dia = d.dia),
        'new_accounts', (select count(*) from contas c where (c.created_at at time zone 'America/Sao_Paulo')::date = d.dia)
      ) order by d.dia), '[]'::jsonb) from dias d),
    'engagement', (select coalesce(jsonb_object_agg(b.faixa, b.contas), '{}'::jsonb) from (
        select k.faixa, coalesce((select jsonb_agg(jsonb_build_object(
                   'user_id', f.user_id, 'display_name', f.display_name, 'username', f.username, 'days', f.dias,
                   'new_account', f.created_at >= v_week_since) order by f.dias desc, f.display_name)
                 from faixas f where f.faixa = k.faixa), '[]'::jsonb) as contas
          from unnest(array['nenhum', 'baixo', 'medio', 'alto', 'altissimo']) as k(faixa)) b),
    'plans', jsonb_build_object(
      'free', (select count(*) from contas where plan_tier <> 'premium'),
      'premium', (select count(*) from contas where plan_tier = 'premium'))
  ) into v_result;
  return v_result;
end $$;

-- Revisões feitas por aluno com vínculo ativo com quem chama, no período: Em casa (eventos) e Na aula (Modo aula).
-- Na aula de turma, a revisão conta para cada membro (mesma regra de quem recebe os cartões, _rb_recipients).
create or replace function public.admin_overview_reviews(p_days int default 30, p_language text default 'all')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_since timestamptz;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_days is null or p_days not in (7, 30, 90) then raise exception 'invalid_days' using errcode = '22023'; end if;
  if p_language is null or p_language not in ('all', 'frances', 'mandarim', 'portugues') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  v_since := (v_today - (p_days - 1))::timestamp at time zone 'America/Sao_Paulo';

  with alunos as (
    select * from public._admin_overview_accounts('mine', p_language)
  ), casa as (
    select e.user_id, count(*)::int as n
      from public.usage_events e join alunos a on a.user_id = e.user_id
     where e.created_at >= v_since and e.event_type = 'review_answer' and e.event_name <> 'class_mode'
       and e.actor_type in ('user', 'student')
       and (p_language = 'all' or e.language_app_key = p_language)
     group by e.user_id
  ), aula_linhas as (
    select r.id, r.bank_student_id, r.student_id, s.classroom_id
      from public.review_bank_reviews r
      left join public.review_bank_students s on s.id = r.bank_student_id
     where r.created_at >= v_since and r.via = 'aula' and r.source = 'modo_aula' and r.teacher_id = auth.uid()
       and (p_language = 'all' or r.language_app_key = p_language)
  ), aula as (
    select x.student_id, count(*)::int as n from (
      select l.id, l.student_id from aula_linhas l where l.classroom_id is null
      union
      select l.id, rc.student_id from aula_linhas l
        cross join lateral public._rb_recipients(l.bank_student_id) rc
       where l.classroom_id is not null) x
     group by x.student_id
  )
  select jsonb_build_object(
    'days', p_days, 'language', p_language,
    'totals', jsonb_build_object(
      'home', coalesce((select sum(n) from casa), 0),
      'class', coalesce((select sum(a.n) from aula a join alunos al on al.user_id = a.student_id), 0)),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', al.user_id, 'display_name', al.display_name, 'username', al.username,
        'home', coalesce(c.n, 0), 'class', coalesce(a.n, 0))
        order by coalesce(c.n, 0) + coalesce(a.n, 0) desc, al.display_name)
      from alunos al left join casa c on c.user_id = al.user_id left join aula a on a.student_id = al.user_id), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

revoke all on function public.admin_overview_stats(int, text, text), public.admin_overview_reviews(int, text) from public, anon;
grant execute on function public.admin_overview_stats(int, text, text), public.admin_overview_reviews(int, text) to authenticated;
