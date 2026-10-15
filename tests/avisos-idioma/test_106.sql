-- Teste da 105: modelos de aviso do português em inglês, todos inativos. Roda depois de aplicar a 105 DUAS vezes. ROLLBACK.
begin;
create temp table r(ok boolean, name text) on commit drop;
create temp table p on commit drop as
  select * from notification_templates where language_app_key = 'portugues';

insert into r select (select count(*) from p) = 21, '21 linhas de portugues (duas aplicações não duplicam)';
insert into r select not exists (select 1 from p where active), 'todas inativas (nada sai antes da revisão)';
insert into r select not exists (select 1 from p where ui_language <> 'en'), 'todas ui_language = en (nenhuma pt-BR)';
insert into r select not exists (select 1 from p where created_by <> 'i18n-pt-en-rascunho'), 'marca created_by para ativar/reverter em bloco';
insert into r select (select count(*) from p where channel = 'in_app') = 17 and (select count(*) from p where channel = 'email') = 4,
  '17 do sino e 4 de e-mail';
insert into r select (select count(distinct body) from p) = 21, 'nenhum texto repetido';

-- cobertura por evento e canal
insert into r select (select count(*) from p where event_type = 'streak_at_risk' and channel = 'in_app') = 2, 'streak_at_risk: 2 variantes no sino';
insert into r select (select count(*) from p where event_type = 'study_goal_remaining' and channel = 'in_app') = 2, 'study_goal_remaining: 2 variantes no sino';
insert into r select (select count(*) from p where event_type like 'user\_inactive\_%' and channel = 'in_app' and event_type in
  ('user_inactive_1','user_inactive_3','user_inactive_5','user_inactive_7','user_inactive_9','user_inactive_15','user_inactive_20','user_inactive_30')) = 13,
  'reengajamento no sino: dias 1,3,5,7,9 (2 variantes) e 15,20,30 (1)';
insert into r select (select array_agg(event_type order by event_type) from p where channel = 'email') = array['user_inactive_15','user_inactive_20','user_inactive_30','user_inactive_9'],
  'e-mail só nos dias 9, 15, 20 e 30 (como no francês/mandarim)';

-- formato igual ao das linhas de francês: sino do reengajamento sem título; e-mail com título; streak/meta com título e ícone
insert into r select not exists (select 1 from p where event_type like 'user\_inactive\_%' and channel = 'in_app' and title is not null), 'reengajamento no sino sem título (igual ao francês)';
insert into r select not exists (select 1 from p where channel = 'email' and (title is null or btrim(title) = '')), 'e-mail com assunto';
insert into r select not exists (select 1 from p where event_type in ('streak_at_risk', 'study_goal_remaining') and (title is null or icon is null)), 'streak e meta com título e ícone';

-- variáveis: só as que o cron preenche
insert into r select not exists (select 1 from p where event_type = 'streak_at_risk' and body not like '%{{days}}%'), 'streak_at_risk usa {{days}}';
insert into r select not exists (select 1 from p where event_type = 'study_goal_remaining' and body not like '%{{lessonsRemaining}}%'), 'study_goal_remaining usa {{lessonsRemaining}}';
insert into r select not exists (select 1 from p where (coalesce(title, '') || body) ~ '\{\{' and (regexp_replace(coalesce(title, '') || body, '\{\{(days|lessonsRemaining)\}\}', '', 'g')) ~ '\{\{'),
  'nenhuma variável desconhecida';

-- regra do projeto: site em inglês sem nada em português; sem "--" nem " pra "
insert into r select not exists (select 1 from p where (coalesce(title, '') || ' ' || body) ~* '[ãõçáàâéêíóôú]'), 'nenhum caractere acentuado do português';
insert into r select not exists (select 1 from p where (coalesce(title, '') || ' ' || body) ~* '(^|[^a-z])(você|voce|seu|sua|dias|pra|para|não|nao|tá|aqui é|obrigad[oa])([^a-z]|$)'), 'nenhuma palavra do português';
insert into r select not exists (select 1 from p where (coalesce(title, '') || ' ' || body) like '%--%' or (coalesce(title, '') || ' ' || body) ~* ' pra '), 'sem "--" nem "pra"';

-- o que existe de outros idiomas não mudou e o cron ainda não acha modelo ativo de português
insert into r select (select count(*) from notification_templates where language_app_key <> 'portugues') =
                     (select count(*) from notification_templates where language_app_key in ('frances', 'mandarim')), 'só frances, mandarim e portugues na tabela';
insert into r select (select count(*) from notification_templates where language_app_key = 'portugues' and active) = 0, 'cron/cliente não acham modelo ativo de portugues';

select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
