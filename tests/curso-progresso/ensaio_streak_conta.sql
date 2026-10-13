-- E3 / C2: ENSAIO SOMENTE LEITURA da regra de sequência por conta (shared/account-progress.js) sobre as linhas reais de `progress`.
-- Não grava nada. Devolve só contagens (sem user_id, nome ou e-mail). Rodar no Staging e na produção com o MCP/SQL Editor.
-- Esperado: "conta_menor_que_bloco" = 0 (a regra nunca reduz uma sequência) e "perde_dia_do_log" = 0.
with linhas as (select user_id, data from public.progress),
entradas as (  -- blocos de idioma + formato antigo na raiz
  select user_id, key as bloco, value as b from linhas, jsonb_each(data) where key in ('frances', 'mandarim') and jsonb_typeof(value) = 'object'
  union all
  select user_id, 'raiz', data from linhas where jsonb_typeof(data -> 'activityLog') = 'object' or (data ? 'streak' and not (data ? 'frances' or data ? 'mandarim'))
),
dias as (
  select e.user_id, e.bloco, k.key::date as dia from entradas e, jsonb_object_keys(e.b -> 'activityLog') as k(key)
  where jsonb_typeof(e.b -> 'activityLog') = 'object' and k.key ~ '^\d{4}-\d{2}-\d{2}$'
),
uniao as (select distinct user_id, dia from dias),
ultimo as (select user_id, max((b ->> 'lastStudyDay')::date) as ult from entradas where b ->> 'lastStudyDay' ~ '^\d{4}-\d{2}-\d{2}$' group by 1),
cadeia as (
  select u.user_id, count(*) filter (where (ul.ult - u.dia) = u.pos) as seguidos from (
    select user_id, dia, row_number() over (partition by user_id order by dia desc) - 1 as pos from uniao) u
  join ultimo ul using (user_id) group by 1
),
vivo as (
  select e.user_id, max(coalesce((e.b ->> 'streak')::int, 0)) as vivo from entradas e join ultimo ul using (user_id)
  where (e.b ->> 'lastStudyDay')::date = ul.ult group by 1
),
conta as (
  select ul.user_id, ul.ult, greatest(coalesce(c.seguidos, 0), coalesce(v.vivo, 0)) as streak_conta
  from ultimo ul left join cadeia c using (user_id) left join vivo v using (user_id)
),
comp as (
  select e.user_id, e.bloco, coalesce((e.b ->> 'streak')::int, 0) as streak_bloco, c.streak_conta,
    (e.b ->> 'lastStudyDay')::date as ult_bloco, c.ult as ult_conta
  from entradas e join conta c using (user_id)
)
select
  (select count(*) from linhas) as linhas,
  (select count(distinct user_id) from entradas) as contas_com_progresso,
  (select count(*) from entradas where bloco = 'raiz') as entradas_formato_antigo_raiz,
  (select count(*) from comp) as blocos_comparados,
  (select count(*) from comp where streak_conta = streak_bloco) as conta_igual_ao_bloco,
  (select count(*) from comp where streak_conta > streak_bloco) as conta_maior_que_bloco,
  (select count(*) from comp where streak_conta < streak_bloco and ult_bloco = ult_conta) as conta_menor_que_bloco,
  (select count(*) from comp where streak_conta > streak_bloco and ult_bloco is distinct from ult_conta) as maior_porque_outro_idioma_estudou_depois,
  (select count(*) from (select user_id from entradas group by 1 having count(*) > 1) x) as contas_com_mais_de_uma_fonte,
  (select count(*) from (select e.user_id from entradas e join dias d using (user_id, bloco) left join uniao un on un.user_id = d.user_id and un.dia = d.dia where un.dia is null) x) as perde_dia_do_log;
